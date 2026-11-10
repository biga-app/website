import assert from "node:assert/strict";
import test from "node:test";

import type { TransportEvent } from "@biga/types/stream";
import { STREAM_TYPE } from "@biga/types/wire";
import { createStreamTransport } from "@biga/viewer-core/transport/stream-transport";

import { checkpointFrame, connectedFrame, keepaliveFrame } from "../fixtures/frames.ts";
import { delimited } from "../fixtures/wire.ts";

function bodyOf(chunks: Uint8Array[], failAfter = false): ReadableStream<Uint8Array> {
    let index = 0;
    return new ReadableStream({
        pull(controller) {
            const chunk = chunks[index++];
            if (chunk !== undefined) controller.enqueue(chunk);
            else if (failAfter) controller.error(new Error("reset"));
            else controller.close();
        },
    });
}

function streamResponse(body: ReadableStream<Uint8Array>, type = STREAM_TYPE): Response {
    return new Response(body, { status: 200, headers: { "Content-Type": type } });
}

async function run(respond: () => Response | Promise<Response>, signal = new AbortController().signal) {
    const events: TransportEvent[] = [];
    const calls: { url: string; init: RequestInit }[] = [];
    const transport = createStreamTransport({
        baseUrl: "https://api.test",
        fetch: (async (url: string, init: RequestInit) => {
            calls.push({ url, init });
            return respond();
        }) as unknown as typeof fetch,
    });
    await transport.connect("s1", signal, (event) => events.push(event));
    return { events, calls };
}

test("frames from the stream are emitted in order, then a clean close", async () => {
    const first = delimited(connectedFrame.data);
    const second = delimited(keepaliveFrame.data);
    const third = delimited(checkpointFrame(1).data);
    const { events, calls } = await run(() => streamResponse(bodyOf([first, new Uint8Array([...second, ...third])])));
    assert.equal(calls[0]?.url, "https://api.test/api/sessions/s1/stream");
    assert.deepEqual((calls[0]?.init.headers as Record<string, string>).Accept, STREAM_TYPE);
    assert.deepEqual(events, [
        { type: "open" },
        { type: "frame", data: connectedFrame.data },
        { type: "frame", data: keepaliveFrame.data },
        { type: "frame", data: checkpointFrame(1).data },
        { type: "closed", reason: "ended" },
    ]);
});

test("a 429 is reported with the status and Retry-After and never opens", async () => {
    const { events } = await run(() => new Response("{}", { status: 429, headers: { "Retry-After": "30" } }));
    assert.deepEqual(events, [{ type: "closed", reason: "http", status: 429, retryAfterMs: 30000 }]);
});

test("a 503 without Retry-After reports a null delay", async () => {
    const { events } = await run(() => new Response("{}", { status: 503 }));
    assert.deepEqual(events, [{ type: "closed", reason: "http", status: 503, retryAfterMs: null }]);
});

test("a stream in another format, as an older server sends, is refused", async () => {
    const { events } = await run(() => streamResponse(bodyOf([new Uint8Array([1, 2])]), "text/event-stream"));
    assert.deepEqual(events, [{ type: "closed", reason: "http", status: 415 }]);
});

test("a fetch failure is a network close", async () => {
    const { events } = await run(() => Promise.reject(new TypeError("offline")));
    assert.deepEqual(events, [{ type: "closed", reason: "network" }]);
});

test("a stream that errors mid-way is a network close after the frames already read", async () => {
    const { events } = await run(() => streamResponse(bodyOf([delimited(keepaliveFrame.data)], true)));
    assert.deepEqual(events, [
        { type: "open" },
        { type: "frame", data: keepaliveFrame.data },
        { type: "closed", reason: "network" },
    ]);
});

test("a corrupt frame length is a network close", async () => {
    const { events } = await run(() => streamResponse(bodyOf([new Uint8Array([0x80, 0x80, 0x80, 0x80, 0x80, 0x80])])));
    assert.deepEqual(events, [{ type: "open" }, { type: "closed", reason: "network" }]);
});

test("aborting emits nothing after the abort", async () => {
    const controller = new AbortController();
    const { events } = await run(() => {
        controller.abort();
        return Promise.reject(new DOMException("aborted", "AbortError"));
    }, controller.signal);
    assert.deepEqual(events, []);
});
