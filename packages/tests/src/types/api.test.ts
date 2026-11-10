import assert from "node:assert/strict";
import test from "node:test";

import { ApiRequestError } from "@biga/types";

test("a request error carries its kind, status and retry delay", () => {
    const error = new ApiRequestError("rate_limited", "slow down", 429, 2000);
    assert.equal(error.kind, "rate_limited");
    assert.equal(error.message, "slow down");
    assert.equal(error.status, 429);
    assert.equal(error.retryAfterMs, 2000);
});

test("status and retry delay default to null", () => {
    const error = new ApiRequestError("network", "offline");
    assert.equal(error.status, null);
    assert.equal(error.retryAfterMs, null);
});

test("it is a real Error with a stable name", () => {
    const error = new ApiRequestError("server", "boom");
    assert.ok(error instanceof Error);
    assert.ok(error instanceof ApiRequestError);
    assert.equal(error.name, "ApiRequestError");
});
