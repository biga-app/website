import assert from "node:assert/strict";
import test from "node:test";

import type { Checkpoint } from "@biga/types/checkpoint";
import type { SupervisorOptions } from "@biga/types/pipeline";
import type { SessionState } from "@biga/types/state";
import type { TransportEvent } from "@biga/types/stream";
import { ApiRequestError } from "@biga/types/api";
import { backoffMs, createSupervisor, HEALTHY_MS, MAX_ATTEMPTS, WATCHDOG_MS } from "@biga/viewer-core/pipeline/supervisor";
import { buildTreeTable } from "@biga/viewer-core/pipeline/tree-table";

import { makeCheckpoint } from "../fixtures/checkpoints.ts";
import { createFakeClock } from "../fixtures/clock.ts";
import { checkpointFrame, connectedFrame, endedFrame, invalidFrame, keepaliveFrame, snapshotFrame } from "../fixtures/frames.ts";
import { makeState } from "../fixtures/session.ts";

type Conn = { signal: AbortSignal; emit: (event: TransportEvent) => void };
type StateRequest = { resolve: (state: SessionState) => void; reject: (error: unknown) => void; signal: AbortSignal };

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function setup(overrides: Partial<SupervisorOptions> = {}) {
    const fake = createFakeClock();
    const calls: [string, unknown][] = [];
    const conns: Conn[] = [];
    const stateRequests: StateRequest[] = [];
    const checkpointCalls: number[] = [];
    const unavailable: string[] = [];
    let stateCalls = 0;
    let failCheckpoints = false;

    const supervisor = createSupervisor({
        sessionId: "s1",
        transport: {
            connect: (_id, signal, emit) => {
                conns.push({ signal, emit });
                return new Promise<void>(() => {});
            },
        },
        api: {
            getState: (_id, { signal }) =>
                new Promise<SessionState>((resolve, reject) => {
                    stateCalls++;
                    stateRequests.push({ resolve, reject, signal });
                }),
            getCheckpoint: async (_id, seq) => {
                checkpointCalls.push(seq);
                if (failCheckpoints) throw new Error("fail");
                return makeCheckpoint(seq);
            },
        },
        sink: {
            hydrate: (hydration) => calls.push(["hydrate", hydration]),
            snapshot: (table) => calls.push(["snapshot", table]),
            checkpoint: (checkpoint) => calls.push(["checkpoint", checkpoint.seq]),
            status: (status) => calls.push(["status", status]),
        },
        buildTable: buildTreeTable,
        clock: fake.clock,
        random: () => 0.5,
        onUnavailable: (kind) => unavailable.push(kind),
        ...overrides,
    });

    const conn = () => conns[conns.length - 1] as Conn;
    const respond = async (state: SessionState) => {
        (stateRequests.shift() as StateRequest).resolve(state);
        await flush();
    };
    const reject = async (error: unknown) => {
        (stateRequests.shift() as StateRequest).reject(error);
        await flush();
    };
    const open = async () => {
        conn().emit({ type: "open" });
        conn().emit(connectedFrame);
        await flush();
    };
    const goLive = async (state: SessionState = makeState()) => {
        supervisor.start();
        await open();
        await respond(state);
    };
    const names = () => calls.map(([name, value]) => (name === "hydrate" ? `hydrate:${(value as { reason: string }).reason}` : `${name}:${typeof value === "object" ? "" : value}`));
    const statuses = () => calls.filter(([name]) => name === "status").map(([, value]) => value);

    return {
        supervisor, calls, conns, conn, advance: fake.advance, respond, reject, open, goLive, names, statuses,
        checkpointCalls, unavailable, stateRequests, stateCalls: () => stateCalls, failCheckpoints: () => (failCheckpoints = true),
        timerCount: fake.timerCount,
    };
}

