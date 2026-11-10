import assert from "node:assert/strict";
import test from "node:test";

import { createBlobStore, defaultBudgetBytes, measureContent } from "@biga/viewer-core/content/blob-store";

const roomy = { budgetBytes: 1_000_000, maxEntries: 100 };

test("line statistics are measured once at insert", () => {
    assert.deepEqual(measureContent(""), { content: "", lineCount: 0, maxLineLength: 0 });
    assert.deepEqual(measureContent("a"), { content: "a", lineCount: 1, maxLineLength: 1 });
    assert.deepEqual(measureContent("ab\ncde\n"), { content: "ab\ncde\n", lineCount: 3, maxLineLength: 3 });
    assert.equal(measureContent("x\n\n\nlonger line").maxLineLength, 11);
    assert.equal(measureContent("x\n\n\nlonger line").lineCount, 4);
});

test("the least recently used entry is evicted first", () => {
    const store = createBlobStore({ budgetBytes: 1_000_000, maxEntries: 2 });
    store.set("a", "1");
    store.set("b", "2");
    store.get("a");
    store.set("c", "3");
    assert.equal(store.has("a"), true);
    assert.equal(store.has("b"), false);
    assert.equal(store.has("c"), true);
});

test("the byte budget evicts old entries but keeps the one just inserted", () => {
    const store = createBlobStore({ budgetBytes: 30, maxEntries: 100 });
    store.set("a", "x".repeat(10));
    store.set("b", "y".repeat(10));
    assert.equal(store.has("a"), false);
    store.set("huge", "z".repeat(500));
    assert.equal(store.has("huge"), true);
    assert.equal(store.has("b"), false);
    assert.equal(store.size, 1);
});

test("pinned entries survive eviction until every pin is released", () => {
    const store = createBlobStore({ budgetBytes: 1_000_000, maxEntries: 1 });
    store.set("a", "1");
    store.pin("a");
    store.pin("a");
    store.set("b", "2");
    assert.equal(store.has("a"), true);
    store.unpin("a");
    assert.equal(store.has("a"), true);
    store.unpin("a");
    assert.equal(store.has("a"), false);
    assert.equal(store.has("b"), true);
});

test("concurrent loads of one hash share a single fetch", async () => {
    const store = createBlobStore(roomy);
    let calls = 0;
    const fetchContent = async () => {
        calls++;
        return "body";
    };
    const [first, second] = await Promise.all([store.load("h", fetchContent), store.load("h", fetchContent)]);
    assert.equal(calls, 1);
    assert.equal(first, second);
    assert.equal(store.isLoading("h"), false);
    await store.load("h", fetchContent);
    assert.equal(calls, 1);
});

test("a failed load is not cached and can be retried", async () => {
    const store = createBlobStore(roomy);
    await assert.rejects(store.load("h", () => Promise.reject(new Error("boom"))), /boom/);
    assert.equal(store.isLoading("h"), false);
    assert.equal((await store.load("h", async () => "ok")).content, "ok");
});

test("prefill inserts every entry and replacing a hash does not double count bytes", () => {
    const store = createBlobStore(roomy);
    store.prefill({ a: "12", b: "345" });
    assert.equal(store.bytes, 10);
    store.set("a", "1234");
    assert.equal(store.bytes, 14);
});

test("clear empties the store", () => {
    const store = createBlobStore(roomy);
    store.set("a", "1");
    store.pin("a");
    store.clear();
    assert.equal(store.size, 0);
    assert.equal(store.bytes, 0);
});

test("low-memory devices get the smaller budget", () => {
    assert.equal(defaultBudgetBytes(), 32 * 1024 * 1024);
    assert.equal(defaultBudgetBytes(8), 32 * 1024 * 1024);
    assert.equal(defaultBudgetBytes(4), 12 * 1024 * 1024);
    assert.equal(defaultBudgetBytes(2), 12 * 1024 * 1024);
});
