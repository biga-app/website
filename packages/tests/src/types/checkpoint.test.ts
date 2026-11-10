import assert from "node:assert/strict";
import test from "node:test";

import { summarizeCheckpoint } from "@biga/types/checkpoint";

import { makeChange, makeCheckpoint, TIME } from "../fixtures/checkpoints.ts";

test("summarizeCheckpoint copies the list fields and drops the change list", () => {
    const summary = summarizeCheckpoint(makeCheckpoint(4, [makeChange("a.ts", "added")]));
    assert.deepEqual(summary, {
        sessionId: "s1",
        seq: 4,
        label: "#4",
        createdAt: TIME,
        filesChanged: 1,
        additions: 1,
        deletions: 0,
    });
    assert.equal("changes" in summary, false);
});

test("summarizeCheckpoint keeps the named flag only when the checkpoint has one", () => {
    assert.equal("named" in summarizeCheckpoint(makeCheckpoint(1)), false);
    assert.equal(summarizeCheckpoint({ ...makeCheckpoint(1), named: true }).named, true);
    assert.equal(summarizeCheckpoint({ ...makeCheckpoint(1), named: false }).named, false);
});
