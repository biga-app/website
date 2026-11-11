import type { ViewerPrefsState } from "@biga/stores/viewer-prefs-store";
import type { GroupIndex, ViewerNavigation } from "@biga/types/viewer-location";
import type { StoreApi } from "zustand/vanilla";

import { copyWithToast } from "@biga/viewer/lib/file-actions";
import { fileLinkFor, shareUrlFor } from "@biga/viewer/lib/session-title";

import { copyFileContent, downloadFile } from "../runtime/file-actions";
import { revealInTimeline } from "../runtime/reveal-in-timeline";
import type { SessionRuntime } from "../runtime/runtime";
import type { ViewerUiState } from "../shell/ui-state";
import type { ViewerActions } from "./types";

type Dependencies = {
    runtime: SessionRuntime;
    preferences: StoreApi<ViewerPrefsState>;
    navigation: ViewerNavigation;
    ui: StoreApi<ViewerUiState>;
    compact: boolean;
};

function activeOf(navigation: ViewerNavigation, group: GroupIndex): string | null {
    return group === 0 ? navigation.activeFile : navigation.splitFile;
}

function showNext(navigation: ViewerNavigation, group: GroupIndex, next: string | null) {
    if (group === 0) {
        if (next) navigation.openFile(next, { history: "replace" });
        else navigation.showLive("replace");
        return;
    }
    if (next) navigation.openFile(next, { group: 1, history: "replace" });
    else navigation.closeSplit("replace");
}

export function buildActions({ runtime, navigation, ui, compact, preferences }: Dependencies): ViewerActions {
    const { workspace, tree } = runtime.stores;
    const prefs = () => preferences.getState();

    const select = (path: string, group: GroupIndex) => {
        workspace.getState().focusGroup(group);
        navigation.openFile(path, { group, history: "replace" });
    };

    const closeTab: ViewerActions["closeTab"] = (path, group) => {
        const active = activeOf(navigation, group);
        const next = workspace.getState().closeTab(path, group);
        if (path === active) showNext(navigation, group, next);
    };

    const closeAllInGroup: ViewerActions["closeAllInGroup"] = (group) => {
        workspace.getState().closeAll(group);
        showNext(navigation, group, null);
        if (group === 1) workspace.getState().focusGroup(0);
    };

    const closeSplitView = () => {
        workspace.getState().closeAll(1);
        workspace.getState().focusGroup(0);
        navigation.closeSplit();
    };

    const setSidebarView: ViewerActions["setSidebarView"] = (view) => {
        workspace.getState().setSidebarView(view);
        if (compact) ui.getState().setDrawerOpen(true);
        else ui.getState().setSidebarCollapsed(false);
    };

    return {
        openFile: (path, options) => {
            const group = options?.group ?? workspace.getState().focused;
            workspace.getState().focusGroup(group);
            navigation.openFile(path, { ...options, group });
        },
        openCheckpoint: navigation.openCheckpoint,
        showLive: navigation.showLive,
        showOverview: navigation.showOverview,
        closeTab,
        closeOthers: (path, group) => {
            workspace.getState().closeOthers(path, group);
            if (activeOf(navigation, group) !== path) select(path, group);
        },
        closeToRight: (path, group) => {
            workspace.getState().closeToRight(path, group);
            const active = activeOf(navigation, group);
            if (active === null || !workspace.getState().groups[group].includes(active)) select(path, group);
        },
        closeAllInGroup,
        closeAllTabs: () => {
            workspace.getState().closeAll();
            workspace.getState().focusGroup(0);
            navigation.clearView("replace");
        },
        reopenClosed: () => {
            const path = workspace.getState().reopenClosed();
            if (path) select(path, 0);
        },
        moveTab: (path, delta, group) => {
            const index = workspace.getState().groups[group].indexOf(path);
            if (index !== -1) workspace.getState().moveTab(path, index + delta, group);
        },
        cycleTab: (delta) => {
            const { groups, focused } = workspace.getState();
            const tabs = groups[focused];
            if (tabs.length === 0) return;
            const active = activeOf(navigation, focused);
            const index = active === null ? -1 : tabs.indexOf(active);
            const next = tabs[(index + delta + tabs.length) % tabs.length];
            if (next) select(next, focused);
        },
        openToSide: (path) => {
            workspace.getState().focusGroup(1);
            navigation.openFile(path, { group: 1 });
        },
        closeSplitView,
        focusGroup: (group) => workspace.getState().focusGroup(group),
        setSidebarView,
        toggleSidebar: () => {
            if (compact) ui.getState().setDrawerOpen(!ui.getState().drawerOpen);
            else ui.getState().setSidebarCollapsed(!ui.getState().sidebarCollapsed);
        },
        togglePanel: () => prefs().setPanelOpen(!prefs().panelOpen),
        openPalette: (mode) => ui.getState().openPalette(mode),
        openShortcuts: () => ui.getState().setShortcutsOpen(true),
        searchInFolder: (folder) => {
            setSidebarView("search");
            ui.getState().requestSearch(folder);
        },
        searchFor: (query) => {
            setSidebarView("search");
            ui.getState().requestSearch(null, query);
        },
        copyText: (text, what) => void copyWithToast(text, what),
        copyFileContents: (path) => void copyFileContent(runtime, path),
        downloadFile: (path) => void downloadFile(runtime, path),
        copyFileLink: (path, line) => void copyWithToast(fileLinkFor(runtime.sessionId, path, line ?? null, runtime.shareKey), "link"),
        copySessionLink: () => void copyWithToast(shareUrlFor(runtime.sessionId, undefined, runtime.shareKey), "session link"),
        copyCheckpointLink: (seq) => void copyWithToast(shareUrlFor(runtime.sessionId, seq, runtime.shareKey), "checkpoint link"),
        revealInTimeline: (path) => void revealInTimeline(runtime, (seq, file) => navigation.openCheckpoint(seq, file, "push"), path),
        collapseFolders: () => tree.getState().collapseAll(),
        expandAncestors: (path) => {
            tree.getState().expandAncestors(path);
            ui.getState().setSidebarCollapsed(false);
        },
        setWordWrap: (wrap) => prefs().setWordWrap(wrap),
        setFollow: (follow) => prefs().setFollow(follow),
        setDiffLayout: (layout) => prefs().setDiffLayout(layout),
        setLayout: (layout) => {
            prefs().setLayout(layout);
            if (layout === "review") {
                setSidebarView("timeline");
                prefs().setPanelTab("changes");
                prefs().setPanelOpen(true);
            } else if (layout === "focus") {
                prefs().setPanelOpen(false);
                if (!compact) ui.getState().setSidebarCollapsed(true);
            } else {
                setSidebarView("explorer");
                prefs().setPanelOpen(false);
            }
        },
        toggleCompare: () => {
            const { view } = navigation;
            if (view.type !== "file") return;
            navigation.openFile(view.path, { history: "replace", base: view.base ? null : { kind: "start" } });
        },
        openUrl: (url) => void window.open(url, "_blank", "noopener,noreferrer"),
    };
}
