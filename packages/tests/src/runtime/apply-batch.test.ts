import assert from "node:assert/strict";
import test from "node:test";

import type { Batch } from "@biga/types/pipeline";
import { applyBatch, type WritableStores } from "@biga/viewer-core/runtime/apply-batch";
import { buildTreeTable } from "@biga/viewer-core/pipeline/tree-table";
import { createConnectionStore } from "@biga/viewer-core/stores/connection-store";
import { createHistoryStore } from "@biga/viewer-core/stores/history-store";
import { createSessionStore } from "@biga/viewer-core/stores/session-store";
import { createTreeStore } from "@biga/viewer-core/stores/tree-store";
import { createWorkspaceStore } from "@biga/viewer-core/stores/workspace-store";

import { makeCheckpoint, makeSummary } from "../fixtures/checkpoints.ts";
import { hash } from "../fixtures/hash.ts";
import { makeSessionResponse } from "../fixtures/session.ts";
import { fileNode, rootNode } from "../fixtures/tree.ts";

function setup() {
    const stores: WritableStores = {
        connection: createConnectionStore(),
        session: createSessionStore(),
        tree: createTreeStore(),
        history: createHistoryStore(),
        workspace: createWorkspaceStore(),
    };
    const prefilled: Record<string, string>[] = [];
    let frames = 0;
    const nextFrame = () => {
        frames++;
        return Promise.resolve();
    };
    const apply = (batch: Batch) => applyBatch(stores, batch, { prefillBlobs: (contents) => prefilled.push(contents), nextFrame });
    return { stores, apply, prefilled, frames: () => frames };
}

function batch(overrides: Partial<Batch> = {}): Batch {
    return {
        id: 1,
        hydrate: null,
        table: null,
        patches: [],
        summaries: [],
        latest: null,
        touched: [],
        followTarget: null,
        status: null,
        ...overrides,
    };
}

const hydration = (overrides = {}) => ({
    reason: "initial" as const,
    session: makeSessionResponse(),
    mode: "eager" as const,
    table: buildTreeTable(rootNode([fileNode("a.ts")])),
    summaries: [makeSummary(0), makeSummary(1)],
    contents: { [hash("1")]: "body" },
    initial: makeCheckpoint(1),
    ...overrides,
});

test("a hydration fills the session, tree and history stores and prefills the blob cache", async () => {
    const { stores, apply, prefilled } = setup();
    await apply(batch({ hydrate: hydration() }));
    assert.equal(stores.session.getState().session?.id, "s1");
    assert.equal(stores.session.getState().mode, "eager");
    assert.deepEqual(stores.tree.getState().rows, ["a.ts"]);
    assert.deepEqual(stores.history.getState().checkpoints.map((summary) => summary.seq), [0, 1]);
    assert.ok(stores.history.getState().loaded.has(1));
    assert.deepEqual(prefilled, [{ [hash("1")]: "body" }]);
});

test("a hydration without contents or a tree skips those steps", async () => {
    const { stores, apply, prefilled } = setup();
    await apply(batch({ hydrate: hydration({ contents: null, table: null }) }));
    assert.deepEqual(prefilled, []);
    assert.deepEqual(stores.tree.getState().rows, []);
});

test("a hydration never asks the caller to follow a file", async () => {
    const { apply } = setup();
    assert.equal(await apply(batch({ hydrate: hydration(), followTarget: "a.ts" })), null);
});

test("live patches, summaries and touched paths update the stores and the follow target is returned", async () => {
    const { stores, apply } = setup();
    await apply(batch({ hydrate: hydration() }));
    const target = await apply(
        batch({
            id: 2,
            patches: [{ op: "upsert", path: "b.ts", hash: hash("2"), binary: false }],
            summaries: [makeSummary(2)],
            latest: makeCheckpoint(2),
            touched: ["b.ts"],
            followTarget: "b.ts",
        })
    );
    assert.equal(target, "b.ts");
    assert.deepEqual(stores.tree.getState().rows, ["a.ts", "b.ts"]);
    assert.deepEqual(stores.history.getState().checkpoints.map((summary) => summary.seq), [0, 1, 2]);
    assert.ok(stores.history.getState().loaded.has(2));
    assert.deepEqual([...stores.tree.getState().touched], ["b.ts"]);
});

test("a snapshot table replaces the tree and later patches apply on top of it", async () => {
    const { stores, apply } = setup();
    await apply(batch({ hydrate: hydration() }));
    await apply(
        batch({
            id: 2,
            table: buildTreeTable(rootNode([fileNode("fresh.ts")])),
            patches: [{ op: "upsert", path: "extra.ts", hash: hash("3"), binary: false }],
        })
    );
    assert.deepEqual(stores.tree.getState().rows, ["extra.ts", "fresh.ts"]);
});

test("status reaches the connection store even when nothing else changed", async () => {
    const { stores, apply } = setup();
    await apply(batch({ status: "reconnecting" }));
    assert.equal(stores.connection.getState().status, "reconnecting");
});

test("an empty batch changes nothing", async () => {
    const { stores, apply } = setup();
    const tree = stores.tree.getState();
    const history = stores.history.getState();
    assert.equal(await apply(batch()), null);
    assert.equal(stores.tree.getState(), tree);
    assert.equal(stores.history.getState(), history);
});

test("a table larger than a slice yields between frames and the tree changes only once, at the end", async () => {
    const { stores, apply, frames } = setup();
    const files = Array.from({ length: 20_000 }, (_, index) => fileNode(`f${String(index).padStart(5, "0")}.ts`));
    const before = stores.tree.getState().revision;
    await apply(batch({ hydrate: hydration({ table: buildTreeTable(rootNode(files)) }) }));
    assert.equal(frames(), 2);
    assert.equal(stores.tree.getState().revision, before + 1);
    assert.equal(stores.tree.getState().fileCount, 20_000);
});

test("a small table loads without yielding", async () => {
    const { apply, frames } = setup();
    await apply(batch({ hydrate: hydration() }));
    assert.equal(frames(), 0);
});

test("the session and history are hydrated in the same step that publishes the tree", async () => {
    const { stores, apply } = setup();
    const files = Array.from({ length: 20_000 }, (_, index) => fileNode(`f${String(index).padStart(5, "0")}.ts`));
    const seen: string[] = [];
    stores.session.subscribe(() => seen.push(`session:${stores.tree.getState().fileCount}`));
    await apply(batch({ hydrate: hydration({ table: buildTreeTable(rootNode(files)) }) }));
    assert.deepEqual(seen, ["session:0"]);
    assert.equal(stores.tree.getState().fileCount, 20_000);
});
