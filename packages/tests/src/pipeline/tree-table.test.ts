import assert from "node:assert/strict";
import test from "node:test";

import { KIND_DIRECTORY, KIND_FILE, KIND_IGNORED } from "@biga/types";

import { buildTreeTable, compareSiblings, patchesFromChanges } from "@biga/viewer-core/pipeline/tree-table";

import { makeChange } from "../fixtures/checkpoints.ts";
import { hash } from "../fixtures/hash.ts";
import { directoryNode, fileNode, rootNode } from "../fixtures/tree.ts";

const HASH = hash("1");

test("compareSiblings puts directories before files and compares names with the locale collator", () => {
    const dir = { kind: KIND_DIRECTORY, name: "zeta" };
    const ignored = { kind: KIND_IGNORED, name: "dist" };
    const plain = { kind: KIND_FILE, name: "alpha" };
    assert.ok(compareSiblings(dir, plain) < 0);
    assert.ok(compareSiblings(plain, dir) > 0);
    assert.ok(compareSiblings(ignored, plain) < 0);
    assert.ok(compareSiblings({ kind: KIND_FILE, name: "a" }, { kind: KIND_FILE, name: "B" }) < 0);
    assert.equal(compareSiblings(plain, { kind: KIND_FILE, name: "alpha" }), 0);
});

test("an empty root produces an empty table", () => {
    const table = buildTreeTable(rootNode([]));
    assert.deepEqual(table.paths, []);
    assert.equal(table.parents.length, 0);
});

test("the table is a depth-first pre-order walk with siblings sorted", () => {
    const table = buildTreeTable(
        rootNode([fileNode("z.ts"), directoryNode("src", [fileNode("src/b.ts"), fileNode("src/a.ts"), directoryNode("src/lib", [fileNode("src/lib/x.ts")])]), fileNode("a.ts")])
    );
    assert.deepEqual(table.paths, ["src", "src/lib", "src/lib/x.ts", "src/a.ts", "src/b.ts", "a.ts", "z.ts"]);
});

test("parents point at the index of the containing directory and top-level entries use -1", () => {
    const table = buildTreeTable(rootNode([directoryNode("d", [fileNode("d/f.ts"), directoryNode("d/e", [fileNode("d/e/g.ts")])]), fileNode("top.ts")]));
    assert.deepEqual(table.paths, ["d", "d/e", "d/e/g.ts", "d/f.ts", "top.ts"]);
    assert.deepEqual([...table.parents], [-1, 0, 1, 0, -1]);
});

test("kinds, sizes, hashes and the binary flag are recorded per row", () => {
    const table = buildTreeTable(
        rootNode([directoryNode("out", [], true), directoryNode("d", [fileNode("d/img.png", { size: 99, binary: true })]), fileNode("a.ts", { size: 7 })])
    );
    assert.deepEqual(table.paths, ["d", "d/img.png", "out", "a.ts"]);
    assert.deepEqual([...table.kinds], [KIND_DIRECTORY, KIND_FILE, KIND_IGNORED, KIND_FILE]);
    assert.deepEqual([...table.sizes], [0, 99, 0, 7]);
    assert.deepEqual([...table.binary], [0, 1, 0, 0]);
    assert.deepEqual(table.hashes, ["", HASH, "", HASH]);
});

test("the contents of an ignored directory are never walked", () => {
    const table = buildTreeTable(rootNode([directoryNode("dist", [fileNode("dist/secret.js")], true)]));
    assert.deepEqual(table.paths, ["dist"]);
});

test("the numeric columns have exactly one slot per row", () => {
    const table = buildTreeTable(rootNode([directoryNode("d", [fileNode("d/a"), fileNode("d/b")]), fileNode("c")]));
    assert.equal(table.paths.length, 4);
    for (const column of [table.parents, table.kinds, table.sizes, table.binary]) assert.equal(column.length, 4);
    assert.equal(table.hashes.length, 4);
});

test("children wrongly listed under an ignored directory do not leave spare slots", () => {
    const table = buildTreeTable(rootNode([directoryNode("dist", [fileNode("dist/a.js"), fileNode("dist/b.js")], true), fileNode("x.ts")]));
    assert.deepEqual(table.paths, ["dist", "x.ts"]);
    for (const column of [table.parents, table.kinds, table.sizes, table.binary]) assert.equal(column.length, 2);
});

test("added and modified changes become upserts that carry the new hash and binary flag", () => {
    assert.deepEqual(patchesFromChanges([makeChange("a.ts", "added"), makeChange("b.png", "modified", "1", { binary: true })]), [
        { op: "upsert", path: "a.ts", hash: HASH, binary: false },
        { op: "upsert", path: "b.png", hash: HASH, binary: true },
    ]);
});

test("a deleted change becomes a remove", () => {
    assert.deepEqual(patchesFromChanges([makeChange("a.ts", "deleted")]), [{ op: "remove", path: "a.ts" }]);
});

test("a rename removes the old path and upserts the new one, in that order", () => {
    assert.deepEqual(patchesFromChanges([makeChange("new.ts", "renamed", "1", { oldPath: "old.ts" })]), [
        { op: "remove", path: "old.ts" },
        { op: "upsert", path: "new.ts", hash: HASH, binary: false },
    ]);
});

test("a rename without an old path still upserts the new one", () => {
    assert.deepEqual(patchesFromChanges([makeChange("new.ts", "renamed")]), [{ op: "upsert", path: "new.ts", hash: HASH, binary: false }]);
});

test("a non-delete change without an after hash produces no patch", () => {
    assert.deepEqual(patchesFromChanges([makeChange("a.ts", "modified", "1", { afterHash: null })]), []);
});

test("patch order follows change order", () => {
    const paths = patchesFromChanges([makeChange("b", "added"), makeChange("a", "deleted"), makeChange("c", "modified")]).map((patch) => patch.path);
    assert.deepEqual(paths, ["b", "a", "c"]);
});
