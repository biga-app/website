import assert from "node:assert/strict";
import test from "node:test";

import type { Batch, Hydration } from "@biga/types/pipeline";
import { createCoalescer } from "@biga/viewer-core/pipeline/coalescer";
import { buildTreeTable } from "@biga/viewer-core/pipeline/tree-table";

import { makeChange, makeCheckpoint } from "../fixtures/checkpoints.ts";
import { createFakeClock } from "../fixtures/clock.ts";
import { hash } from "../fixtures/hash.ts";
import { makeSessionResponse } from "../fixtures/session.ts";

function harness(minIntervalMs = 50) {
    const fake = createFakeClock();
    const sent: Batch[] = [];
    const coalescer = createCoalescer({ send: (batch) => sent.push(batch), clock: fake.clock, minIntervalMs });
    const release = (id: number) => {
        coalescer.ack(id);
        fake.advance(minIntervalMs);
    };
    return { coalescer, sent, advance: fake.advance, release, timerCount: fake.timerCount };
}

function hydration(overrides: Partial<Hydration> = {}): Hydration {
    return {
        reason: "initial",
        contents: null,
        initial: null,
        session: makeSessionResponse(),
        mode: "lazy",
        table: null,
        summaries: [],
        ...overrides,
    };
}

test("the first event is sent immediately", () => {
    const { coalescer, sent } = harness();
    coalescer.checkpoint(makeCheckpoint(1, [makeChange("a.ts", "added")]));
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.id, 1);
});

test("nothing more is sent until the previous batch is acknowledged, and content keeps merging", () => {
    const { coalescer, sent, advance } = harness();
    coalescer.checkpoint(makeCheckpoint(1, [makeChange("a.ts", "added")]));
    for (let seq = 2; seq <= 6; seq++) {
        advance(100);
        coalescer.checkpoint(makeCheckpoint(seq, [makeChange("a.ts", "modified", String(seq))]));
    }
    assert.equal(sent.length, 1);
    coalescer.ack(1);
    assert.equal(sent.length, 2);
    assert.deepEqual(sent[1]?.summaries.map((summary) => summary.seq), [2, 3, 4, 5, 6]);
    assert.deepEqual(sent[1]?.patches, [{ op: "upsert", path: "a.ts", hash: hash("6"), binary: false }]);
});

test("an acknowledgement inside the minimum interval delays the next batch to the interval's end", () => {
    const { coalescer, sent, advance, timerCount } = harness(50);
    coalescer.checkpoint(makeCheckpoint(1, [makeChange("a.ts", "added")]));
    coalescer.checkpoint(makeCheckpoint(2, [makeChange("b.ts", "added")]));
    advance(10);
    coalescer.ack(1);
    assert.equal(sent.length, 1);
    assert.equal(timerCount(), 1);
    advance(39);
    assert.equal(sent.length, 1);
    advance(1);
    assert.equal(sent.length, 2);
    assert.equal(timerCount(), 0);
});

test("acknowledging an unknown batch id is ignored", () => {
    const { coalescer, sent } = harness();
    coalescer.checkpoint(makeCheckpoint(1, [makeChange("a.ts", "added")]));
    coalescer.checkpoint(makeCheckpoint(2, [makeChange("b.ts", "added")]));
    coalescer.ack(99);
    assert.equal(sent.length, 1);
});

test("per path the last change wins: modified runs, add then delete, delete then add", () => {
    const { coalescer, sent, release } = harness();
    coalescer.status("live");
    coalescer.checkpoint(
        makeCheckpoint(1, [
            makeChange("m.ts", "modified", "1"),
            makeChange("gone.ts", "added"),
            makeChange("back.ts", "deleted"),
        ])
    );
    release(1);
    coalescer.checkpoint(makeCheckpoint(2, [makeChange("m.ts", "modified", "2")]));
    coalescer.checkpoint(makeCheckpoint(3, [makeChange("gone.ts", "deleted")]));
    coalescer.checkpoint(makeCheckpoint(4, [makeChange("back.ts", "added", "9")]));
    coalescer.checkpoint(makeCheckpoint(5, [makeChange("m.ts", "modified", "3")]));
    release(2);
    const merged = sent[2]?.patches ?? [];
    assert.deepEqual(
        [...merged].sort((a, b) => a.path.localeCompare(b.path)),
        [
            { op: "upsert", path: "back.ts", hash: hash("9"), binary: false },
            { op: "remove", path: "gone.ts" },
            { op: "upsert", path: "m.ts", hash: hash("3"), binary: false },
        ]
    );
});

