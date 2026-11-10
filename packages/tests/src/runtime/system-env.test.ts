import assert from "node:assert/strict";
import test from "node:test";

import { abortableSleep, systemClock } from "@biga/viewer-core/runtime/system-env";

test("the system clock reports wall time", () => {
    const before = Date.now();
    const reading = systemClock.now();
    assert.ok(reading >= before && reading <= Date.now());
});

test("a system timer fires once and can be cancelled", async () => {
    let fired = 0;
    systemClock.setTimer(() => fired++, 5);
    const cancel = systemClock.setTimer(() => fired++, 5);
    cancel();
    await abortableSleep(30);
    assert.equal(fired, 1);
});

test("abortableSleep waits for the delay", async () => {
    const started = Date.now();
    await abortableSleep(30);
    assert.ok(Date.now() - started >= 25);
});

test("abortableSleep resolves immediately when aborted mid-wait", async () => {
    const controller = new AbortController();
    const started = Date.now();
    const sleeping = abortableSleep(5000, controller.signal);
    setTimeout(() => controller.abort(), 10);
    await sleeping;
    assert.ok(Date.now() - started < 1000);
});
