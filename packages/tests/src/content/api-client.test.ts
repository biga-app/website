import assert from "node:assert/strict";
import test from "node:test";

import { ApiRequestError } from "@biga/types/api";
import type { FileHistoryEntry } from "@biga/types/checkpoint";
import { PROTOBUF_TYPE } from "@biga/types/wire";
import { createApiClient } from "@biga/viewer-core/content/api-client";
import { parseShareKey } from "@biga/viewer-core/crypto/content-crypto";

import { makeChange, makeCheckpoint, makeSummary } from "../fixtures/checkpoints.ts";
import { hash } from "../fixtures/hash.ts";
import { makeState } from "../fixtures/session.ts";
import { vector, vectorKeyText } from "../fixtures/e2ee-vectors.ts";
import { encodeApiError, encodeCheckpoint, encodeCheckpointList, encodeFileContent, encodeFileHistory, encodeState } from "../fixtures/wire.ts";

const HASH = hash("a");

type Call = { url: string; init: RequestInit };

function ok(body: Uint8Array, status = 200, headers: Record<string, string> = {}) {
    return new Response(body as BodyInit, { status, headers: { "Content-Type": PROTOBUF_TYPE, ...headers } });
}

function failure(status: number, headers: Record<string, string> = {}) {
    return ok(encodeApiError("x", "nope"), status, headers);
}

function setup(responses: (Response | Error)[], key: Uint8Array | null = null) {
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
        key,
    });
    return { client, calls, sleeps };
}

const content = { content: "hi", binary: false, hash: HASH };

function fileOk() {
    return ok(encodeFileContent(content));
}

test("hash refs use the default cache mode so immutable responses are reused", async () => {
    const { client, calls } = setup([fileOk()]);
    await client.getFile("s1", "a.ts", HASH);
    assert.equal(calls[0]?.init.cache, "default");
});

test("latest and checkpoint refs are never cached", async () => {
    const { client, calls } = setup([fileOk(), fileOk()]);
    await client.getFile("s1", "a.ts", "latest");
    await client.getFile("s1", "a.ts", "12");
    assert.deepEqual(
        calls.map((call) => call.init.cache),
        ["no-store", "no-store"]
    );
});

test("the file request carries the path and ref in the query", async () => {
    const { client, calls } = setup([fileOk()]);
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
    const { client, calls, sleeps } = setup([failure(503), failure(500), fileOk()]);
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
    const { client, sleeps } = setup([failure(429, { "Retry-After": "2" }), fileOk()]);
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
    const { client, calls } = setup([ok(encodeFileContent({ content: "hi", binary: false, hash: "short" }))]);
    await assert.rejects(client.getFile("s1", "a.ts", HASH), (error: ApiRequestError) => error.kind === "invalid");
    assert.equal(calls.length, 1);
});

test("a body that is not protobuf still maps to an error for the status", async () => {
    const { client } = setup([new Response("<html>", { status: 404 })]);
    await assert.rejects(client.getFile("s1", "a.ts", HASH), (error: ApiRequestError) => error.kind === "not_found");
});

test("checkpoint pages send only the cursor options that were given", async () => {
    const { client, calls } = setup([ok(encodeCheckpointList([])), ok(encodeCheckpointList([]))]);
    await client.getCheckpoints("s1");
    await client.getCheckpoints("s1", { before: 40, limit: 20 });
    assert.equal(calls[0]?.url, "https://api.test/api/sessions/s1/checkpoints");
    assert.equal(calls[1]?.url, "https://api.test/api/sessions/s1/checkpoints?before=40&limit=20");
});

const validState = makeState({ mode: "eager", contents: { [HASH]: "abc" } });

test("getState parses a full session state and never caches it", async () => {
    const { client, calls } = setup([ok(encodeState(validState))]);
    const state = await client.getState("s1");
    assert.equal(calls[0]?.url, "https://api.test/api/sessions/s1/state");
    assert.equal(calls[0]?.init.cache, "no-store");
    assert.equal(state.mode, "eager");
    assert.equal(state.contents?.[HASH], "abc");
    assert.equal(state.checkpoints[0]?.seq, 0);
});

