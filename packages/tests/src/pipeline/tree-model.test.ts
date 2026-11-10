import assert from "node:assert/strict";
import test from "node:test";

import {
    flattenTree,
    indexTree,
    insertFile,
    removeFile,
    sortTree,
    baseName,
    type CheckpointChange,
    type FileNode,
} from "@biga/types";

import { createTreeModel } from "@biga/viewer-core/pipeline/tree-model";
import { buildTreeTable, patchesFromChanges } from "@biga/viewer-core/pipeline/tree-table";

import { makeChange } from "../fixtures/checkpoints.ts";
import { hash } from "../fixtures/hash.ts";
import { rootNode } from "../fixtures/tree.ts";

type TreeModel = ReturnType<typeof createTreeModel>;

function prng(seed: number) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const NAMES = ["a", "B", "c", "D", "file1", "file10", "file2", "Readme.md", "é", "z", "_x", "9"];
const HASH = hash("f");

function pick<T>(random: () => number, items: readonly T[]): T {
    return items[Math.floor(random() * items.length)] as T;
}

function randomDirectory(random: () => number, path: string, depth: number): FileNode {
    const children: FileNode[] = [];
    const count = depth > 3 ? Math.floor(random() * 3) : Math.floor(random() * 6);
    const used = new Set<string>();
    for (let index = 0; index < count; index++) {
        const name = pick(random, NAMES);
        if (used.has(name)) continue;
        used.add(name);
        const childPath = path ? `${path}/${name}` : name;
        const roll = random();
        if (roll < 0.45 && depth < 5) children.push(randomDirectory(random, childPath, depth + 1));
        else if (roll < 0.52) children.push({ type: "directory", name, path: childPath, children: [], ignored: true });
        else children.push({ type: "file", name, path: childPath, size: Math.floor(random() * 5000), hash: HASH });
    }
    return { type: "directory", name: path ? baseName(path) : "", path, children };
}

function rowsOf(model: TreeModel): string[] {
    return model.rows().map((path) => {
        const entry = model.entry(path);
        return `${entry?.depth}:${entry?.kind === 0 ? "file" : "directory"}:${path}`;
    });
}

function referenceRows(root: FileNode, expanded: Set<string>): string[] {
    return flattenTree(root, expanded).map(({ node, depth }) => `${depth}:${node.type}:${node.path}`);
}

function directoriesOf(root: FileNode): string[] {
    const found: string[] = [];
    const visit = (node: FileNode) => {
        if (node.type !== "directory") return;
        if (node.path !== "" && !node.ignored) found.push(node.path);
        node.children.forEach(visit);
    };
    visit(root);
    return found;
}

function nodeKinds(root: FileNode): Map<string, "file" | "directory" | "ignored"> {
    const kinds = new Map<string, "file" | "directory" | "ignored">();
    const visit = (node: FileNode) => {
        if (node.path !== "") kinds.set(node.path, node.type === "file" ? "file" : node.ignored ? "ignored" : "directory");
        if (node.type === "directory") node.children.forEach(visit);
    };
    visit(root);
    return kinds;
}

function canAdd(path: string, kinds: Map<string, string>, touched: Set<string>): boolean {
    if (kinds.has(path)) return false;
    const segments = path.split("/");
    for (let length = 1; length < segments.length; length++) {
        const kind = kinds.get(segments.slice(0, length).join("/"));
        if (kind === "file" || kind === "ignored") return false;
    }
    for (const other of touched) {
        if (other === path || other.startsWith(`${path}/`) || path.startsWith(`${other}/`)) return false;
    }
    return true;
}

function filesOf(root: FileNode): string[] {
    return [...indexTree(root).keys()];
}

function referenceApply(root: FileNode, headPaths: Set<string>, change: CheckpointChange): FileNode {
    if (change.changeType === "deleted") {
        headPaths.delete(change.path);
        return removeFile(root, change.path);
    }
    if (change.changeType === "added" && !headPaths.has(change.path)) {
        headPaths.add(change.path);
        return insertFile(root, { type: "file", name: baseName(change.path), path: change.path, size: 0, hash: change.afterHash ?? "" });
    }
    return root;
}

test("a loaded table matches the reference order and depth for random trees and expansion states", () => {
    for (let seed = 1; seed <= 60; seed++) {
        const random = prng(seed);
        const root = sortTree(randomDirectory(random, "", 0));
        const model = createTreeModel();
        model.load(buildTreeTable(root));
        const expanded = new Set<string>();
        assert.deepEqual(rowsOf(model), referenceRows(root, expanded), `seed ${seed} collapsed`);

        const directories = directoriesOf(root);
        for (const path of directories) {
            if (random() < 0.5) continue;
            expanded.add(path);
            model.setExpanded(path, true);
            assert.deepEqual(rowsOf(model), referenceRows(root, expanded), `seed ${seed} expand ${path}`);
        }
        for (const path of [...expanded]) {
            if (random() < 0.5) continue;
            expanded.delete(path);
            model.setExpanded(path, false);
            assert.deepEqual(rowsOf(model), referenceRows(root, expanded), `seed ${seed} collapse ${path}`);
        }
    }
});

