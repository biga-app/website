import assert from "node:assert/strict";
import test from "node:test";

import { baseToRef, isSameBase, refToBase } from "@biga/viewer-core/location/compare-base";

test("the session start maps to checkpoint 0's ref and back", () => {
    assert.equal(baseToRef({ kind: "start" }), "0");
    assert.deepEqual(refToBase("0"), { kind: "start" });
});

test("a checkpoint base maps to its sequence number and back", () => {
    assert.equal(baseToRef({ kind: "checkpoint", seq: 12 }), "12");
    assert.deepEqual(refToBase("12"), { kind: "checkpoint", seq: 12 });
});

test("checkpoint 0 and the session start are the same base", () => {
    assert.equal(isSameBase({ kind: "start" }, { kind: "checkpoint", seq: 0 }), true);
    assert.equal(isSameBase({ kind: "checkpoint", seq: 3 }, { kind: "checkpoint", seq: 3 }), true);
    assert.equal(isSameBase({ kind: "checkpoint", seq: 3 }, { kind: "checkpoint", seq: 4 }), false);
});

test("null only equals null", () => {
    assert.equal(isSameBase(null, null), true);
    assert.equal(isSameBase(null, { kind: "start" }), false);
    assert.equal(isSameBase({ kind: "start" }, null), false);
});
