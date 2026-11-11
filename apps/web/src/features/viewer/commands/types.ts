import type { SidebarView, TabGroups } from "@biga/types/stores";
import type { DiffLayout, LayoutPreset } from "@biga/stores/viewer-prefs-store";
import type { GroupIndex, HistoryMode, OpenFileOptions, ViewerView } from "@biga/types/viewer-location";

import type { PaletteMode } from "../shell/ui-state";
import type { Shortcut } from "./shortcuts";

export type CommandTarget = {
    path?: string;
    group?: GroupIndex;
    seq?: number;
    folder?: string;
    line?: number;
};

export type ViewerState = {
    view: ViewerView;
    activeFile: string | null;
    splitFile: string | null;
    groups: TabGroups;
    focused: GroupIndex;
    canReopen: boolean;
    sidebarView: SidebarView;
    sidebarCollapsed: boolean;
    wordWrap: boolean;
    follow: boolean;
    diffLayout: DiffLayout;
    layout: LayoutPreset;
    panelOpen: boolean;
    comparing: boolean;
    embed: boolean;
    fileCount: number;
    checkpointCount: number;
};

export type ViewerActions = {
    openFile: (path: string, options?: OpenFileOptions) => void;
    openCheckpoint: (seq: number, file?: string | null, history?: HistoryMode) => void;
    showLive: (history?: HistoryMode) => void;
    showOverview: (history?: HistoryMode) => void;
    closeTab: (path: string, group: GroupIndex) => void;
    closeOthers: (path: string, group: GroupIndex) => void;
    closeToRight: (path: string, group: GroupIndex) => void;
    closeAllInGroup: (group: GroupIndex) => void;
    closeAllTabs: () => void;
    reopenClosed: () => void;
    moveTab: (path: string, delta: number, group: GroupIndex) => void;
    cycleTab: (delta: number) => void;
    openToSide: (path: string) => void;
    closeSplitView: () => void;
    focusGroup: (group: GroupIndex) => void;
    setSidebarView: (view: SidebarView) => void;
    toggleSidebar: () => void;
    togglePanel: () => void;
    openPalette: (mode?: PaletteMode) => void;
    openShortcuts: () => void;
    searchInFolder: (folder?: string | null) => void;
    copyText: (text: string, what: string) => void;
    copyFileContents: (path: string) => void;
    downloadFile: (path: string) => void;
    copyFileLink: (path: string, line?: number | null) => void;
    copySessionLink: () => void;
    copyCheckpointLink: (seq: number) => void;
    revealInTimeline: (path: string) => void;
    collapseFolders: () => void;
    expandAncestors: (path: string) => void;
    setWordWrap: (wrap: boolean) => void;
    setFollow: (follow: boolean) => void;
    setDiffLayout: (layout: DiffLayout) => void;
    setLayout: (layout: LayoutPreset) => void;
    toggleCompare: () => void;
    openUrl: (url: string) => void;
};

export type CommandContext = {
    state: ViewerState;
    actions: ViewerActions;
};

export type CommandGroup = "File" | "View" | "Go" | "Help";

export type CommandDefinition = {
    id: string;
    title: string;
    group: CommandGroup;
    shortcuts?: readonly Shortcut[];
    palette?: boolean;
    enabled?: (context: CommandContext, target?: CommandTarget) => boolean;
    checked?: (context: CommandContext) => boolean;
    run: (context: CommandContext, target?: CommandTarget) => void;
};