test("incremental patches stay equal to the reference sort, insert and remove", () => {
    for (let seed = 100; seed < 140; seed++) {
        const random = prng(seed);
        let root = sortTree(randomDirectory(random, "", 0));
        const headPaths = new Set(filesOf(root));
        const model = createTreeModel();
        model.load(buildTreeTable(root));
        const expanded = new Set<string>();
        for (const path of directoriesOf(root)) {
            expanded.add(path);
            model.setExpanded(path, true);
        }
        model.rows();

        for (let step = 0; step < 25; step++) {
            const changes: CheckpointChange[] = [];
            const touched = new Set<string>();
            const existing = [...headPaths];
            const record = (entry: CheckpointChange) => {
                if (touched.has(entry.path)) return;
                touched.add(entry.path);
                changes.push(entry);
            };
            for (let count = Math.ceil(random() * 4); count > 0; count--) {
                const roll = random();
                if (roll < 0.4 || existing.length === 0) {
                    const depth = 1 + Math.floor(random() * 3);
                    const segments = Array.from({ length: depth }, () => pick(random, NAMES));
                    const path = segments.join("/");
                    if (canAdd(path, nodeKinds(root), touched)) record(makeChange(path, "added"));
                } else if (roll < 0.7) {
                    record(makeChange(pick(random, existing), "modified"));
                } else {
                    record(makeChange(pick(random, existing), "deleted"));
                }
            }
            for (const entry of changes) root = referenceApply(root, headPaths, entry);
            model.apply(patchesFromChanges(changes));
            for (const path of directoriesOf(root)) {
                if (!expanded.has(path) && random() < 0.5) {
                    expanded.add(path);
                    model.setExpanded(path, true);
                }
            }
            assert.deepEqual(rowsOf(model), referenceRows(root, expanded), `seed ${seed} step ${step}`);
            assert.equal(model.fileCount, indexTree(root).size, `seed ${seed} step ${step} file count`);
        }
    }
});

test("a modified file updates its hash and binary flag without moving", () => {
    const model = createTreeModel();
    model.load(buildTreeTable(rootNode([{ type: "file", name: "a.ts", path: "a.ts", size: 5, hash: hash("1") }])));
    const before = model.rows();
    model.apply([{ op: "upsert", path: "a.ts", hash: hash("2"), binary: true }]);
    assert.deepEqual(model.rows(), before);
    assert.equal(model.entry("a.ts")?.hash, hash("2"));
    assert.equal(model.entry("a.ts")?.binary, true);
    assert.equal(model.entry("a.ts")?.size, 5);
});

test("a rename removes the old path and adds the new one", () => {
    const model = createTreeModel();
    model.apply(patchesFromChanges([makeChange("old/a.ts", "added")]));
    model.apply(patchesFromChanges([makeChange("new/a.ts", "renamed", "1", { oldPath: "old/a.ts" })]));
    assert.equal(model.entry("old/a.ts"), undefined);
    assert.ok(model.entry("new/a.ts"));
    assert.ok(model.entry("old"));
});

test("removing the last file keeps its directory, as the old store did", () => {
    const model = createTreeModel();
    model.apply(patchesFromChanges([makeChange("d/a.ts", "added")]));
    model.apply(patchesFromChanges([makeChange("d/a.ts", "deleted")]));
    assert.ok(model.entry("d"));
    assert.equal(model.fileCount, 0);
});

test("a new file lands in sorted position inside an expanded directory", () => {
    const model = createTreeModel();
    model.apply(patchesFromChanges([makeChange("src/a.ts", "added"), makeChange("src/c.ts", "added")]));
    model.setExpanded("src", true);
    model.rows();
    model.apply(patchesFromChanges([makeChange("src/b.ts", "added")]));
    assert.deepEqual(model.rows(), ["src", "src/a.ts", "src/b.ts", "src/c.ts"]);
});

test("collapse removes only the directory's visible descendants", () => {
    const model = createTreeModel();
    model.apply(patchesFromChanges([makeChange("a/x/1.ts", "added"), makeChange("a/2.ts", "added"), makeChange("b/3.ts", "added")]));
    model.setExpanded("a", true);
    model.setExpanded("a/x", true);
    model.setExpanded("b", true);
    assert.deepEqual(model.rows(), ["a", "a/x", "a/x/1.ts", "a/2.ts", "b", "b/3.ts"]);
    model.setExpanded("a", false);
    assert.deepEqual(model.rows(), ["a", "b", "b/3.ts"]);
    model.setExpanded("a", true);
    assert.deepEqual(model.rows(), ["a", "a/x", "a/x/1.ts", "a/2.ts", "b", "b/3.ts"]);
});

