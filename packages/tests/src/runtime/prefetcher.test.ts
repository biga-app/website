import assert from "node:assert/strict";
import test from "node:test";

import { createPrefetcher } from "@biga/viewer-core/runtime/prefetcher";

import { createFakeClock } from "../fixtures/clock.ts";

function harness(concurrency = 4) {
    const fake = createFakeClock();
    const started: string[] = [];
    const finish = new Map<string, () => void>();
    const fail = new Map<string, () => void>();
    const prefetcher = createPrefetcher({
        clock: fake.clock,
        dwellMs: 80,
        concurrency,
        run: (path) => {
            started.push(path);
            return new Promise((resolve, reject) => {
                finish.set(path, () => resolve(undefined));
                fail.set(path, () => reject(new Error("failed")));
            });
        },
    });
    return { prefetcher, started, finish, fail, advance: fake.advance };
}

test("a hover starts a prefetch only after the dwell time", () => {
    const { prefetcher, started, advance } = harness();
    prefetcher.hover("a.ts");
    advance(79);
    assert.deepEqual(started, []);
    advance(1);
    assert.deepEqual(started, ["a.ts"]);
});

test("leaving the row before the dwell ends cancels the prefetch", () => {
    const { prefetcher, started, advance } = harness();
    prefetcher.hover("a.ts");
    advance(40);
    prefetcher.leave("a.ts");
    advance(200);
    assert.deepEqual(started, []);
});

test("leaving a different row does not cancel the pending one", () => {
    const { prefetcher, started, advance } = harness();
    prefetcher.hover("a.ts");
    prefetcher.leave("b.ts");
    advance(80);
    assert.deepEqual(started, ["a.ts"]);
});

test("moving to another row restarts the dwell for that row only", () => {
    const { prefetcher, started, advance } = harness();
    prefetcher.hover("a.ts");
    advance(60);
    prefetcher.hover("b.ts");
    advance(60);
    assert.deepEqual(started, []);
    advance(20);
    assert.deepEqual(started, ["b.ts"]);
});

test("hovering the same row again keeps the original dwell timer", () => {
    const { prefetcher, started, advance } = harness();
    prefetcher.hover("a.ts");
    advance(60);
    prefetcher.hover("a.ts");
    advance(20);
    assert.deepEqual(started, ["a.ts"]);
});

test("no more than the concurrency limit run at once and the rest start as slots free up", async () => {
    const { prefetcher, started, finish, advance } = harness(2);
    for (const path of ["a.ts", "b.ts", "c.ts"]) {
        prefetcher.hover(path);
        advance(80);
    }
    assert.deepEqual(started, ["a.ts", "b.ts"]);
    finish.get("a.ts")?.();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    assert.deepEqual(started, ["a.ts", "b.ts", "c.ts"]);
});

test("a failed prefetch frees its slot without surfacing an error", async () => {
    const { prefetcher, started, fail, advance } = harness(1);
    for (const path of ["a.ts", "b.ts"]) {
        prefetcher.hover(path);
        advance(80);
    }
    fail.get("a.ts")?.();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    assert.deepEqual(started, ["a.ts", "b.ts"]);
});
