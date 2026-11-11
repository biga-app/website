import assert from "node:assert/strict";
import test from "node:test";

import { createFrameParser } from "@biga/viewer-core/transport/frame-parser";

import { checkpointFrame, connectedFrame, keepaliveFrame } from "../fixtures/frames.ts";
import { delimited } from "@biga/demo/wire";

const payloads = [connectedFrame.data, keepaliveFrame.data, checkpointFrame(1).data, new Uint8Array(300).fill(7)];

function stream(): Uint8Array {
    const parts = payloads.map(delimited);
    const joined = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        joined.set(part, offset);
        offset += part.length;
    }
    return joined;
}

function parseAll(chunks: Uint8Array[]): Uint8Array[] {
    const parser = createFrameParser();
    return chunks.flatMap((chunk) => parser.push(chunk));
}

test("a whole stream parses into its frames", () => {
    assert.deepEqual(parseAll([stream()]), payloads);
});

test("splitting the stream at every possible boundary gives the same frames", () => {
    const bytes = stream();
    for (let cut = 0; cut <= bytes.length; cut++) {
        assert.deepEqual(parseAll([bytes.slice(0, cut), bytes.slice(cut)]), payloads, `cut at ${cut}`);
    }
});

test("feeding one byte at a time gives the same frames", () => {
    assert.deepEqual(parseAll([...stream()].map((byte) => new Uint8Array([byte]))), payloads);
});

test("a frame is not released until all of it has arrived", () => {
    const parser = createFrameParser();
    const bytes = delimited(new Uint8Array(200).fill(1));
    assert.deepEqual(parser.push(bytes.slice(0, 1)), []);
    assert.deepEqual(parser.push(bytes.slice(1, bytes.length - 1)), []);
    assert.equal(parser.push(bytes.slice(bytes.length - 1)).length, 1);
});

test("an empty frame is a frame", () => {
    assert.deepEqual(parseAll([new Uint8Array([0])]), [new Uint8Array(0)]);
});

test("frames are copies, so later chunks cannot change them", () => {
    const chunk = delimited(new Uint8Array([1, 2, 3]));
    const [frame] = parseAll([chunk]);
    chunk.fill(9);
    assert.deepEqual(frame, new Uint8Array([1, 2, 3]));
});

test("a frame length that never ends is an error", () => {
    assert.throws(() => parseAll([new Uint8Array([0x80, 0x80, 0x80, 0x80, 0x80, 0x80])]), /malformed/);
});

test("a frame larger than the limit is an error before it is buffered", () => {
    assert.throws(() => parseAll([new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x0f])]), /too large/);
});
