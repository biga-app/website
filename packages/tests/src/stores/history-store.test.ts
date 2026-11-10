import assert from "node:assert/strict";
import test from "node:test";

import { createHistoryStore } from "@biga/viewer-core/stores/history-store";

import { makeCheckpoint, makeSummary } from "../fixtures/checkpoints.ts";

const seqs = (store: ReturnType<typeof createHistoryStore>) => store.getState().checkpoints.map((summary) => summary.seq);

test("an initial hydration sorts summaries oldest first and caches the initial checkpoint", () => {
    const store = createHistoryStore();
    const initial = makeCheckpoint(3);
    store.getState().hydrate([makeSummary(3), makeSummary(1), makeSummary(2)], "initial", initial);
    assert.deepEqual(seqs(store), [1, 2, 3]);
    assert.equal(store.getState().loaded.get(3), initial);
});

test("a resync adds only newer summaries and keeps what is cached", () => {
    const store = createHistoryStore();
    const initial = makeCheckpoint(2);
    store.getState().hydrate([makeSummary(1), makeSummary(2)], "initial", initial);
    store.getState().hydrate([makeSummary(2), makeSummary(3), makeSummary(4)], "resync", null);
    assert.deepEqual(seqs(store), [1, 2, 3, 4]);
    assert.equal(store.getState().loaded.get(2), initial);
});

test("a resync with nothing new leaves the state object untouched", () => {
    const store = createHistoryStore();
    store.getState().hydrate([makeSummary(1)], "initial", null);
    const before = store.getState();
    store.getState().hydrate([makeSummary(1)], "resync", null);
    assert.equal(store.getState(), before);
});

test("append adds new summaries, ignores duplicates and caches the latest full checkpoint", () => {
    const store = createHistoryStore();
    store.getState().hydrate([makeSummary(1)], "initial", null);
    const latest = makeCheckpoint(3);
    store.getState().append([makeSummary(1), makeSummary(2), makeSummary(3)], latest);
    assert.deepEqual(seqs(store), [1, 2, 3]);
    assert.equal(store.getState().loaded.get(3), latest);
});

test("checkpoints that arrive while browsing an older one are counted", () => {
    const store = createHistoryStore();
    store.getState().hydrate([makeSummary(1), makeSummary(2)], "initial", null);
    store.getState().append([makeSummary(3)], null);
    assert.equal(store.getState().newWhileBrowsing, 0);
    store.getState().select(1);
    store.getState().append([makeSummary(4), makeSummary(5)], null);
    assert.equal(store.getState().newWhileBrowsing, 2);
    store.getState().hydrate([makeSummary(6)], "resync", null);
    assert.equal(store.getState().newWhileBrowsing, 3);
});

test("selecting the live head clears the pending count, selecting another keeps it", () => {
    const store = createHistoryStore();
    store.getState().hydrate([makeSummary(1)], "initial", null);
    store.getState().select(1);
    store.getState().append([makeSummary(2)], null);
    store.getState().select(0);
    assert.equal(store.getState().newWhileBrowsing, 1);
    store.getState().select(null);
    assert.equal(store.getState().newWhileBrowsing, 0);
    assert.equal(store.getState().selectedSeq, null);
});

test("prepend adds an older page before the existing summaries and skips overlaps", () => {
    const store = createHistoryStore();
    store.getState().hydrate([makeSummary(10), makeSummary(11)], "initial", null);
    store.getState().prepend([makeSummary(9), makeSummary(8), makeSummary(10)]);
    assert.deepEqual(seqs(store), [8, 9, 10, 11]);
});

test("the cache holds at most 20 full checkpoints and keeps the selected one", () => {
    const store = createHistoryStore();
    store.getState().select(0);
    store.getState().cache(makeCheckpoint(0));
    for (let seq = 1; seq <= 30; seq++) store.getState().cache(makeCheckpoint(seq));
    const loaded = store.getState().loaded;
    assert.equal(loaded.size, 20);
    assert.ok(loaded.has(0));
    assert.ok(loaded.has(30));
    assert.equal(loaded.has(1), false);
});

test("re-caching a checkpoint refreshes its place in the eviction order", () => {
    const store = createHistoryStore();
    for (let seq = 1; seq <= 20; seq++) store.getState().cache(makeCheckpoint(seq));
    store.getState().cache(makeCheckpoint(1));
    store.getState().cache(makeCheckpoint(21));
    assert.ok(store.getState().loaded.has(1));
    assert.equal(store.getState().loaded.has(2), false);
});

test("reset empties everything", () => {
    const store = createHistoryStore();
    store.getState().hydrate([makeSummary(1)], "initial", makeCheckpoint(1));
    store.getState().select(1);
    store.getState().reset();
    assert.deepEqual(seqs(store), []);
    assert.equal(store.getState().loaded.size, 0);
    assert.equal(store.getState().selectedSeq, null);
});
