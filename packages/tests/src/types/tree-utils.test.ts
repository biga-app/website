import assert from "node:assert/strict";
import test from "node:test";

import { firstFilePath, firstViewableChange, preferredFilePath } from "@biga/types/tree-utils";

import { directoryNode, fileNode, rootNode } from "../fixtures/tree.ts";

test("firstFilePath picks the lexicographically smallest file path at any depth", () => {
    const tree = rootNode([fileNode("z.ts"), directoryNode("src", [fileNode("src/m.ts"), fileNode("src/b.ts")]), fileNode("b.ts")]);
    assert.equal(firstFilePath(tree), "b.ts");
});

test("firstFilePath is undefined for a tree with no files", () => {
    assert.equal(firstFilePath(rootNode([])), undefined);
    assert.equal(firstFilePath(rootNode([directoryNode("empty", [])])), undefined);
});

test("preferredFilePath opens a root README before anything else", () => {
    const tree = rootNode([fileNode("a.ts"), fileNode("README.md")]);
    assert.equal(preferredFilePath(tree), "README.md");
});

test("README matching ignores case and accepts the common extensions", () => {
    for (const name of ["readme", "Readme.md", "README.mdx", "readme.txt", "README.rst", "readme.markdown"]) {
        assert.equal(preferredFilePath(rootNode([fileNode("a.ts"), fileNode(name)])), name, name);
    }
});

test("only a root-level, text README counts", () => {
    const nested = rootNode([fileNode("b.ts"), directoryNode("docs", [fileNode("docs/README.md")])]);
    assert.equal(preferredFilePath(nested), "b.ts");
    const binary = rootNode([fileNode("A.ts"), fileNode("README.md", { binary: true })]);
    assert.equal(preferredFilePath(binary), "A.ts");
    assert.equal(preferredFilePath(rootNode([fileNode("A.ts"), fileNode("README.pdf")])), "A.ts");
});

test("preferredFilePath falls back to the first file", () => {
    assert.equal(preferredFilePath(rootNode([fileNode("z.ts"), fileNode("a.ts")])), "a.ts");
    assert.equal(preferredFilePath(rootNode([])), undefined);
});

test("firstViewableChange skips deleted and binary changes", () => {
    assert.equal(
        firstViewableChange([
            { path: "gone.ts", changeType: "deleted" },
            { path: "img.png", changeType: "added", binary: true },
            { path: "keep.ts", changeType: "modified" },
            { path: "later.ts", changeType: "added" },
        ]),
        "keep.ts"
    );
});

test("firstViewableChange is undefined when nothing can be shown", () => {
    assert.equal(firstViewableChange([]), undefined);
    assert.equal(firstViewableChange([{ path: "gone.ts", changeType: "deleted" }]), undefined);
    assert.equal(firstViewableChange([{ path: "img.png", changeType: "modified", binary: true }]), undefined);
});
