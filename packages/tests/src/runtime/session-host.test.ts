import assert from "node:assert/strict";
import test from "node:test";

import type { Batch } from "@biga/types/pipeline";
import { ApiRequestError } from "@biga/types/api";
import { PROTOCOL_VERSION } from "@biga/types/worker";
import { createInThreadPort } from "@biga/viewer-core/runtime/session-host";
import { createSessionClient } from "@biga/viewer-core/runtime/session-client";

import { makeChange } from "../fixtures/checkpoints.ts";
import { createFakeClock } from "../fixtures/clock.ts";
import { createFakeServer } from "../fixtures/fake-server.ts";
import { checkpointFrame, connectedFrame, endedFrame } from "../fixtures/frames.ts";
import { makeState } from "../fixtures/session.ts";
import { settle } from "../fixtures/settle.ts";

function setup(state = makeState()) {
    const server = createFakeServer(state);
    const fake = createFakeClock();
    const batches: Batch[] = [];
    const acks: (() => void)[] = [];
    const unavailable: string[] = [];
    const port = createInThreadPort({
        baseUrl: "https://api.test",
        fetch: server.fetch,
        clock: fake.clock,
        random: () => 0.5,
        sleep: async () => {},
    });
    const client = createSessionClient({
        createPort: () => port,
        createFallbackPort: () => port,
        onBatch: (batch, done) => {
            batches.push(batch);
            acks.push(done);
        },
        onUnavailable: (kind) => unavailable.push(kind),
    });
    const ack = async () => {
        (acks.shift() as () => void)();
        fake.advance(50);
        await settle();
    };
    return { server, fake, batches, acks, unavailable, client, ack };
}

test("a session loads end to end: stream, state, hydration batch", async () => {
    const t = setup();
    t.client.start({ sessionId: "s1" });
    await settle();
    assert.equal(t.server.streamCalls(), 1);
    t.server.pushFrame(connectedFrame);
    await settle();
    assert.equal(t.batches.length, 1);
    const hydrate = t.batches[0]?.hydrate;
    assert.equal(hydrate?.reason, "initial");
    assert.deepEqual(hydrate?.table?.paths, ["a.ts"]);
    assert.equal(hydrate?.session.id, "s1");
});

test("live changes arrive only after the previous batch is acknowledged, merged into one", async () => {
    const t = setup();
    t.client.start({ sessionId: "s1" });
    await settle();
    t.server.pushFrame(connectedFrame);
    await settle();
    t.server.pushFrame(checkpointFrame(1, [makeChange("b.ts", "added")]));
    t.server.pushFrame(checkpointFrame(2, [makeChange("b.ts", "modified", "2")]));
    await settle();
    assert.equal(t.batches.length, 1);
    await t.ack();
    assert.equal(t.batches.length, 2);
    const live = t.batches[1] as Batch;
    assert.equal(live.status, "live");
    assert.deepEqual(live.summaries.map((summary) => summary.seq), [1, 2]);
    assert.equal(live.patches.length, 1);
    assert.equal(live.patches[0]?.op, "upsert");
    assert.equal(live.followTarget, "b.ts");
});

test("messages survive a structured clone, as they must across a real worker boundary", async () => {
    const t = setup();
    t.client.start({ sessionId: "s1" });
    await settle();
    t.server.pushFrame(connectedFrame);
    await settle();
    const copy = structuredClone(t.batches[0]);
    assert.deepEqual(copy?.hydrate?.table?.paths, ["a.ts"]);
    assert.ok(copy?.hydrate?.table?.parents instanceof Int32Array);
});

test("a missing session surfaces as unavailable with the error kind", async () => {
    const t = setup();
    t.server.failState(404);
    t.client.start({ sessionId: "s1" });
    await settle();
    t.server.pushFrame(connectedFrame);
    await settle();
    assert.deepEqual(t.unavailable, ["not_found"]);
});

test("session_ended produces a final batch with the ended status", async () => {
    const t = setup();
    t.client.start({ sessionId: "s1" });
    await settle();
    t.server.pushFrame(connectedFrame);
    await settle();
    t.server.pushFrame(endedFrame);
    await settle();
    await t.ack();
    assert.equal(t.batches[t.batches.length - 1]?.status, "ended");
});

test("reconnect opens a fresh stream", async () => {
    const t = setup();
    t.client.start({ sessionId: "s1" });
    await settle();
    t.server.pushFrame(connectedFrame);
    await settle();
    t.client.reconnect();
    await settle();
    assert.equal(t.server.streamCalls(), 2);
});

test("stop ends the session: later frames and requests do nothing", async () => {
    const t = setup();
    t.client.start({ sessionId: "s1" });
    await settle();
    t.server.pushFrame(connectedFrame);
    await settle();
    t.client.stop();
    t.server.pushFrame(checkpointFrame(1));
    await settle();
    t.client.reconnect();
    await settle();
    assert.equal(t.batches.length, 1);
    assert.equal(t.server.streamCalls(), 1);
});

test("starting again replaces the running session", async () => {
    const t = setup();
    t.client.start({ sessionId: "s1" });
    await settle();
    t.client.start({ sessionId: "s2" });
    await settle();
    assert.equal(t.server.streamCalls(), 2);
});

test("the protocol version constant is a positive integer", () => {
    assert.ok(Number.isInteger(PROTOCOL_VERSION) && PROTOCOL_VERSION > 0);
    assert.ok(new ApiRequestError("server", "x") instanceof Error);
});
