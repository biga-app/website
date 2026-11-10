import assert from "node:assert/strict";
import test from "node:test";

import { createSessionStore } from "@biga/viewer-core/stores/session-store";

import { makeSessionResponse } from "../fixtures/session.ts";

test("a new session store is empty and lazy", () => {
    const state = createSessionStore().getState();
    assert.equal(state.session, null);
    assert.equal(state.mode, "lazy");
});

test("hydrate stores the session and load mode", () => {
    const store = createSessionStore();
    const session = makeSessionResponse("active");
    store.getState().hydrate(session, "eager");
    assert.equal(store.getState().session, session);
    assert.equal(store.getState().mode, "eager");
});

test("reset clears the session", () => {
    const store = createSessionStore();
    store.getState().hydrate(makeSessionResponse(), "eager");
    store.getState().reset();
    assert.equal(store.getState().session, null);
    assert.equal(store.getState().mode, "lazy");
});
