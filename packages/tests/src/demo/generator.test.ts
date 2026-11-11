import assert from "node:assert/strict";
import test from "node:test";

import { editAt } from "@biga/demo/generate/edits";
import { generateProject, STACKS } from "@biga/demo/generate/project";
import { cleanSeed, randomSeed } from "@biga/demo/seed";

test("the same seed generates the same project, file for file", () => {
    assert.deepEqual(generateProject("a8f3k2"), generateProject("a8f3k2"));
});

test("different seeds generate different projects", () => {
    const names = new Set(Array.from({ length: 12 }, (_, index) => generateProject(`seed${index}`).name));
    assert.ok(names.size > 8);
});

test("every stack turns up across seeds", () => {
    const seen = new Set(Array.from({ length: 60 }, (_, index) => generateProject(`stack${index}`).stack));
    assert.equal(seen.size, STACKS.length);
});

test("a project has a realistic tree, a binary asset and something to hide", () => {
    const project = generateProject("tree1");
    const paths = Object.keys(project.files);
    assert.ok(paths.length >= 35 && paths.length <= 120);
    assert.ok(paths.includes("README.md"));
    assert.deepEqual(project.binary, ["assets/logo.png"]);
    assert.ok(project.rules.some((rule) => rule.locked));
    assert.ok(project.rules.some((rule) => !rule.locked && paths.some((path) => path.startsWith(rule.pattern))));
    for (const path of paths) assert.ok(project.files[path] !== undefined);
});

test("generated source reads like the stack it claims to be", () => {
    for (const stack of STACKS) {
        const project = generateProject(`read-${stack.id}`);
        const sample = Object.entries(project.files).find(([path]) => path.endsWith(`.${project.ext}`));
        assert.ok(sample, `${project.stack} has a source file`);
        assert.ok(sample[1].split("\n").length > 8);
    }
});

test("edits are a pure function of the seed, the tick and the files", () => {
    const project = generateProject("edits1");
    const files = new Map(Object.entries(project.files));
    for (let index = 0; index < 40; index++) {
        assert.deepEqual(editAt(project, files, index), editAt(project, files, index));
    }
});

test("every edit changes something and keeps the tree coherent when applied in order", () => {
    const project = generateProject("edits2");
    const files = new Map(Object.entries(project.files));
    const kinds = new Set<string>();
    for (let index = 0; index < 120; index++) {
        const edit = editAt(project, files, index);
        kinds.add(edit.label.split(" ")[0]!);
        const changed = Object.entries(edit.changes).filter(([path, next]) => files.get(path) !== (next ?? undefined));
        assert.ok(changed.length > 0, `edit ${index} changed nothing (${edit.label})`);
        for (const [path, next] of Object.entries(edit.changes)) {
            if (next === null) files.delete(path);
            else files.set(path, next);
        }
    }
    assert.deepEqual([...kinds].sort(), ["Added", "Deleted", "Renamed", "Updated"]);
});

test("seeds from links are cleaned and random seeds survive the cleaning", () => {
    assert.equal(cleanSeed("  A8F3-k2!! "), "a8f3k2");
    assert.equal(cleanSeed("x"), null);
    assert.equal(cleanSeed(null), null);
    const seed = randomSeed();
    assert.equal(cleanSeed(seed), seed);
});