test("a snapshot drops earlier patches and keeps later ones", () => {
    const { coalescer, sent, release } = harness();
    coalescer.checkpoint(makeCheckpoint(1, [makeChange("x.ts", "added")]));
    coalescer.checkpoint(makeCheckpoint(2, [makeChange("old.ts", "added")]));
    const table = buildTreeTable({ type: "directory", name: "", path: "", children: [] });
    coalescer.snapshot(table);
    coalescer.checkpoint(makeCheckpoint(3, [makeChange("new.ts", "added")]));
    release(1);
    const batch = sent[1];
    assert.equal(batch?.table, table);
    assert.deepEqual(batch?.patches.map((patch) => patch.path), ["new.ts"]);
    assert.deepEqual(batch?.summaries.map((summary) => summary.seq), [2, 3]);
});

test("many checkpoints keep every summary but carry only the newest change list", () => {
    const { coalescer, sent, release } = harness();
    coalescer.checkpoint(makeCheckpoint(1, [makeChange("a.ts", "added")]));
    for (let seq = 2; seq <= 4; seq++) coalescer.checkpoint(makeCheckpoint(seq, [makeChange(`f${seq}.ts`, "added")]));
    release(1);
    const batch = sent[1];
    assert.equal(batch?.summaries.length, 3);
    assert.equal(batch?.latest?.seq, 4);
    assert.equal("changes" in (batch?.summaries[0] ?? {}), false);
});

test("touched paths are deduplicated across checkpoints", () => {
    const { coalescer, sent, release } = harness();
    coalescer.checkpoint(makeCheckpoint(1, [makeChange("a.ts", "added")]));
    coalescer.checkpoint(makeCheckpoint(2, [makeChange("a.ts", "modified"), makeChange("b.ts", "added")]));
    coalescer.checkpoint(makeCheckpoint(3, [makeChange("b.ts", "modified")]));
    release(1);
    assert.deepEqual([...(sent[1]?.touched ?? [])].sort(), ["a.ts", "b.ts"]);
});

test("the follow target is the first viewable change of the newest checkpoint that has one", () => {
    const { coalescer, sent, release } = harness();
    coalescer.checkpoint(makeCheckpoint(1, [makeChange("seed.ts", "added")]));
    coalescer.checkpoint(makeCheckpoint(2, [makeChange("gone.ts", "deleted"), makeChange("img.png", "added", "1", { binary: true }), makeChange("pick.ts", "modified")]));
    coalescer.checkpoint(makeCheckpoint(3, [makeChange("only-deleted.ts", "deleted")]));
    release(1);
    assert.equal(sent[1]?.followTarget, "pick.ts");
    release(2);
    coalescer.checkpoint(makeCheckpoint(4, [makeChange("only-deleted.ts", "deleted")]));
    assert.equal(sent[2]?.followTarget, null);
});

test("hydration discards pending changes and later events layer on top", () => {
    const { coalescer, sent, release } = harness();
    coalescer.checkpoint(makeCheckpoint(1, [makeChange("a.ts", "added")]));
    coalescer.checkpoint(makeCheckpoint(2, [makeChange("stale.ts", "added")]));
    const hydrate = hydration({ table: buildTreeTable({ type: "directory", name: "", path: "", children: [] }) });
    coalescer.hydrate(hydrate);
    coalescer.checkpoint(makeCheckpoint(3, [makeChange("fresh.ts", "added")]));
    release(1);
    const batch = sent[1];
    assert.equal(batch?.hydrate, hydrate);
    assert.deepEqual(batch?.patches.map((patch) => patch.path), ["fresh.ts"]);
    assert.deepEqual(batch?.summaries.map((summary) => summary.seq), [3]);
});

test("a snapshot arriving after hydration replaces the hydration's table", () => {
    const { coalescer, sent, release } = harness();
    coalescer.checkpoint(makeCheckpoint(1, [makeChange("a.ts", "added")]));
    coalescer.hydrate(hydration());
    const fresh = buildTreeTable({ type: "directory", name: "", path: "", children: [] });
    coalescer.snapshot(fresh);
    release(1);
    assert.equal(sent[1]?.hydrate?.table, fresh);
    assert.equal(sent[1]?.table, null);
});

test("the latest status is delivered even with no tree changes", () => {
    const { coalescer, sent, release } = harness();
    coalescer.status("live");
    coalescer.status("reconnecting");
    coalescer.status("offline");
    release(1);
    assert.equal(sent[1]?.status, "offline");
    assert.deepEqual(sent[1]?.patches, []);
});

test("dispose cancels the timer and drops pending work", () => {
    const { coalescer, sent, advance, timerCount } = harness();
    coalescer.checkpoint(makeCheckpoint(1, [makeChange("a.ts", "added")]));
    coalescer.checkpoint(makeCheckpoint(2, [makeChange("b.ts", "added")]));
    coalescer.ack(1);
    assert.equal(timerCount(), 1);
    coalescer.dispose();
    advance(1000);
    assert.equal(sent.length, 1);
    assert.equal(timerCount(), 0);
});