test("expandAncestors opens every directory above a path, top down", () => {
    const model = createTreeModel();
    model.apply(patchesFromChanges([makeChange("a/b/c/deep.ts", "added"), makeChange("z.ts", "added")]));
    model.rows();
    model.expandAncestors("a/b/c/deep.ts");
    assert.deepEqual(model.rows(), ["a", "a/b", "a/b/c", "a/b/c/deep.ts", "z.ts"]);
});

test("collapseAll closes everything", () => {
    const model = createTreeModel();
    model.apply(patchesFromChanges([makeChange("a/b.ts", "added")]));
    model.setExpanded("a", true);
    model.collapseAll();
    assert.deepEqual(model.rows(), ["a"]);
});

test("position reports the set size and place among siblings", () => {
    const model = createTreeModel();
    model.apply(patchesFromChanges([makeChange("d/b.ts", "added"), makeChange("d/a.ts", "added"), makeChange("d/c.ts", "added"), makeChange("top.ts", "added")]));
    assert.deepEqual(model.position("d/a.ts"), { setSize: 3, posInSet: 1 });
    assert.deepEqual(model.position("d/c.ts"), { setSize: 3, posInSet: 3 });
    assert.deepEqual(model.position("d"), { setSize: 2, posInSet: 1 });
    assert.deepEqual(model.position("top.ts"), { setSize: 2, posInSet: 2 });
    assert.equal(model.position("missing"), null);
});

test("ignored directories are listed but never expand", () => {
    const model = createTreeModel();
    model.load(buildTreeTable(rootNode([{ type: "directory", name: "dist", path: "dist", children: [], ignored: true }])));
    model.setExpanded("dist", true);
    assert.deepEqual(model.rows(), ["dist"]);
    assert.equal(model.expandedPaths().has("dist"), false);
});

test("a patch under a file, or over a directory, is ignored instead of corrupting the tree", () => {
    const model = createTreeModel();
    model.apply(patchesFromChanges([makeChange("a", "added"), makeChange("d/x.ts", "added")]));
    model.apply(patchesFromChanges([makeChange("a/child.ts", "added"), makeChange("d", "added")]));
    assert.equal(model.entry("a/child.ts"), undefined);
    assert.equal(model.entry("d")?.kind, 1);
    assert.deepEqual(model.rows(), ["d", "a"]);
});

test("revision advances only when something changed", () => {
    const model = createTreeModel();
    const start = model.revision;
    model.apply([{ op: "remove", path: "nothing" }]);
    assert.equal(model.revision, start);
    model.apply(patchesFromChanges([makeChange("a.ts", "added")]));
    assert.equal(model.revision, start + 1);
});

test("a 50,000 file tree loads and patches within the budget", () => {
    const directories: FileNode[] = [];
    for (let dir = 0; dir < 500; dir++) {
        const children: FileNode[] = [];
        for (let file = 0; file < 100; file++) {
            children.push({ type: "file", name: `f${file}.ts`, path: `d${dir}/f${file}.ts`, size: 100, hash: HASH });
        }
        directories.push({ type: "directory", name: `d${dir}`, path: `d${dir}`, children });
    }
    const root = rootNode(directories);

    const model = createTreeModel();
    const loadStart = performance.now();
    model.load(buildTreeTable(root));
    const loadMs = performance.now() - loadStart;
    assert.equal(model.fileCount, 50_000);
    assert.equal(model.rows().length, 500);

    for (let dir = 0; dir < 20; dir++) model.setExpanded(`d${dir}`, true);
    model.rows();
    const patches = Array.from({ length: 200 }, (_, index) => ({
        op: "upsert" as const,
        path: `d${index}/new${index}.ts`,
        hash: HASH,
        binary: false,
    }));
    const patchStart = performance.now();
    model.apply(patches);
    const patchMs = performance.now() - patchStart;
    const rowsStart = performance.now();
    const rows = model.rows();
    const rowsMs = performance.now() - rowsStart;

    assert.equal(model.fileCount, 50_200);
    assert.equal(rows.length, 500 + 20 * 101);
    assert.ok(loadMs < 2000, `load took ${loadMs}ms`);
    assert.ok(patchMs < 100, `patch took ${patchMs}ms`);
    assert.ok(rowsMs < 100, `rows took ${rowsMs}ms`);
});

test("filePaths lists every file and no directory", () => {
    const model = createTreeModel();
    model.apply(patchesFromChanges([makeChange("a/b.ts", "added"), makeChange("a/c/d.ts", "added"), makeChange("e.ts", "added")]));
    assert.deepEqual(model.filePaths().sort(), ["a/b.ts", "a/c/d.ts", "e.ts"]);
    model.apply(patchesFromChanges([makeChange("e.ts", "deleted")]));
    assert.deepEqual(model.filePaths().sort(), ["a/b.ts", "a/c/d.ts"]);
});
