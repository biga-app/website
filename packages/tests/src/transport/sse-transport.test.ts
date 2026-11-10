import assert from "node:assert/strict";
import test from "node:test";

import { createSseTransport } from "@biga/viewer-core/transport/sse-transport";
import type { TransportEvent } from "@biga/types/stream";

const encoder = new TextEncoder();

function bodyOf(chunks: string[], failAfter = false): ReadableStream<Uint8Array> {
    let index = 0;
    return new ReadableStream({
        pull(controller) {
            const chunk = chunks[index++];
            if (chunk !== undefined) controller.enqueue(encoder.encode(chunk));
            else if (failAfter) controller.error(new Error("reset"));
            else controller.close();
        },
    });
}

async function run(respond: () => Response | Promise<Response>, signal = new AbortController().signal) {
    const events: TransportEvent[] = [];
    const calls: { url: string; init: RequestInit }[] = [];
    const transport = createSseTransport({
        baseUrl: "https://api.test",
        fetch: (async (url: string, init: RequestInit) => {
            calls.push({ url, init });
            return respond();
        }) as unknown as typeof fetch,
    });
    await transport.connect("s1", signal, (event) => events.push(event));
    return { events, calls };
}

test("frames and keepalives from the stream are emitted in order, then a clean close", async () => {
    const { events, calls } = await run(
        () => new Response(bodyOf([": keepalive\n\nevent: connected\ndata: {}\n\n", "event: checkpoint\ndata: {\"seq\":1}\n\n"]))
    );
    assert.equal(calls[0]?.url, "https://api.test/api/sessions/s1/stream");
    assert.deepEqual(events, [
        { type: "open" },
        { type: "heartbeat" },
        { type: "frame", name: "connected", data: "{}" },
        { type: "frame", name: "checkpoint", data: '{"seq":1}' },
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

test("a fetch failure is a network close", async () => {
    const { events } = await run(() => Promise.reject(new TypeError("offline")));
    assert.deepEqual(events, [{ type: "closed", reason: "network" }]);
});

test("a stream that errors mid-way is a network close after the frames already read", async () => {
    const { events } = await run(() => new Response(bodyOf(["data: a\n\n"], true)));
    assert.deepEqual(events, [
        { type: "open" },
        { type: "frame", name: "message", data: "a" },
        { type: "closed", reason: "network" },
    ]);
});

test("aborting emits nothing after the abort", async () => {
    const controller = new AbortController();
    const { events } = await run(() => {
        controller.abort();
        return Promise.reject(new DOMException("aborted", "AbortError"));
    }, controller.signal);
    assert.deepEqual(events, []);
});
