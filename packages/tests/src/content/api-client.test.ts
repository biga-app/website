import assert from "node:assert/strict";
import test from "node:test";

import { ApiRequestError } from "@biga/types";
import { createApiClient } from "@biga/viewer-core/content/api-client";

import { makeChange, makeCheckpoint, makeSummary } from "../fixtures/checkpoints.ts";
import { hash } from "../fixtures/hash.ts";
import { makeState } from "../fixtures/session.ts";

const HASH = hash("a");

type Call = { url: string; init: RequestInit };

function envelope(data: unknown, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify({ ok: true, data }), { status, headers });
}

function failure(status: number, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify({ ok: false, error: { code: "x", message: "nope" } }), { status, headers });
}

function setup(responses: (Response | Error)[]) {
    const calls: Call[] = [];
    const sleeps: number[] = [];
    const queue = [...responses];
    const client = createApiClient({
        baseUrl: "https://api.test",
        fetch: (async (url: string, init: RequestInit) => {
            calls.push({ url, init });
            const next = queue.shift();
            if (next instanceof Error) throw next;
            if (!next) throw new Error("no response queued");
            return next;
        }) as unknown as typeof fetch,
        sleep: async (ms) => {
            sleeps.push(ms);
        },
        backoffMs: 100,
    });
    return { client, calls, sleeps };
}

const content = { content: "hi", binary: false, hash: HASH };

test("hash refs use the default cache mode so immutable responses are reused", async () => {
    const { client, calls } = setup([envelope(content)]);
    await client.getFile("s1", "a.ts", HASH);
    assert.equal(calls[0]?.init.cache, "default");
});

test("latest and checkpoint refs are never cached", async () => {
    const { client, calls } = setup([envelope(content), envelope(content)]);
    await client.getFile("s1", "a.ts", "latest");
    await client.getFile("s1", "a.ts", "12");
    assert.deepEqual(
        calls.map((call) => call.init.cache),
        ["no-store", "no-store"]
    );
});

test("the file request carries the path and ref in the query", async () => {
    const { client, calls } = setup([envelope(content)]);
    await client.getFile("s1", "dir/a b.ts", HASH);
    const url = new URL(calls[0]?.url ?? "");
    assert.equal(url.pathname, "/api/sessions/s1/file");
    assert.equal(url.searchParams.get("path"), "dir/a b.ts");
    assert.equal(url.searchParams.get("ref"), HASH);
});

test("a 404 fails immediately without retrying", async () => {
    const { client, calls, sleeps } = setup([failure(404)]);
    await assert.rejects(client.getFile("s1", "a.ts", HASH), (error: ApiRequestError) => error.kind === "not_found");
    assert.equal(calls.length, 1);
    assert.deepEqual(sleeps, []);
});

test("a 5xx is retried with exponential backoff and then succeeds", async () => {
    const { client, calls, sleeps } = setup([failure(503), failure(500), envelope(content)]);
    const result = await client.getFile("s1", "a.ts", HASH);
    assert.equal(result.content, "hi");
    assert.equal(calls.length, 3);
    assert.deepEqual(sleeps, [100, 200]);
});

test("retries stop after the attempt limit and surface the last error", async () => {
    const { client, calls } = setup([failure(500), failure(500), failure(502)]);
    await assert.rejects(client.getFile("s1", "a.ts", HASH), (error: ApiRequestError) => error.kind === "server");
    assert.equal(calls.length, 3);
});

test("a 429 waits for Retry-After instead of the backoff", async () => {
    const { client, sleeps } = setup([failure(429, { "Retry-After": "2" }), envelope(content)]);
    await client.getFile("s1", "a.ts", HASH);
    assert.deepEqual(sleeps, [2000]);
});

test("a network failure is retried and reported as a network error", async () => {
    const { client, calls } = setup([new TypeError("fail"), new TypeError("fail"), new TypeError("fail")]);
    await assert.rejects(client.getState("s1"), (error: ApiRequestError) => error.kind === "network");
    assert.equal(calls.length, 3);
});