test("a first connection loads state, hydrates, goes live and then streams checkpoints", async () => {
    const t = setup();
    await t.goLive();
    assert.deepEqual(t.names(), ["hydrate:initial", "status:live"]);
    t.conn().emit(checkpointFrame(1));
    assert.deepEqual(t.names().slice(-1), ["checkpoint:1"]);
});

test("frames that arrive during the state fetch are buffered, stale ones dropped, the rest replayed in order", async () => {
    const t = setup();
    t.supervisor.start();
    await t.open();
    t.conn().emit(checkpointFrame(1));
    t.conn().emit(checkpointFrame(2));
    t.conn().emit(checkpointFrame(3));
    await t.respond(makeState({ seqs: [0, 1] }));
    assert.deepEqual(t.names(), ["hydrate:initial", "checkpoint:2", "checkpoint:3", "status:live"]);
});

test("a gap in the sequence refetches state and then applies the held event", async () => {
    const t = setup();
    await t.goLive();
    t.conn().emit(checkpointFrame(3));
    assert.equal(t.stateCalls(), 2);
    await t.respond(makeState({ seqs: [0, 1, 2] }));
    assert.deepEqual(t.names().slice(-2), ["hydrate:resync", "checkpoint:3"]);
});

test("resync requests that arrive while a sync runs collapse into exactly one more fetch", async () => {
    const t = setup();
    await t.goLive();
    t.conn().emit(checkpointFrame(5));
    assert.equal(t.stateCalls(), 2);
        for (let index = 0; index < 6; index++) t.conn().emit(invalidFrame);
    assert.equal(t.stateCalls(), 2);
    await t.respond(makeState({ seqs: [0, 1, 2, 3, 4] }));
    assert.equal(t.stateCalls(), 3);
    await t.respond(makeState({ seqs: [0, 1, 2, 3, 4] }));
    assert.equal(t.stateCalls(), 3);
});

test("a dropped stream shows reconnecting and retries with exponential backoff", async () => {
    const t = setup();
    await t.goLive();
    t.conn().emit({ type: "closed", reason: "network" });
    assert.equal(t.supervisor.status, "reconnecting");
    t.advance(backoffMs(1, 0.5) - 1);
    assert.equal(t.conns.length, 1);
    t.advance(1);
    assert.equal(t.conns.length, 2);
    t.conn().emit({ type: "closed", reason: "network" });
    t.advance(backoffMs(2, 0.5) - 1);
    assert.equal(t.conns.length, 2);
    t.advance(1);
    assert.equal(t.conns.length, 3);
});

test("backoff is capped and jittered within bounds", () => {
    assert.equal(backoffMs(1, 0.5), 1000);
    assert.equal(backoffMs(3, 0.5), 4000);
    assert.equal(backoffMs(20, 0.5), 30000);
    assert.equal(backoffMs(1, 0), 750);
    assert.equal(backoffMs(1, 1), 1250);
});

test("Retry-After from the server overrides the backoff", async () => {
    const t = setup();
    await t.goLive();
    t.conn().emit({ type: "closed", reason: "http", status: 429, retryAfterMs: 7000 });
    t.advance(6999);
    assert.equal(t.conns.length, 1);
    t.advance(1);
    assert.equal(t.conns.length, 2);
});

test("a stream that stayed healthy for 30 seconds resets the backoff", async () => {
    const t = setup();
    await t.goLive();
    t.conn().emit({ type: "closed", reason: "network" });
    t.advance(backoffMs(1, 0.5));
    t.conn().emit({ type: "closed", reason: "network" });
    t.advance(backoffMs(2, 0.5));
    await t.open();
    await t.respond(makeState());
    t.advance(HEALTHY_MS);
    t.conn().emit({ type: "closed", reason: "network" });
    t.advance(backoffMs(1, 0.5) - 1);
    assert.equal(t.conns.length, 3);
    t.advance(1);
    assert.equal(t.conns.length, 4);
});

