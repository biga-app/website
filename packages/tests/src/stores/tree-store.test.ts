import assert from "node:assert/strict";
import test from "node:test";

import { buildTreeTable } from "@biga/viewer-core/pipeline/tree-table";
import { createTreeStore } from "@biga/viewer-core/stores/tree-store";

import { hash } from "../fixtures/hash.ts";
import { directoryNode, fileNode, rootNode } from "../fixtures/tree.ts";

const sample = () => buildTreeTable(rootNode([directoryNode("src", [fileNode("src/a.ts"), fileNode("src/b.ts")]), fileNode("z.ts")]));
const upsert = (path: string) => ({ op: "upsert" as const, path, hash: hash("9"), binary: false });

test("a new tree store is empty", () => {
    const state = createTreeStore().getState();
    assert.deepEqual(state.rows, []);
    assert.equal(state.fileCount, 0);
});

test("load publishes the visible rows, file count and a new revision", () => {
    const store = createTreeStore();
    const before = store.getState().revision;
    store.getState().load(sample());
    assert.deepEqual(store.getState().rows, ["src", "z.ts"]);
    assert.equal(store.getState().fileCount, 3);
    assert.ok(store.getState().revision > before);
});

test("apply adds files and republishes the rows", () => {
    const store = createTreeStore();
    store.getState().load(sample());
    store.getState().apply([upsert("y.ts")]);
    assert.deepEqual(store.getState().rows, ["src", "y.ts", "z.ts"]);
    assert.equal(store.getState().fileCount, 4);
});

test("a patch that changes nothing leaves the state object and rows untouched", () => {
    const store = createTreeStore();
    store.getState().load(sample());
    const before = store.getState();
    store.getState().apply([{ op: "remove", path: "missing.ts" }]);
    assert.equal(store.getState(), before);
    assert.equal(store.getState().rows, before.rows);
});

test("published rows are a snapshot that later changes do not mutate", () => {
    const store = createTreeStore();
    store.getState().load(sample());
    const first = store.getState().rows;
    store.getState().setExpanded("src", true);
    assert.deepEqual(first, ["src", "z.ts"]);
    assert.deepEqual(store.getState().rows, ["src", "src/a.ts", "src/b.ts", "z.ts"]);
});

test("expandAncestors and collapseAll change which rows are visible", () => {
    const store = createTreeStore();
    store.getState().load(sample());
    store.getState().expandAncestors("src/a.ts");
    assert.deepEqual(store.getState().rows, ["src", "src/a.ts", "src/b.ts", "z.ts"]);
    store.getState().collapseAll();
    assert.deepEqual(store.getState().rows, ["src", "z.ts"]);
});

test("the reader exposes entries, positions and the expanded set", () => {
    const store = createTreeStore();
    store.getState().load(sample());
    store.getState().setExpanded("src", true);
    const { reader } = store.getState();
    assert.equal(reader.entry("src/a.ts")?.hash, hash("1"));
    assert.deepEqual(reader.position("src/b.ts"), { setSize: 2, posInSet: 2 });
    assert.ok(reader.expandedPaths().has("src"));
});

test("a file's hash can be selected per path and only changes when that file changes", () => {
    const store = createTreeStore();
    store.getState().load(sample());
    const hashes: (string | undefined)[] = [];
    let last = store.getState().reader.entry("src/a.ts")?.hash;
    store.subscribe((state) => {
        const next = state.reader.entry("src/a.ts")?.hash;
        if (next !== last) {
            last = next;
            hashes.push(next);
        }
    });
    store.getState().apply([upsert("z.ts")]);
    store.getState().apply([upsert("src/a.ts")]);
    assert.deepEqual(hashes, [hash("9")]);
});

test("markTouched replaces the touched set and bumps its revision", () => {
    const store = createTreeStore();
    store.getState().markTouched(["a.ts", "b.ts"]);
    assert.deepEqual([...store.getState().touched].sort(), ["a.ts", "b.ts"]);
    assert.equal(store.getState().touchedRevision, 1);
    store.getState().markTouched(["c.ts"]);
    assert.deepEqual([...store.getState().touched], ["c.ts"]);
    assert.equal(store.getState().touchedRevision, 2);
});

test("subscribers hear one update per real change", () => {
    const store = createTreeStore();
    let updates = 0;
    store.subscribe(() => updates++);
    store.getState().load(sample());
    store.getState().apply([{ op: "remove", path: "nothing" }]);
    store.getState().apply([upsert("y.ts")]);
    assert.equal(updates, 2);
});

test("reset empties the tree, the expanded set and the touched marks", () => {
    const store = createTreeStore();
    store.getState().load(sample());
    store.getState().setExpanded("src", true);
    store.getState().markTouched(["a.ts"]);
    store.getState().reset();
    assert.deepEqual(store.getState().rows, []);
    assert.equal(store.getState().fileCount, 0);
    assert.equal(store.getState().touched.size, 0);
    assert.equal(store.getState().reader.expandedPaths().size, 0);
});

test("prepareLoad keeps the published tree untouched until the returned commit runs", async () => {
    const store = createTreeStore();
    store.getState().load(sample());
    const rows = store.getState().rows;
    const commit = await store.getState().prepareLoad(buildTreeTable(rootNode([fileNode("fresh.ts")])), () => Promise.resolve());
    assert.equal(store.getState().rows, rows);
    assert.equal(store.getState().reader.entry("z.ts")?.path, "z.ts");
    commit();
    assert.deepEqual(store.getState().rows, ["fresh.ts"]);
    assert.equal(store.getState().reader.entry("z.ts"), undefined);
    assert.equal(store.getState().fileCount, 1);
});