test("getState rejects a state with a malformed snapshot as invalid", async () => {
    const broken = { ...validState, snapshot: { sessionId: "s1", tree: { type: "file" as const, name: "x", path: "x", size: 1, hash: "short" }, timestamp: 1, sequenceNum: 0 } };
    const { client } = setup([ok(encodeState(broken))]);
    await assert.rejects(client.getState("s1"), (error: ApiRequestError) => error.kind === "invalid");
});

test("getCheckpoint requests the sequence number and parses its change list", async () => {
    const checkpoint = makeCheckpoint(7, [makeChange("a.ts", "added")]);
    const { client, calls } = setup([ok(encodeCheckpoint(checkpoint))]);
    const result = await client.getCheckpoint("s1", 7);
    assert.equal(calls[0]?.url, "https://api.test/api/sessions/s1/checkpoints/7");
    assert.equal(result.changes[0]?.path, "a.ts");
});

test("getFileHistory sends the path and returns the entries newest first as given", async () => {
    const entry = (seq: number): FileHistoryEntry => ({ seq, label: `#${seq}`, createdAt: makeSummary(seq).createdAt, changeType: "modified", beforeHash: HASH, afterHash: HASH, additions: 1, deletions: 1, binary: false });
    const { client, calls } = setup([ok(encodeFileHistory([entry(5), entry(2)]))]);
    const history = await client.getFileHistory("s1", "src/a b.ts");
    assert.equal(new URL(calls[0]?.url ?? "").searchParams.get("path"), "src/a b.ts");
    assert.deepEqual(history.map((item) => item.seq), [5, 2]);
});

test("getCheckpoints returns the summaries from the response", async () => {
    const summary = makeSummary(3);
    const { client } = setup([ok(encodeCheckpointList([summary]))]);
    assert.deepEqual((await client.getCheckpoints("s1")).map((item) => item.seq), [3]);
});

test("the priority hint is passed through to fetch", async () => {
    const { client, calls } = setup([fileOk()]);
    await client.getFile("s1", "a.ts", HASH, { priority: "low" });
    assert.equal((calls[0]?.init as { priority?: string }).priority, "low");
});

test("requests ask for protobuf", async () => {
    const { client, calls } = setup([fileOk()]);
    await client.getFile("s1", "a.ts", HASH);
    assert.equal((calls[0]?.init.headers as Record<string, string>).Accept, PROTOBUF_TYPE);
});

test("the error message comes from the server's error body", async () => {
    const { client } = setup([failure(404)]);
    await assert.rejects(client.getFile("s1", "a.ts", HASH), (error: ApiRequestError) => error.message === "nope" && error.status === 404);
});

test("a JSON answer, as an older server sends, is invalid and not retried", async () => {
    const { client, calls } = setup([new Response('{"ok":true,"data":{}}', { headers: { "Content-Type": "application/json" } })]);
    await assert.rejects(client.getState("s1"), (error: ApiRequestError) => error.kind === "invalid");
    assert.equal(calls.length, 1);
});

test("a protobuf body that does not decode is invalid", async () => {
    const { client } = setup([ok(new Uint8Array([0xff, 0xff, 0xff]))]);
    await assert.rejects(client.getState("s1"), (error: ApiRequestError) => error.kind === "invalid");
});

test("text that is not UTF-8 is shown with replacement characters, not an error", async () => {
    const bytes = encodeFileContent({ content: "placeholder", binary: false, hash: HASH });
    const raw = new Uint8Array(bytes);
    const at = raw.indexOf("p".charCodeAt(0));
    raw[at] = 0xff;
    const { client } = setup([ok(raw)]);
    assert.match((await client.getFile("s1", "a.ts", HASH)).content, /^\uFFFDlaceholder$/);
});

