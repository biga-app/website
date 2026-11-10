import assert from "node:assert/strict";
import test from "node:test";

import { createDecoder, decodeFrame } from "@biga/viewer-core/pipeline/decoder";

import { connectedFrame, endedFrame } from "../fixtures/frames.ts";

test("a valid frame decodes to a typed event", () => {
    const result = decodeFrame("connected", connectedFrame.data);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.event.type, "connected");
});

test("broken JSON, wrong shapes and mismatched names are rejected", () => {
    assert.equal(decodeFrame("connected", "{nope").ok, false);
    assert.equal(decodeFrame("connected", JSON.stringify({ type: "connected" })).ok, false);
    assert.equal(decodeFrame("connected", JSON.stringify({ type: "mystery" })).ok, false);
    assert.equal(decodeFrame("session_ended", connectedFrame.data).ok, false);
});

function decoderHarness() {
    const events: string[] = [];
    let resyncs = 0;
    const decoder = createDecoder({ onEvent: (event) => events.push(event.type), onResync: () => resyncs++ });
    return { decoder, events, resyncs: () => resyncs };
}

test("three invalid frames in a row request a resync", () => {
    const { decoder, resyncs } = decoderHarness();
    decoder.push("checkpoint", "bad");
    decoder.push("checkpoint", "bad");
    assert.equal(resyncs(), 0);
    decoder.push("checkpoint", "bad");
    assert.equal(resyncs(), 1);
});

test("a valid frame resets the invalid streak", () => {
    const { decoder, events, resyncs } = decoderHarness();
    decoder.push("checkpoint", "bad");
    decoder.push("checkpoint", "bad");
    decoder.push("connected", connectedFrame.data);
    decoder.push("checkpoint", "bad");
    decoder.push("checkpoint", "bad");
    assert.equal(resyncs(), 0);
    assert.deepEqual(events, ["connected"]);
});

test("the streak restarts after a resync is requested", () => {
    const { decoder, resyncs } = decoderHarness();
    for (let index = 0; index < 6; index++) decoder.push("session_ended", "bad");
    assert.equal(resyncs(), 2);
    decoder.push("session_ended", endedFrame.data);
    assert.equal(resyncs(), 2);
});