test("running out of attempts goes offline until a manual reconnect", async () => {
    const t = setup();
    await t.goLive();
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        t.conn().emit({ type: "closed", reason: "network" });
        t.advance(60_000);
    }
    assert.equal(t.supervisor.status, "reconnecting");
    t.conn().emit({ type: "closed", reason: "network" });
    assert.equal(t.supervisor.status, "offline");
    const before = t.conns.length;
    t.advance(120_000);
    assert.equal(t.conns.length, before);
    t.supervisor.reconnect();
    assert.equal(t.conns.length, before + 1);
    assert.equal(t.supervisor.status, "reconnecting");
});

test("silence for 45 seconds drops the connection and heartbeats keep it alive", async () => {
    const t = setup();
    await t.goLive();
    const first = t.conn();
    t.advance(WATCHDOG_MS - 1);
    first.emit(keepaliveFrame);
    t.advance(WATCHDOG_MS - 1);
    assert.equal(t.supervisor.status, "live");
    t.advance(1);
    assert.equal(t.supervisor.status, "reconnecting");
    assert.equal(first.signal.aborted, true);
    t.advance(backoffMs(1, 0.5));
    assert.equal(t.conns.length, 2);
});

test("a session_ended frame ends the session and stops reconnecting", async () => {
    const t = setup();
    await t.goLive();
    const live = t.conn();
    live.emit(endedFrame);
    assert.equal(t.supervisor.status, "ended");
    assert.equal(live.signal.aborted, true);
    live.emit(checkpointFrame(1));
    t.advance(300_000);
    assert.equal(t.conns.length, 1);
    assert.equal(t.names().includes("checkpoint:1"), false);
});

test("state that reports an ended session shows the final files and never goes live", async () => {
    const t = setup();
    t.supervisor.start();
    await t.open();
    await t.respond(makeState({ status: "ended" }));
    assert.deepEqual(t.names(), ["hydrate:initial", "status:ended"]);
    t.advance(300_000);
    assert.equal(t.conns.length, 1);
});

test("a failed first load is unavailable with the error kind, and retry starts over", async () => {
    const t = setup();
    t.supervisor.start();
    await t.open();
    await t.reject(new ApiRequestError("not_found", "gone", 404));
    assert.equal(t.supervisor.status, "unavailable");
    assert.deepEqual(t.unavailable, ["not_found"]);
    t.advance(300_000);
    assert.equal(t.conns.length, 1);
    t.supervisor.retry();
    assert.equal(t.supervisor.status, "connecting");
    assert.equal(t.conns.length, 2);
    await t.open();
    await t.respond(makeState());
    assert.equal(t.supervisor.status, "live");
});

test("a stream that fails before connecting still loads the files and keeps retrying", async () => {
    const t = setup();
    t.supervisor.start();
    t.conn().emit({ type: "closed", reason: "http", status: 503, retryAfterMs: null });
    assert.equal(t.stateCalls(), 1);
    await t.respond(makeState());
    assert.deepEqual(t.names(), ["hydrate:initial", "status:reconnecting"]);
    t.advance(backoffMs(1, 0.5));
    assert.equal(t.conns.length, 2);
    await t.open();
    await t.respond(makeState());
    assert.equal(t.supervisor.status, "live");
    assert.equal(t.names().filter((name) => name.startsWith("hydrate")).join(), "hydrate:initial,hydrate:resync");
});

test("a 404 on the stream stops retrying: unavailable before load, offline after", async () => {
    const early = setup();
    early.supervisor.start();
    early.conn().emit({ type: "closed", reason: "http", status: 404, retryAfterMs: null });
    await early.reject(new ApiRequestError("not_found", "gone", 404));
    assert.equal(early.supervisor.status, "unavailable");
    early.advance(300_000);
    assert.equal(early.conns.length, 1);

    const late = setup();
    await late.goLive();
    late.conn().emit({ type: "closed", reason: "http", status: 404, retryAfterMs: null });
    assert.equal(late.supervisor.status, "offline");
    late.advance(300_000);
    assert.equal(late.conns.length, 1);
});

