import assert from "node:assert/strict";
import test from "node:test";

import type { SseItem } from "@biga/types/stream";
import { createSseParser } from "@biga/viewer-core/transport/sse-parser";

function parseAll(chunks: string[]): SseItem[] {
    const parser = createSseParser();
    return chunks.flatMap((chunk) => parser.push(chunk));
}

const stream =
    ": keepalive 1\n\n" +
    "event: connected\ndata: {\"type\":\"connected\"}\n\n" +
    "event: checkpoint\r\ndata: {\"seq\":1}\r\n\r\n" +
    "data: line one\ndata: line two\n\n" +
    "event: snapshot\rdata: cr only\r\r\n";

const expected: SseItem[] = [
    { type: "comment", text: "keepalive 1" },
    { type: "frame", name: "connected", data: '{"type":"connected"}' },
    { type: "frame", name: "checkpoint", data: '{"seq":1}' },
    { type: "frame", name: "message", data: "line one\nline two" },
    { type: "frame", name: "snapshot", data: "cr only" },
];

test("a whole stream parses into frames and comments", () => {
    assert.deepEqual(parseAll([stream]), expected);
});

test("splitting the stream at every possible boundary gives the same result", () => {
    for (let cut = 0; cut <= stream.length; cut++) {
        assert.deepEqual(parseAll([stream.slice(0, cut), stream.slice(cut)]), expected, `cut at ${cut}`);
    }
});

test("feeding one character at a time gives the same result", () => {
    assert.deepEqual(parseAll([...stream]), expected);
});

test("a CRLF split across two chunks is one line break", () => {
    assert.deepEqual(parseAll(["data: a\r", "\n\r", "\n"]), [{ type: "frame", name: "message", data: "a" }]);
});

test("an event without a terminating blank line is not dispatched", () => {
    assert.deepEqual(parseAll(["event: checkpoint\ndata: {}\n"]), []);
});

test("a blank line with no data does not produce a frame and resets the event name", () => {
    assert.deepEqual(parseAll(["event: ghost\n\ndata: x\n\n"]), [{ type: "frame", name: "message", data: "x" }]);
});

test("only one leading space after the colon is stripped", () => {
    assert.deepEqual(parseAll(["data:  two\n\ndata:none\n\n"]), [
        { type: "frame", name: "message", data: " two" },
        { type: "frame", name: "message", data: "none" },
    ]);
});

test("unknown fields such as id and retry are ignored", () => {
    assert.deepEqual(parseAll(["id: 4\nretry: 100\nevent: e\ndata: d\n\n"]), [{ type: "frame", name: "e", data: "d" }]);
});

test("multibyte text decoded in separate chunks arrives intact", () => {
    assert.deepEqual(parseAll(["data: héllo ", "wörld ✓\n\n"]), [{ type: "frame", name: "message", data: "héllo wörld ✓" }]);
});
