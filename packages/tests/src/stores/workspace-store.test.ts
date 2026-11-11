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
    assert.deepEqual(state.groups, [[], []]);
    assert.equal(state.focused, 0);
    assert.deepEqual(state.closed, []);
    assert.equal(state.sidebarView, "explorer");
    assert.equal(state.pausedFollow, null);
});

test("openTab appends once and never duplicates", () => {
    const store = withTabs("a.ts", "b.ts");
    const before = store.getState();
    store.getState().openTab("a.ts");
    assert.equal(store.getState(), before);
    assert.deepEqual(store.getState().groups[0], ["a.ts", "b.ts"]);
});

test("each group keeps its own tabs", () => {
    const store = withTabs("a.ts");
    store.getState().openTab("a.ts", 1);
    store.getState().openTab("b.ts", 1);
    assert.deepEqual(store.getState().groups, [["a.ts"], ["a.ts", "b.ts"]]);
    store.getState().closeTab("a.ts", 1);
    assert.deepEqual(store.getState().groups, [["a.ts"], ["b.ts"]]);
});

test("closing a tab returns the tab to show next: the one that slid into its place, else the previous", () => {
    const store = withTabs("a.ts", "b.ts", "c.ts");
    assert.equal(store.getState().closeTab("b.ts"), "c.ts");
    assert.equal(store.getState().closeTab("c.ts"), "a.ts");
    assert.equal(store.getState().closeTab("a.ts"), null);
    assert.deepEqual(store.getState().groups[0], []);
});

test("closing a tab that is not open changes nothing", () => {
    const store = withTabs("a.ts");
    assert.equal(store.getState().closeTab("zzz.ts"), null);
    assert.deepEqual(store.getState().groups[0], ["a.ts"]);
    assert.deepEqual(store.getState().closed, []);
});

test("closeOthers keeps only the given tab and closeAll empties the list", () => {
    const store = withTabs("a.ts", "b.ts", "c.ts");
    store.getState().closeOthers("b.ts");
    assert.deepEqual(store.getState().groups[0], ["b.ts"]);
    store.getState().closeAll();
    assert.deepEqual(store.getState().groups[0], []);
});

test("closeToRight drops every tab after the given one", () => {
    const store = withTabs("a.ts", "b.ts", "c.ts", "d.ts");
    store.getState().closeToRight("b.ts");
    assert.deepEqual(store.getState().groups[0], ["a.ts", "b.ts"]);
    store.getState().closeToRight("zzz.ts");
    assert.deepEqual(store.getState().groups[0], ["a.ts", "b.ts"]);
});

test("closeAll with a group leaves the other group alone", () => {
    const store = withTabs("a.ts");
    store.getState().openTab("b.ts", 1);
    store.getState().closeAll(1);
    assert.deepEqual(store.getState().groups, [["a.ts"], []]);
});

test("moveTab reorders within a group and clamps the target index", () => {
    const store = withTabs("a.ts", "b.ts", "c.ts");
    store.getState().moveTab("a.ts", 2);
    assert.deepEqual(store.getState().groups[0], ["b.ts", "c.ts", "a.ts"]);
    store.getState().moveTab("a.ts", -5);
    assert.deepEqual(store.getState().groups[0], ["a.ts", "b.ts", "c.ts"]);
    store.getState().moveTab("a.ts", 99);
    assert.deepEqual(store.getState().groups[0], ["b.ts", "c.ts", "a.ts"]);
    store.getState().moveTab("zzz.ts", 0);
    assert.deepEqual(store.getState().groups[0], ["b.ts", "c.ts", "a.ts"]);
});

test("closed tabs are remembered and reopened most recent first", () => {
    const store = withTabs("a.ts", "b.ts", "c.ts");
    store.getState().closeTab("a.ts");
    store.getState().closeOthers("b.ts");
    assert.deepEqual(store.getState().closed, ["a.ts", "c.ts"]);
    assert.equal(store.getState().reopenClosed(), "c.ts");
    assert.equal(store.getState().reopenClosed(), "a.ts");
    assert.equal(store.getState().reopenClosed(), null);
});

test("reopenClosed skips a file that is open again", () => {
    const store = withTabs("a.ts", "b.ts");
    store.getState().closeTab("a.ts");
    store.getState().openTab("a.ts");
    assert.equal(store.getState().reopenClosed(), null);
});

test("the closed list is bounded and never repeats a path", () => {
    const store = createWorkspaceStore();
    for (let index = 0; index < 40; index++) {
        store.getState().openTab(`f${index}.ts`);
        store.getState().closeTab(`f${index}.ts`);
    }
    store.getState().openTab("f39.ts");
    store.getState().closeTab("f39.ts");
    const { closed } = store.getState();
    assert.equal(closed.length, 25);
    assert.equal(new Set(closed).size, 25);
    assert.equal(closed.at(-1), "f39.ts");
});

test("restore keeps the saved order and the tabs that are already open", () => {
    const store = withTabs("c.ts");
    store.getState().restore([["a.ts", "b.ts", "c.ts"], ["d.ts"]]);
    assert.deepEqual(store.getState().groups, [["a.ts", "b.ts", "c.ts"], ["d.ts"]]);
    store.getState().restore([["x.ts"], []]);
    assert.deepEqual(store.getState().groups[0], ["x.ts", "a.ts", "b.ts", "c.ts"]);
});

test("focusGroup switches the focused group and ignores no-ops", () => {
    const store = createWorkspaceStore();
    const before = store.getState();
    store.getState().focusGroup(0);
    assert.equal(store.getState(), before);
    store.getState().focusGroup(1);
    assert.equal(store.getState().focused, 1);
});

test("the sidebar view can be switched", () => {
    const store = createWorkspaceStore();
    store.getState().setSidebarView("timeline");
    assert.equal(store.getState().sidebarView, "timeline");
    store.getState().setSidebarView("search");
    assert.equal(store.getState().sidebarView, "search");
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
    store.getState().openTab("b.ts", 1);
    store.getState().closeTab("a.ts");
    store.getState().focusGroup(1);
    store.getState().setSidebarView("timeline");
    store.getState().pauseFollow("a.ts");
    store.getState().reset();
    const state = store.getState();
    assert.deepEqual(state.groups, [[], []]);
    assert.equal(state.focused, 0);
    assert.deepEqual(state.closed, []);
    assert.equal(state.sidebarView, "explorer");
    assert.equal(state.pausedFollow, null);
});
