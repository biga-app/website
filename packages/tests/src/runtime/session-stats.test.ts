import assert from "node:assert/strict";
import test from "node:test";

import type { Checkpoint, CheckpointSummary } from "@biga/types/checkpoint";
import {
    bucketActivity,
    bucketSize,
    formatBytes,
    languageBreakdown,
    topChangedFiles,
    totalBytes,
} from "@biga/viewer-core/runtime/session-stats";

const T0 = Date.parse("2026-01-01T10:00:00Z");

function summary(seq: number, minutes: number, additions = 1, deletions = 0): CheckpointSummary {
    return {
        sessionId: "s",
        seq,
        label: `Save #${seq}`,
        createdAt: new Date(T0 + minutes * 60_000).toISOString(),
        filesChanged: 1,
        additions,
        deletions,
    };
}

function checkpoint(seq: number, changes: { path: string; additions: number; deletions: number }[]): Checkpoint {
    return {
        ...summary(seq, seq),
        changes: changes.map((change) => ({ ...change, changeType: "modified" as const, beforeHash: null, afterHash: null })),
    };
}

test("bucket size grows through round steps with the span", () => {
    assert.equal(bucketSize(10 * 60_000), 60_000);
    assert.equal(bucketSize(60 * 60_000), 5 * 60_000);
    assert.equal(bucketSize(10 * 24 * 60 * 60_000), 24 * 60 * 60_000);
    assert.equal(bucketSize(300 * 24 * 60 * 60_000), 30 * 24 * 60 * 60_000);
});

test("no checkpoints make no buckets", () => {
    assert.deepEqual(bucketActivity([]), []);
});

test("saves are counted into the bucket of their time and the totals add up", () => {
    const checkpoints = [summary(1, 0, 2, 1), summary(2, 1, 3, 0), summary(3, 90, 5, 4)];
    const buckets = bucketActivity(checkpoints);
    assert.equal(buckets.reduce((sum, bucket) => sum + bucket.saves, 0), 3);
    assert.equal(buckets.reduce((sum, bucket) => sum + bucket.additions, 0), 10);
    assert.equal(buckets.reduce((sum, bucket) => sum + bucket.deletions, 0), 5);
    assert.equal(buckets[0]?.saves, 2);
    assert.equal(buckets.at(-1)?.saves, 1);
    for (let index = 1; index < buckets.length; index++) {
        assert.equal(buckets[index]?.start, buckets[index - 1]?.end);
    }
});

test("a single checkpoint still gets one bucket", () => {
    const buckets = bucketActivity([summary(1, 0)]);
    assert.equal(buckets.length, 1);
    assert.equal(buckets[0]?.saves, 1);
});

test("the most changed files come first, ties broken by lines then path", () => {
    const files = topChangedFiles(
        [
            checkpoint(1, [{ path: "a.ts", additions: 1, deletions: 0 }, { path: "b.ts", additions: 9, deletions: 0 }]),
            checkpoint(2, [{ path: "a.ts", additions: 1, deletions: 1 }, { path: "c.ts", additions: 1, deletions: 0 }]),
        ],
        2
    );
    assert.deepEqual(files.map((file) => file.path), ["a.ts", "b.ts"]);
    assert.deepEqual(files[0], { path: "a.ts", changes: 2, additions: 2, deletions: 1 });
});

test("languages are ranked by file count and the tail is folded into other", () => {
    const language = (path: string) => (path.endsWith(".ts") ? "typescript" : path.endsWith(".go") ? "go" : path.endsWith(".md") ? "markdown" : "plaintext");
    const files = [
        { path: "a.ts", size: 10 },
        { path: "b.ts", size: 20 },
        { path: "c.go", size: 100 },
        { path: "d.md", size: 5 },
        { path: "e.txt", size: 1 },
    ];
    assert.deepEqual(languageBreakdown(files, language, 10).map((share) => share.language), ["typescript", "go", "markdown", "plaintext"]);
    const folded = languageBreakdown(files, language, 3);
    assert.deepEqual(folded.map((share) => share.language), ["typescript", "go", "other"]);
    assert.deepEqual(folded[2], { language: "other", files: 2, bytes: 6 });
});

test("sizes add up and print in readable units", () => {
    assert.equal(totalBytes([{ path: "a", size: 3 }, { path: "b", size: 4 }]), 7);
    assert.equal(formatBytes(512), "512 B");
    assert.equal(formatBytes(1536), "1.5 KB");
    assert.equal(formatBytes(5 * 1024 * 1024), "5.0 MB");
    assert.equal(formatBytes(250 * 1024 * 1024), "250 MB");
});
