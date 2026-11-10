import assert from "node:assert/strict";
import test from "node:test";

import { createWorkspaceStore } from "@biga/viewer-core/stores/workspace-store";

function withTabs(...paths: string[]) {
    const store = createWorkspaceStore();
    for (const path of paths) store.getState().openTab(path);
    return store;
}

test("a new workspace has no tabs, the explorer view and no paused follow", () => {
    const state = createWorkspaceStore().getState();
    assert.deepEqual(state.tabs, []);
    assert.equal(state.sidebarView, "explorer");
    assert.equal(state.pausedFollow, null);
});

test("openTab appends once and never duplicates", () => {
    const store = withTabs("a.ts", "b.ts");
    const before = store.getState();
    store.getState().openTab("a.ts");
    assert.equal(store.getState(), before);
    assert.deepEqual(store.getState().tabs, ["a.ts", "b.ts"]);
});

test("closing a tab returns the tab to show next: the one that slid into its place, else the previous", () => {
    const store = withTabs("a.ts", "b.ts", "c.ts");
    assert.equal(store.getState().closeTab("b.ts"), "c.ts");
    assert.equal(store.getState().closeTab("c.ts"), "a.ts");
    assert.equal(store.getState().closeTab("a.ts"), null);
    assert.deepEqual(store.getState().tabs, []);
});

test("closing a tab that is not open changes nothing", () => {
    const store = withTabs("a.ts");
    assert.equal(store.getState().closeTab("zzz.ts"), null);
    assert.deepEqual(store.getState().tabs, ["a.ts"]);
});

test("closeOthers keeps only the given tab and closeAll empties the list", () => {
    const store = withTabs("a.ts", "b.ts", "c.ts");
    store.getState().closeOthers("b.ts");
    assert.deepEqual(store.getState().tabs, ["b.ts"]);
    store.getState().closeAll();
    assert.deepEqual(store.getState().tabs, []);
});

test("the sidebar view can be switched", () => {
    const store = createWorkspaceStore();
    store.getState().setSidebarView("timeline");
    assert.equal(store.getState().sidebarView, "timeline");
});

test("pausing follow counts every missed change and remembers the latest target", () => {
    const store = createWorkspaceStore();
    store.getState().pauseFollow("a.ts");
    store.getState().pauseFollow("b.ts");
    assert.deepEqual(store.getState().pausedFollow, { target: "b.ts", count: 2 });
    store.getState().resumeFollow();
    assert.equal(store.getState().pausedFollow, null);
});

test("reset restores the initial workspace", () => {
    const store = withTabs("a.ts");
    store.getState().setSidebarView("timeline");
    store.getState().pauseFollow("a.ts");
    store.getState().reset();
    assert.deepEqual(store.getState().tabs, []);
    assert.equal(store.getState().sidebarView, "explorer");
    assert.equal(store.getState().pausedFollow, null);
});
