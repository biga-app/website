import assert from "node:assert/strict";
import test from "node:test";

import type { StreamEvent } from "@biga/types/events";

import { createSequencer } from "@biga/viewer-core/pipeline/sequencer";

const checkpoint = (seq: number) => ({ type: "checkpoint", payload: { seq } }) as unknown as StreamEvent;
const snapshot = (timestamp: number) => ({ type: "snapshot", payload: { timestamp } }) as unknown as StreamEvent;
const ended = { type: "session_ended" } as unknown as StreamEvent;

function harness(maxPending?: number) {
    const applied: StreamEvent[] = [];
    let resyncs = 0;
    const sequencer = createSequencer({
        apply: (event) => applied.push(event),
        resynchronize: () => resyncs++,
        maxPending,
    });
    return { applied, sequencer, resyncs: () => resyncs };
}

test("initial load applies events newer than the fetched state", () => {
    const { applied, sequencer, resyncs } = harness();
    sequencer.push(snapshot(10));
    sequencer.push(checkpoint(1));
    sequencer.push(checkpoint(2));
    assert.deepEqual(applied, []);

    sequencer.resume({ checkpoints: [{ seq: 1 }], snapshot: { timestamp: 10 } });
    sequencer.push(checkpoint(2));
    sequencer.push(checkpoint(3));
    assert.deepEqual(applied, [checkpoint(2), checkpoint(3)]);
    assert.equal(resyncs(), 0);
});

test("reconnect discards events from the interrupted connection and catches up", () => {
    const { applied, sequencer, resyncs } = harness();
    sequencer.resume({ checkpoints: [], snapshot: null });
    sequencer.push(checkpoint(0));
    sequencer.pause();
    sequencer.push(checkpoint(1));
    sequencer.pause();
    sequencer.push(checkpoint(3));
    sequencer.push(snapshot(20));
    sequencer.push(checkpoint(4));
    sequencer.push(ended);
    assert.deepEqual(applied, [checkpoint(0)]);

    sequencer.resume({ checkpoints: [{ seq: 3 }], snapshot: { timestamp: 10 } });
    assert.deepEqual(applied, [checkpoint(0), snapshot(20), checkpoint(4), ended]);
    assert.equal(resyncs(), 0);
});

test("a checkpoint received ahead of an earlier save resynchronizes before applying new events", () => {
    const { applied, sequencer, resyncs } = harness();
    sequencer.push(checkpoint(2));
    sequencer.push(checkpoint(1));
    sequencer.push(snapshot(20));
    sequencer.resume({ checkpoints: [{ seq: 0 }], snapshot: null });
    assert.equal(resyncs(), 1);
    assert.deepEqual(applied, []);

    sequencer.push(checkpoint(3));
    sequencer.resume({ checkpoints: [{ seq: 2 }, { seq: 1 }], snapshot: { timestamp: 20 } });
    assert.deepEqual(applied, [checkpoint(3)]);
    assert.equal(resyncs(), 1);
});

test("a gap in a live stream triggers a resync and holds the gapped event", () => {
    const { applied, sequencer, resyncs } = harness();
    sequencer.resume({ checkpoints: [{ seq: 4 }], snapshot: null });
    sequencer.push(checkpoint(5));
    sequencer.push(checkpoint(7));
    assert.equal(resyncs(), 1);
    assert.deepEqual(applied, [checkpoint(5)]);
    sequencer.push(checkpoint(8));
    sequencer.resume({ checkpoints: [{ seq: 6 }], snapshot: null });
    assert.deepEqual(applied, [checkpoint(5), checkpoint(7), checkpoint(8)]);
});

test("duplicate and stale checkpoints and snapshots are dropped", () => {
    const { applied, sequencer } = harness();
    sequencer.resume({ checkpoints: [{ seq: 2 }], snapshot: { timestamp: 50 } });
    sequencer.push(checkpoint(2));
    sequencer.push(checkpoint(1));
    sequencer.push(snapshot(50));
    sequencer.push(snapshot(40));
    sequencer.push(checkpoint(3));
    sequencer.push(snapshot(60));
    assert.deepEqual(applied, [checkpoint(3), snapshot(60)]);
});

test("a backlog beyond the limit is dropped and forces a fresh resync instead of a replay", () => {
    const { applied, sequencer, resyncs } = harness(3);
    sequencer.pause();
    for (let seq = 1; seq <= 5; seq++) sequencer.push(checkpoint(seq));
    sequencer.resume({ checkpoints: [{ seq: 0 }], snapshot: null });
    assert.equal(resyncs(), 1);
    assert.deepEqual(applied, []);

    sequencer.push(checkpoint(9));
    sequencer.resume({ checkpoints: [{ seq: 8 }], snapshot: null });
    assert.deepEqual(applied, [checkpoint(9)]);
    assert.equal(resyncs(), 1);
});

test("a backlog exactly at the limit still replays", () => {
    const { applied, sequencer, resyncs } = harness(3);
    sequencer.pause();
    for (let seq = 1; seq <= 3; seq++) sequencer.push(checkpoint(seq));
    sequencer.resume({ checkpoints: [{ seq: 0 }], snapshot: null });
    assert.equal(resyncs(), 0);
    assert.deepEqual(applied, [checkpoint(1), checkpoint(2), checkpoint(3)]);
});