test("a state fetch that fails after loading is treated as a dropped connection", async () => {
    const t = setup();
    await t.goLive();
    t.conn().emit(checkpointFrame(4));
    await t.reject(new ApiRequestError("server", "boom", 500));
    assert.equal(t.supervisor.status, "reconnecting");
    t.advance(backoffMs(1, 0.5));
    assert.equal(t.conns.length, 2);
});

test("returning to a tab after more than 30 seconds resyncs once", async () => {
    const t = setup();
    await t.goLive();
    t.supervisor.setHidden(true);
    t.advance(10_000);
    t.supervisor.setHidden(false);
    assert.equal(t.stateCalls(), 1);
    t.supervisor.setHidden(true);
    t.advance(31_000);
    t.supervisor.setHidden(false);
    assert.equal(t.stateCalls(), 2);
    await t.respond(makeState());
    assert.equal(t.names().filter((name) => name === "hydrate:resync").length, 1);
});

test("coming back online cancels the backoff wait and reconnects now", async () => {
    const t = setup();
    await t.goLive();
    t.conn().emit({ type: "closed", reason: "network" });
    t.supervisor.notifyOnline();
    assert.equal(t.conns.length, 2);
    t.advance(60_000);
    assert.equal(t.conns.length, 2);
});

test("stop aborts the connection and ignores anything that arrives afterwards", async () => {
    const t = setup();
    await t.goLive();
    const live = t.conn();
    t.supervisor.stop();
    assert.equal(live.signal.aborted, true);
    live.emit(checkpointFrame(1));
    live.emit({ type: "closed", reason: "network" });
    t.advance(300_000);
    assert.equal(t.conns.length, 1);
    assert.equal(t.names().includes("checkpoint:1"), false);
});

test("three invalid frames in a row trigger a resync", async () => {
    const t = setup();
    await t.goLive();
        t.conn().emit(invalidFrame);
    t.conn().emit(invalidFrame);
    assert.equal(t.stateCalls(), 1);
    t.conn().emit(invalidFrame);
    assert.equal(t.stateCalls(), 2);
});

test("a requested checkpoint is loaded for the first hydration, with a fallback to the newest", async () => {
    const requested = setup({ initialCheckpointSeq: 4 });
    await requested.goLive(makeState({ seqs: [0, 1, 2, 3, 4, 5, 6] }));
    assert.deepEqual(requested.checkpointCalls, [4]);
    const hydration = requested.calls[0]?.[1] as { initial: Checkpoint | null };
    assert.equal(hydration.initial?.seq, 4);

    const fallback = setup({ initialCheckpointSeq: 4 });
    fallback.failCheckpoints();
    await fallback.goLive(makeState({ seqs: [0, 1, 2, 3, 4, 5, 6] }));
    assert.deepEqual(fallback.checkpointCalls, [4, 6]);
    assert.equal((fallback.calls[0]?.[1] as { initial: Checkpoint | null }).initial, null);

    const newest = setup();
    await newest.goLive(makeState({ seqs: [0, 1, 2] }));
    assert.deepEqual(newest.checkpointCalls, [2]);

    const none = setup();
    await none.goLive(makeState({ seqs: [0] }));
    assert.deepEqual(none.checkpointCalls, []);
});

test("a snapshot event becomes a rebuilt tree table in the sink", async () => {
    const t = setup();
    await t.goLive();
    t.conn().emit(snapshotFrame);
    assert.deepEqual(t.names().slice(-1), ["snapshot:"]);
});

test("a reconnect after a drop re-hydrates as a resync and goes live again", async () => {
    const t = setup();
    await t.goLive();
    t.conn().emit({ type: "closed", reason: "network" });
    t.advance(backoffMs(1, 0.5));
    await t.open();
    await t.respond(makeState({ seqs: [0, 1] }));
    assert.deepEqual(t.statuses(), ["live", "reconnecting", "live"]);
    assert.equal(t.names().filter((name) => name === "hydrate:resync").length, 1);
});
