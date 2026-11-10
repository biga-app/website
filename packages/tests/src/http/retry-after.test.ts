import assert from "node:assert/strict";
import test from "node:test";

import { parseRetryAfter } from "@biga/viewer-core/http/retry-after";

test("whole and fractional seconds convert to milliseconds", () => {
    assert.equal(parseRetryAfter("3"), 3000);
    assert.equal(parseRetryAfter("0"), 0);
    assert.equal(parseRetryAfter("1.5"), 1500);
});

test("long waits are capped at 30 seconds", () => {
    assert.equal(parseRetryAfter("30"), 30000);
    assert.equal(parseRetryAfter("31"), 30000);
    assert.equal(parseRetryAfter("9999"), 30000);
});

test("a missing, negative or non-numeric header yields null", () => {
    assert.equal(parseRetryAfter(null), null);
    assert.equal(parseRetryAfter("-1"), null);
    assert.equal(parseRetryAfter("soon"), null);
    assert.equal(parseRetryAfter("Infinity"), null);
    assert.equal(parseRetryAfter("NaN"), null);
});