const shareKey = (parseShareKey(`#k=${vectorKeyText}`) as { bytes: Uint8Array }).bytes;

function sealedState(names: string[]) {
    const state = makeState({ mode: "eager" });
    state.session = { ...state.session, encrypted: true };
    return encodeState(state, Object.fromEntries(names.map((name) => [vector(name).id, vector(name).sealed])));
}

test("an encrypted state is opened with the link's key", async () => {
    const { client } = setup([ok(sealedState(["short", "unicode", "compressible"]))], shareKey);
    const state = await client.getState("s1");
    assert.equal(state.session.encrypted, true);
    assert.equal(state.contents?.[vector("short").id], "hello\n");
    assert.equal(state.contents?.[vector("unicode").id], "héllo ✓ wörld\n");
    assert.equal(state.contents?.[vector("compressible").id], "abc\n".repeat(1000));
});

test("an encrypted file is opened by the hash it is named with", async () => {
    const { id, sealed } = vector("unicode");
    const { client } = setup([ok(encodeFileContent({ content: "", binary: false, hash: id }, sealed))], shareKey);
    assert.deepEqual(await client.getFile("s1", "a.txt", id), { content: "héllo ✓ wörld\n", binary: false, hash: id });
});

test("a binary placeholder in an encrypted session has nothing to open", async () => {
    const { client } = setup([ok(encodeFileContent({ content: "", binary: true, hash: vector("short").id }, new Uint8Array(0)))], shareKey);
    assert.deepEqual(await client.getFile("s1", "logo.png", vector("short").id), { content: "", binary: true, hash: vector("short").id });
});

test("an encrypted session opened without a key is a missing key, and is not retried", async () => {
    const { client, calls } = setup([ok(sealedState(["short"]))]);
    await assert.rejects(client.getState("s1"), (error: ApiRequestError) => error.kind === "missing_key");
    assert.equal(calls.length, 1);

    const { id, sealed } = vector("short");
    const files = setup([ok(encodeFileContent({ content: "", binary: false, hash: id }, sealed))]);
    await assert.rejects(files.client.getFile("s1", "a.txt", id), (error: ApiRequestError) => error.kind === "missing_key");
    assert.equal(files.calls.length, 1);
});

test("a state with no content still says it needs a key", async () => {
    const lazy = makeState({ mode: "lazy" });
    lazy.session = { ...lazy.session, encrypted: true };
    const { client } = setup([ok(encodeState(lazy))]);
    await assert.rejects(client.getState("s1"), (error: ApiRequestError) => error.kind === "missing_key");
});

test("the wrong key is reported as such, and is not retried", async () => {
    const wrong = Uint8Array.from(shareKey);
    wrong[5] = (wrong[5] as number) ^ 0xff;
    const { client, calls } = setup([ok(sealedState(["short"]))], wrong);
    await assert.rejects(client.getState("s1"), (error: ApiRequestError) => error.kind === "wrong_key");
    assert.equal(calls.length, 1);
});

test("content that was altered on its way is refused", async () => {
    const { id, sealed } = vector("short");
    const altered = Uint8Array.from(sealed);
    altered[altered.length - 1] = (altered[altered.length - 1] as number) ^ 1;
    const { client } = setup([ok(encodeFileContent({ content: "", binary: false, hash: id }, altered))], shareKey);
    await assert.rejects(client.getFile("s1", "a.txt", id), (error: ApiRequestError) => error.kind === "wrong_key");
});

test("a key on the link does nothing for a session that is not encrypted", async () => {
    const { client } = setup([ok(encodeState(makeState({ mode: "eager", contents: { [HASH]: "plain text" } })))], shareKey);
    assert.equal((await client.getState("s1")).contents?.[HASH], "plain text");
    const files = setup([fileOk()], shareKey);
    assert.equal((await files.client.getFile("s1", "a.ts", HASH)).content, "hi");
});