test("an aborted request rethrows the abort and is not retried", async () => {
    const controller = new AbortController();
    controller.abort();
    const { client, calls } = setup([new DOMException("aborted", "AbortError")]);
    await assert.rejects(client.getFile("s1", "a.ts", HASH, { signal: controller.signal }), { name: "AbortError" });
    assert.equal(calls.length, 1);
});

test("a payload that fails validation is an invalid error and is not retried", async () => {
    const { client, calls } = setup([envelope({ content: 5 })]);
    await assert.rejects(client.getFile("s1", "a.ts", HASH), (error: ApiRequestError) => error.kind === "invalid");
    assert.equal(calls.length, 1);
});

test("a non-JSON body maps to an error for the status", async () => {
    const { client } = setup([new Response("<html>", { status: 404 })]);
    await assert.rejects(client.getFile("s1", "a.ts", HASH), (error: ApiRequestError) => error.kind === "not_found");
});

test("checkpoint pages send only the cursor options that were given", async () => {
    const { client, calls } = setup([envelope({ checkpoints: [] }), envelope({ checkpoints: [] })]);
    await client.getCheckpoints("s1");
    await client.getCheckpoints("s1", { before: 40, limit: 20 });
    assert.equal(calls[0]?.url, "https://api.test/api/sessions/s1/checkpoints");
    assert.equal(calls[1]?.url, "https://api.test/api/sessions/s1/checkpoints?before=40&limit=20");
});

const validState = makeState({ mode: "eager", contents: { [HASH]: "abc" } });

test("getState parses a full session state and never caches it", async () => {
    const { client, calls } = setup([envelope(validState)]);
    const state = await client.getState("s1");
    assert.equal(calls[0]?.url, "https://api.test/api/sessions/s1/state");
    assert.equal(calls[0]?.init.cache, "no-store");
    assert.equal(state.mode, "eager");
    assert.equal(state.contents?.[HASH], "abc");
    assert.equal(state.checkpoints[0]?.seq, 0);
});

test("getState rejects a state with a malformed snapshot as invalid", async () => {
    const broken = { ...validState, snapshot: { tree: { type: "file" } } };
    const { client } = setup([envelope(broken)]);
    await assert.rejects(client.getState("s1"), (error: ApiRequestError) => error.kind === "invalid");
});

test("getCheckpoint requests the sequence number and parses its change list", async () => {
    const checkpoint = makeCheckpoint(7, [makeChange("a.ts", "added")]);
    const { client, calls } = setup([envelope(checkpoint)]);
    const result = await client.getCheckpoint("s1", 7);
    assert.equal(calls[0]?.url, "https://api.test/api/sessions/s1/checkpoints/7");
    assert.equal(result.changes[0]?.path, "a.ts");
});

test("getFileHistory sends the path and returns the entries newest first as given", async () => {
    const entry = (seq: number) => ({ seq, label: `#${seq}`, createdAt: makeSummary(seq).createdAt, changeType: "modified", beforeHash: HASH, afterHash: HASH, additions: 1, deletions: 1, binary: false });
    const { client, calls } = setup([envelope({ history: [entry(5), entry(2)] })]);
    const history = await client.getFileHistory("s1", "src/a b.ts");
    assert.equal(new URL(calls[0]?.url ?? "").searchParams.get("path"), "src/a b.ts");
    assert.deepEqual(history.map((item) => item.seq), [5, 2]);
});

test("getCheckpoints returns the summaries from the envelope", async () => {
    const summary = makeSummary(3);
    const { client } = setup([envelope({ checkpoints: [summary] })]);
    assert.deepEqual((await client.getCheckpoints("s1")).map((item) => item.seq), [3]);
});

test("the priority hint is passed through to fetch", async () => {
    const { client, calls } = setup([envelope(content)]);
    await client.getFile("s1", "a.ts", HASH, { priority: "low" });
    assert.equal((calls[0]?.init as { priority?: string }).priority, "low");
});
