import assert from "node:assert/strict";
import test from "node:test";

import { ancestorPaths, baseName, isValidHash, parentPath, ROOT_PATH } from "@biga/types/file-identity";

test("baseName returns the last path segment", () => {
    assert.equal(baseName("a/b/c.ts"), "c.ts");
    assert.equal(baseName("c.ts"), "c.ts");
});

test("parentPath returns the containing directory, or the root for a top-level entry", () => {
    assert.equal(parentPath("a/b/c.ts"), "a/b");
    assert.equal(parentPath("a/b"), "a");
    assert.equal(parentPath("c.ts"), ROOT_PATH);
});

test("ancestorPaths lists every directory above a path, outermost first", () => {
    assert.deepEqual(ancestorPaths("a/b/c/d.ts"), ["a", "a/b", "a/b/c"]);
    assert.deepEqual(ancestorPaths("a/b.ts"), ["a"]);
    assert.deepEqual(ancestorPaths("top.ts"), []);
});

test("isValidHash accepts exactly 64 hex digits in either case", () => {
    assert.equal(isValidHash("a".repeat(64)), true);
    assert.equal(isValidHash("A".repeat(64)), true);
    assert.equal(isValidHash("a".repeat(63)), false);
    assert.equal(isValidHash("a".repeat(65)), false);
    assert.equal(isValidHash("g".repeat(64)), false);
    assert.equal(isValidHash("latest"), false);
});
