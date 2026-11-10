import assert from "node:assert/strict";
import test from "node:test";

import { searchPaths } from "@biga/viewer-core/runtime/file-search";

const PATHS = ["src/app.ts", "src/utils/math.ts", "README.md", "docs/guide.md", "src/components/app-shell.tsx", "package.json"];

test("an empty query lists paths alphabetically up to the limit", () => {
    assert.deepEqual(searchPaths(PATHS, "", 3), ["README.md", "docs/guide.md", "package.json"]);
    assert.deepEqual(searchPaths(PATHS, "   ", 2), ["README.md", "docs/guide.md"]);
});

test("a match in the file name beats a match elsewhere in the path", () => {
    assert.deepEqual(searchPaths(PATHS, "app").slice(0, 2), ["src/app.ts", "src/components/app-shell.tsx"]);
});

test("a path-only substring match comes after name matches", () => {
    assert.deepEqual(searchPaths(PATHS, "utils"), ["src/utils/math.ts"]);
    assert.deepEqual(searchPaths(["utils/a.ts", "b/utils.ts"], "utils"), ["b/utils.ts", "utils/a.ts"]);
});

test("a loose subsequence still matches, after substring matches", () => {
    assert.deepEqual(searchPaths(PATHS, "uth"), ["src/utils/math.ts"]);
    assert.equal(searchPaths(PATHS, "app")[0], "src/app.ts");
});

test("matching is case-insensitive", () => {
    assert.deepEqual(searchPaths(PATHS, "readme"), ["README.md"]);
    assert.deepEqual(searchPaths(PATHS, "README"), ["README.md"]);
});

test("paths that cannot match are excluded", () => {
    assert.deepEqual(searchPaths(PATHS, "zzz"), []);
});

test("results are capped at the limit and the input is not mutated", () => {
    const many = Array.from({ length: 200 }, (_, index) => `file-${index}.ts`);
    const copy = [...many];
    assert.equal(searchPaths(many, "file").length, 50);
    assert.equal(searchPaths(many, "file", 5).length, 5);
    assert.deepEqual(many, copy);
});

test("ties resolve by shorter path then alphabetically for stable ordering", () => {
    assert.deepEqual(searchPaths(["b/x.ts", "a/x.ts", "x.ts"], "x.ts"), ["x.ts", "a/x.ts", "b/x.ts"]);
});
