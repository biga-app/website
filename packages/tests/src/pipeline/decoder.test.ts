import assert from "node:assert/strict";
import test from "node:test";

import { createDecoder, decodeFrame } from "@biga/viewer-core/pipeline/decoder";

import { checkpointFrame, connectedFrame, endedFrame, invalidFrame, keepaliveFrame, snapshotFrame } from "../fixtures/frames.ts";
import { encodeStreamEvent } from "../fixtures/wire.ts";

test("a valid frame decodes to a typed event", () => {
    const result = decodeFrame(connectedFrame.data);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.event?.type, "connected");
});

test("every event kind keeps its payload", () => {
    const checkpoint = decodeFrame(checkpointFrame(4).data);
    assert.equal(checkpoint.ok && checkpoint.event?.type === "checkpoint" && checkpoint.event.payload.seq, 4);
    const snapshot = decodeFrame(snapshotFrame.data);
    assert.equal(snapshot.ok && snapshot.event?.type === "snapshot" && snapshot.event.payload.sequenceNum, 1);
    const ended = decodeFrame(endedFrame.data);
    assert.equal(ended.ok && ended.event?.type === "session_ended" && ended.event.sessionId, "s1");
});

test("a keepalive is a valid frame that carries no event", () => {
    assert.deepEqual(decodeFrame(keepaliveFrame.data), { ok: true, event: null });
});

test("garbage, empty frames and wrong values are rejected", () => {
    assert.equal(decodeFrame(invalidFrame.data).ok, false);
    assert.equal(decodeFrame(new Uint8Array(0)).ok, false);
    const noSession = encodeStreamEvent({ type: "connected", sessionId: "", timestamp: 1, replayed: false });
    assert.equal(decodeFrame(noSession).ok, false);
});

function decoderHarness() {
    const events: string[] = [];
    let resyncs = 0;
    const decoder = createDecoder({ onEvent: (event) => events.push(event.type), onResync: () => resyncs++ });
    return { decoder, events, resyncs: () => resyncs };
}

test("three invalid frames in a row request a resync", () => {
    const { decoder, resyncs } = decoderHarness();
    decoder.push(invalidFrame.data);
    decoder.push(invalidFrame.data);
    assert.equal(resyncs(), 0);
    decoder.push(invalidFrame.data);
    assert.equal(resyncs(), 1);
});

test("a valid frame resets the invalid streak", () => {
    const { decoder, events, resyncs } = decoderHarness();
    decoder.push(invalidFrame.data);
    decoder.push(invalidFrame.data);
    decoder.push(connectedFrame.data);
    decoder.push(invalidFrame.data);
    decoder.push(invalidFrame.data);
    assert.equal(resyncs(), 0);
    assert.deepEqual(events, ["connected"]);
});

test("keepalives reset the streak but never reach the pipeline", () => {
    const { decoder, events, resyncs } = decoderHarness();
    decoder.push(invalidFrame.data);
    decoder.push(invalidFrame.data);
    decoder.push(keepaliveFrame.data);
    decoder.push(invalidFrame.data);
    assert.equal(resyncs(), 0);
    assert.deepEqual(events, []);
});

test("the streak restarts after a resync is requested", () => {
    const { decoder, resyncs } = decoderHarness();
    for (let index = 0; index < 6; index++) decoder.push(invalidFrame.data);
    assert.equal(resyncs(), 2);
    decoder.push(endedFrame.data);
    assert.equal(resyncs(), 2);
});
