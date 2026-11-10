import assert from "node:assert/strict";
import test from "node:test";

import type { Batch } from "@biga/types/pipeline";
import type { SessionPort, WorkerRequest, WorkerResponse } from "@biga/types/worker";
import { PROTOCOL_VERSION } from "@biga/types/worker";
import { createSessionClient } from "@biga/viewer-core/runtime/session-client";

function fakePort() {
    const sent: WorkerRequest[] = [];
    let listener: ((response: WorkerResponse) => void) | null = null;
    let terminated = false;
    const port: SessionPort = {
        send: (request) => void sent.push(structuredClone(request)),
        listen: (next) => void (listener = next),
        terminate: () => void (terminated = true),
    };
    return {
        port,
        sent,
        deliver: (response: WorkerResponse) => listener?.(structuredClone(response)),
        isTerminated: () => terminated,
    };
}

const batch = { id: 7 } as unknown as Batch;
const batchResponse = (version = PROTOCOL_VERSION): WorkerResponse => ({ type: "batch", version, batch });

function setup(portFactory: () => ReturnType<typeof fakePort> | null = () => fakePort()) {
    const primary: ReturnType<typeof fakePort>[] = [];
    const fallback: ReturnType<typeof fakePort>[] = [];
    const batches: Batch[] = [];
    const dones: (() => void)[] = [];
    const unavailable: string[] = [];
    const client = createSessionClient({
        createPort: () => {
            const made = portFactory();
            if (!made) return null;
            primary.push(made);
            return made.port;
        },
        createFallbackPort: () => {
            const made = fakePort();
            fallback.push(made);
            return made.port;
        },
        onBatch: (next, done) => {
            batches.push(next);
            dones.push(done);
        },
        onUnavailable: (kind) => unavailable.push(kind),
    });
    return { client, primary, fallback, batches, dones, unavailable };
}

test("start sends a versioned start request with the config", () => {
    const t = setup();
    t.client.start({ sessionId: "s1", initialCheckpointSeq: 3 });
    assert.deepEqual(t.primary[0]?.sent, [
        { type: "start", version: PROTOCOL_VERSION, config: { sessionId: "s1", initialCheckpointSeq: 3 } },
    ]);
});

test("a batch reaches the handler and its done callback sends the matching ack", () => {
    const t = setup();
    t.client.start({ sessionId: "s1" });
    t.primary[0]?.deliver(batchResponse());
    assert.equal(t.batches[0]?.id, 7);
    t.dones[0]?.();
    assert.deepEqual(t.primary[0]?.sent[1], { type: "ack", version: PROTOCOL_VERSION, id: 7 });
});

test("an unavailable response is forwarded with its kind", () => {
    const t = setup();
    t.client.start({ sessionId: "s1" });
    t.primary[0]?.deliver({ type: "unavailable", version: PROTOCOL_VERSION, kind: "not_found" });
    assert.deepEqual(t.unavailable, ["not_found"]);
});

test("control calls become versioned requests", () => {
    const t = setup();
    t.client.start({ sessionId: "s1" });
    t.client.reconnect();
    t.client.retry();
    t.client.setHidden(true);
    t.client.notifyOnline();
    assert.deepEqual(
        t.primary[0]?.sent.slice(1).map((request) => request.type),
        ["reconnect", "retry", "visibility", "online"]
    );
    assert.deepEqual(t.primary[0]?.sent[3], { type: "visibility", version: PROTOCOL_VERSION, hidden: true });
    assert.ok(t.primary[0]?.sent.every((request) => request.version === PROTOCOL_VERSION));
});

test("when no worker can be created the in-thread fallback is used", () => {
    const t = setup(() => null);
    t.client.start({ sessionId: "s1" });
    assert.equal(t.primary.length, 0);
    assert.equal(t.fallback[0]?.sent[0]?.type, "start");
});

test("a version mismatch recreates the worker once and restarts the session", () => {
    const t = setup();
    t.client.start({ sessionId: "s1" });
    t.primary[0]?.deliver(batchResponse(PROTOCOL_VERSION + 1));
    assert.equal(t.primary[0]?.isTerminated(), true);
    assert.equal(t.primary.length, 2);
    assert.equal(t.primary[1]?.sent[0]?.type, "start");
    assert.equal(t.batches.length, 0);
});

test("a second mismatch falls back to the in-thread port", () => {
    const t = setup();
    t.client.start({ sessionId: "s1" });
    t.primary[0]?.deliver(batchResponse(PROTOCOL_VERSION + 1));
    t.primary[1]?.deliver(batchResponse(PROTOCOL_VERSION + 1));
    assert.equal(t.fallback.length, 1);
    assert.equal(t.fallback[0]?.sent[0]?.type, "start");
    t.fallback[0]?.deliver(batchResponse());
    assert.equal(t.batches.length, 1);
});

test("responses from a replaced port are ignored", () => {
    const t = setup();
    t.client.start({ sessionId: "s1" });
    t.primary[0]?.deliver(batchResponse(PROTOCOL_VERSION + 1));
    t.primary[0]?.deliver(batchResponse());
    assert.equal(t.batches.length, 0);
});

test("stop sends stop, terminates the port and allows a clean start afterwards", () => {
    const t = setup();
    t.client.start({ sessionId: "s1" });
    t.client.stop();
    assert.equal(t.primary[0]?.sent[1]?.type, "stop");
    assert.equal(t.primary[0]?.isTerminated(), true);
    t.client.start({ sessionId: "s2" });
    assert.equal(t.primary.length, 2);
});
