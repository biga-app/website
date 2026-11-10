import assert from "node:assert/strict";
import test from "node:test";

import { createConnectionStore } from "@biga/viewer-core/stores/connection-store";

test("a new connection store starts connecting with no error", () => {
    const state = createConnectionStore().getState();
    assert.equal(state.status, "connecting");
    assert.equal(state.unavailable, null);
});

test("setStatus replaces the status", () => {
    const store = createConnectionStore();
    store.getState().setStatus("live");
    assert.equal(store.getState().status, "live");
});

test("setUnavailable records the kind and moves to the unavailable status", () => {
    const store = createConnectionStore();
    store.getState().setUnavailable("not_found");
    assert.equal(store.getState().status, "unavailable");
    assert.equal(store.getState().unavailable, "not_found");
});

test("reset returns to the initial state", () => {
    const store = createConnectionStore();
    store.getState().setUnavailable("server");
    store.getState().reset();
    assert.equal(store.getState().status, "connecting");
    assert.equal(store.getState().unavailable, null);
});

test("two stores never share state", () => {
    const first = createConnectionStore();
    const second = createConnectionStore();
    first.getState().setStatus("ended");
    assert.equal(second.getState().status, "connecting");
});
