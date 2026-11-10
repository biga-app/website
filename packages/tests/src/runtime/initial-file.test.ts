import assert from "node:assert/strict";
import test from "node:test";

import type { TreeReader } from "@biga/types/stores";
import { pickInitialFile } from "@biga/viewer-core/runtime/initial-file";

function reader(files: Record<string, { binary?: boolean }>): TreeReader {
    return {
        filePaths: () => Object.keys(files),
        entry: (path) => (path in files ? ({ path, binary: Boolean(files[path]?.binary) } as ReturnType<TreeReader["entry"]>) : undefined),
        position: () => null,
        expandedPaths: () => new Set(),
    };
}

test("a root README is opened first", () => {
    assert.equal(pickInitialFile(reader({ "a.ts": {}, "README.md": {}, "docs/README.md": {} })), "README.md");
});

test("README matching ignores case and common extensions", () => {
    assert.equal(pickInitialFile(reader({ "a.ts": {}, readme: {} })), "readme");
    assert.equal(pickInitialFile(reader({ "a.ts": {}, "Readme.MD": {} })), "Readme.MD");
});

test("a binary or nested README does not count", () => {
    assert.equal(pickInitialFile(reader({ "A.ts": {}, "README.md": { binary: true } })), "A.ts");
    assert.equal(pickInitialFile(reader({ "b.ts": {}, "docs/README.md": {} })), "b.ts");
});

test("without a README the lexicographically first file wins", () => {
    assert.equal(pickInitialFile(reader({ "z.ts": {}, "src/a.ts": {}, "m.ts": {} })), "m.ts");
});

test("an empty tree has no initial file", () => {
    assert.equal(pickInitialFile(reader({})), undefined);
});
