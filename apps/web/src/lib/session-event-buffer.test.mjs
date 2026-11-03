import assert from "node:assert/strict";
import test from "node:test";

import { createSessionEventBuffer } from "./session-event-buffer.ts";

const checkpoint = (seq) => ({ type: "checkpoint", payload: { seq } });
const snapshot = (timestamp) => ({ type: "snapshot", payload: { timestamp } });
const ended = { type: "session_ended" };

test("initial load applies events newer than the fetched state", () => {
    const applied = [];
    const buffer = createSessionEventBuffer((event) => applied.push(event), () => assert.fail("unexpected resync"));

    buffer.push(snapshot(10));
    buffer.push(checkpoint(1));
    buffer.push(checkpoint(2));
    assert.deepEqual(applied, []);

    buffer.resume({ checkpoints: [{ seq: 1 }], snapshot: { timestamp: 10 } });
    buffer.push(checkpoint(2));
    buffer.push(checkpoint(3));
    assert.deepEqual(applied, [checkpoint(2), checkpoint(3)]);
});

test("reconnect discards events from the interrupted connection and catches up", () => {
    const applied = [];
    const buffer = createSessionEventBuffer((event) => applied.push(event), () => assert.fail("unexpected resync"));

    buffer.resume({ checkpoints: [], snapshot: null });
    buffer.push(checkpoint(0));
    buffer.pause();
    buffer.push(checkpoint(1));
    buffer.pause();
    buffer.push(checkpoint(3));
    buffer.push(snapshot(20));
    buffer.push(checkpoint(4));
    buffer.push(ended);
    assert.deepEqual(applied, [checkpoint(0)]);

    buffer.resume({ checkpoints: [{ seq: 3 }], snapshot: { timestamp: 10 } });
    assert.deepEqual(applied, [checkpoint(0), snapshot(20), checkpoint(4), ended]);
});

test("a checkpoint received ahead of an earlier save resynchronizes before applying new events", () => {
    const applied = [];
    let requests = 0;
    const buffer = createSessionEventBuffer((event) => applied.push(event), () => requests++);

    buffer.push(checkpoint(2));
    buffer.push(checkpoint(1));
    buffer.push(snapshot(20));
    buffer.resume({ checkpoints: [{ seq: 0 }], snapshot: null });
    assert.equal(requests, 1);
    assert.deepEqual(applied, []);

    buffer.push(checkpoint(3));
    buffer.resume({ checkpoints: [{ seq: 2 }, { seq: 1 }], snapshot: { timestamp: 20 } });
    assert.deepEqual(applied, [checkpoint(3)]);
    assert.equal(requests, 1);
});
