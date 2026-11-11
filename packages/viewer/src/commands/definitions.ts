import { baseName } from "@biga/types/file-identity";


import type { CommandContext, CommandDefinition, CommandTarget } from "./types";

function focusedFile({ state }: CommandContext): string | null {
    return state.focused === 1 ? state.splitFile : state.activeFile;
}

function pathOf(context: CommandContext, target?: CommandTarget): string | null {
    return target?.path ?? focusedFile(context);
}

function groupOf(context: CommandContext, target?: CommandTarget) {
    return target?.group ?? context.state.focused;
}

function tabsOf(context: CommandContext, target?: CommandTarget): readonly string[] {
    return context.state.groups[groupOf(context, target)];
}

function hasPath(context: CommandContext, target?: CommandTarget): boolean {
    return pathOf(context, target) !== null;
}

function isOpenFile(context: CommandContext, target?: CommandTarget): boolean {
    const path = pathOf(context, target);
    return path !== null && tabsOf(context, target).includes(path);
}

function hasFiles({ state }: CommandContext): boolean {
    return state.fileCount > 0;
}

export const COMMANDS: readonly CommandDefinition[] = [
    {
        id: "file.closeTab",
        title: "Close Tab",
        group: "File",
        shortcuts: [{ code: "KeyW", alt: true }],
        enabled: isOpenFile,
        run: (context, target) => {
            const path = pathOf(context, target);
            if (path) context.actions.closeTab(path, groupOf(context, target));
        },
    },
    {
        id: "file.closeOthers",
        title: "Close Other Tabs",
        group: "File",
        enabled: (context, target) => isOpenFile(context, target) && tabsOf(context, target).length > 1,
        run: (context, target) => {
            const path = pathOf(context, target);
            if (path) context.actions.closeOthers(path, groupOf(context, target));
        },
    },
    {
        id: "file.closeToRight",
        title: "Close Tabs to the Right",
        group: "File",
        enabled: (context, target) => {
            const path = pathOf(context, target);
            const tabs = tabsOf(context, target);
            return path !== null && tabs.indexOf(path) !== -1 && tabs.indexOf(path) < tabs.length - 1;
        },
        run: (context, target) => {
            const path = pathOf(context, target);
            if (path) context.actions.closeToRight(path, groupOf(context, target));
        },
    },
    {
        id: "file.closeAllInGroup",
        title: "Close All Tabs in Group",
        group: "File",
        palette: false,
        enabled: (context, target) => tabsOf(context, target).length > 0,
        run: (context, target) => context.actions.closeAllInGroup(groupOf(context, target)),
    },
    {
        id: "file.closeAll",
        title: "Close All Tabs",
        group: "File",
        shortcuts: [{ code: "KeyW", alt: true, shift: true }],
        enabled: ({ state }) => state.groups[0].length + state.groups[1].length > 0 || state.view.type !== "live",
        run: ({ actions }) => actions.closeAllTabs(),
    },
    {
        id: "file.reopenClosed",
        title: "Reopen Closed Tab",
        group: "File",
        shortcuts: [{ code: "KeyT", alt: true, shift: true }],
        enabled: ({ state }) => state.canReopen,
        run: ({ actions }) => actions.reopenClosed(),
    },
    {
        id: "file.copyPath",
        title: "Copy Path",
        group: "File",
        enabled: hasPath,
        run: (context, target) => {
            const path = pathOf(context, target);
            if (path) context.actions.copyText(path, "path");
        },
    },
    {
        id: "file.copyName",
        title: "Copy File Name",
        group: "File",
        palette: false,
        enabled: hasPath,
        run: (context, target) => {
            const path = pathOf(context, target);
            if (path) context.actions.copyText(baseName(path), "file name");
        },
    },
    {
        id: "file.copyContents",
        title: "Copy File Contents",
        group: "File",
        enabled: hasPath,
        run: (context, target) => {
            const path = pathOf(context, target);
            if (path) context.actions.copyFileContents(path);
        },
    },
    {
        id: "file.download",
        title: "Download File",
        group: "File",
        enabled: hasPath,
        run: (context, target) => {
            const path = pathOf(context, target);
            if (path) context.actions.downloadFile(path);
        },
    },
    {
        id: "file.copyLink",
        title: "Copy Link to File",
        group: "File",
        enabled: hasPath,
        run: (context, target) => {
            const path = pathOf(context, target);
            if (path) context.actions.copyFileLink(path, target?.line ?? null);
        },
    },
    {
        id: "file.copySessionLink",
        title: "Copy Session Link",
        group: "File",
        run: ({ actions }) => actions.copySessionLink(),
    },
    {
        id: "file.copyCheckpointLink",
        title: "Copy Checkpoint Link",
        group: "File",
        palette: false,
        enabled: (context, target) => (target?.seq ?? (context.state.view.type === "checkpoint" ? context.state.view.seq : null)) !== null,
        run: (context, target) => {
            const seq = target?.seq ?? (context.state.view.type === "checkpoint" ? context.state.view.seq : null);
            if (seq !== null) context.actions.copyCheckpointLink(seq);
        },
    },
    {
        id: "view.toggleSidebar",
        title: "Toggle Sidebar",
        group: "View",
        shortcuts: [{ code: "KeyB", mod: true }],
        checked: ({ state }) => !state.sidebarCollapsed,
        run: ({ actions }) => actions.toggleSidebar(),
    },
    {
        id: "view.showFiles",
        title: "Show Files",
        group: "View",
        checked: ({ state }) => !state.sidebarCollapsed && state.sidebarView === "explorer",
        run: ({ actions }) => actions.setSidebarView("explorer"),
    },
    {
        id: "view.showSearch",
        title: "Search in Files",
        group: "View",
        shortcuts: [{ code: "KeyF", mod: true, shift: true }],
        enabled: hasFiles,
        run: ({ actions }) => actions.searchInFolder(null),
    },
    {
        id: "view.searchInFolder",
        title: "Search in Folder",
        group: "View",
        palette: false,
        enabled: hasFiles,
        run: ({ actions }, target) => actions.searchInFolder(target?.folder ?? null),
    },
    {
        id: "view.showTimeline",
        title: "Show Timeline",
        group: "View",
        checked: ({ state }) => !state.sidebarCollapsed && state.sidebarView === "timeline",
        run: ({ actions }) => actions.setSidebarView("timeline"),
    },
    {
        id: "view.togglePanel",
        title: "Toggle Panel",
        group: "View",
        shortcuts: [{ code: "KeyJ", mod: true }],
        checked: ({ state }) => state.panelOpen,
        run: ({ actions }) => actions.togglePanel(),
    },
    {
        id: "view.splitRight",
        title: "Split Right",
        group: "View",
        shortcuts: [{ code: "Backslash", mod: true }],
        enabled: hasPath,
        run: (context, target) => {
            const path = pathOf(context, target);
            if (path) context.actions.openToSide(path);
        },
    },
    {
        id: "view.closeSplit",
        title: "Close Split View",
        group: "View",
        enabled: ({ state }) => state.splitFile !== null,
        run: ({ actions }) => actions.closeSplitView(),
    },
    {
        id: "view.compare",
        title: "Compare with Session Start",
        group: "View",
        enabled: ({ state }) => state.view.type === "file",
        checked: ({ state }) => state.comparing,
        run: ({ actions }) => actions.toggleCompare(),
    },
    {
        id: "view.wordWrap",
        title: "Wrap Long Lines",
        group: "View",
        checked: ({ state }) => state.wordWrap,
        run: ({ state, actions }) => actions.setWordWrap(!state.wordWrap),
    },
    {
        id: "view.follow",
        title: "Follow the Broadcast",
        group: "View",
        checked: ({ state }) => state.follow,
        run: ({ state, actions }) => actions.setFollow(!state.follow),
    },
    {
        id: "view.diffSplit",
        title: "Diff Layout: Side by Side",
        group: "View",
        checked: ({ state }) => state.diffLayout === "split",
        run: ({ actions }) => actions.setDiffLayout("split"),
    },
    {
        id: "view.diffUnified",
        title: "Diff Layout: Unified",
        group: "View",
        checked: ({ state }) => state.diffLayout === "unified",
        run: ({ actions }) => actions.setDiffLayout("unified"),
    },
    {
        id: "view.layoutDefault",
        title: "Layout: Default",
        group: "View",
        checked: ({ state }) => state.layout === "default",
        run: ({ actions }) => actions.setLayout("default"),
    },
    {
        id: "view.layoutReview",
        title: "Layout: Review",
        group: "View",
        checked: ({ state }) => state.layout === "review",
        run: ({ actions }) => actions.setLayout("review"),
    },
    {
        id: "view.layoutFocus",
        title: "Layout: Focus",
        group: "View",
        checked: ({ state }) => state.layout === "focus",
        run: ({ actions }) => actions.setLayout("focus"),
    },
    {
        id: "view.collapseFolders",
        title: "Collapse All Folders",
        group: "View",
        enabled: hasFiles,
        run: ({ actions }) => actions.collapseFolders(),
    },
    {
        id: "go.file",
        title: "Go to File…",
        group: "Go",
        shortcuts: [{ code: "KeyP", mod: true }],
        run: ({ actions }) => actions.openPalette("files"),
    },
    {
        id: "go.line",
        title: "Go to Line…",
        group: "Go",
        enabled: ({ state }) => state.view.type === "file",
        run: ({ actions }) => actions.openPalette("line"),
    },
    {
        id: "go.commands",
        title: "Command Palette…",
        group: "Go",
        palette: false,
        shortcuts: [{ code: "KeyK", mod: true }, { code: "F1" }],
        run: ({ actions }) => actions.openPalette("commands"),
    },
    {
        id: "go.overview",
        title: "Session Overview",
        group: "Go",
        checked: ({ state }) => state.view.type === "overview" || (state.view.type === "live" && state.activeFile === null),
        run: ({ actions }) => actions.showOverview(),
    },
    {
        id: "go.live",
        title: "Back to the Live Files",
        group: "Go",
        enabled: ({ state }) => state.view.type === "checkpoint",
        run: ({ actions }) => actions.showLive(),
    },
    {
        id: "go.nextTab",
        title: "Next Tab",
        group: "Go",
        shortcuts: [{ code: "BracketRight", alt: true }],
        enabled: ({ state }) => state.groups[state.focused].length > 1,
        run: ({ actions }) => actions.cycleTab(1),
    },
    {
        id: "go.previousTab",
        title: "Previous Tab",
        group: "Go",
        shortcuts: [{ code: "BracketLeft", alt: true }],
        enabled: ({ state }) => state.groups[state.focused].length > 1,
        run: ({ actions }) => actions.cycleTab(-1),
    },
    {
        id: "go.revealInTimeline",
        title: "Show File in Timeline",
        group: "Go",
        enabled: hasPath,
        run: (context, target) => {
            const path = pathOf(context, target);
            if (path) context.actions.revealInTimeline(path);
        },
    },
    {
        id: "go.revealInFiles",
        title: "Reveal in Files",
        group: "Go",
        enabled: hasPath,
        run: (context, target) => {
            const path = pathOf(context, target);
            if (!path) return;
            context.actions.setSidebarView("explorer");
            context.actions.expandAncestors(path);
        },
    },
    {
        id: "go.moveTabLeft",
        title: "Move Tab Left",
        group: "Go",
        palette: false,
        enabled: (context, target) => {
            const path = pathOf(context, target);
            return path !== null && tabsOf(context, target).indexOf(path) > 0;
        },
        run: (context, target) => {
            const path = pathOf(context, target);
            if (path) context.actions.moveTab(path, -1, groupOf(context, target));
        },
    },
    {
        id: "go.moveTabRight",
        title: "Move Tab Right",
        group: "Go",
        palette: false,
        enabled: (context, target) => {
            const path = pathOf(context, target);
            const tabs = tabsOf(context, target);
            return path !== null && tabs.indexOf(path) !== -1 && tabs.indexOf(path) < tabs.length - 1;
        },
        run: (context, target) => {
            const path = pathOf(context, target);
            if (path) context.actions.moveTab(path, 1, groupOf(context, target));
        },
    },
    {
        id: "help.shortcuts",
        title: "Keyboard Shortcuts",
        group: "Help",
        shortcuts: [{ code: "Slash", shift: true }],
        run: ({ actions }) => actions.openShortcuts(),
    },
    {
        id: "help.docs",
        title: "Documentation",
        group: "Help",
        run: ({ actions, links }) => actions.openUrl(links.docs),
    },
    {
        id: "help.source",
        title: "biga on GitHub",
        group: "Help",
        run: ({ actions, links }) => actions.openUrl(links.source),
    },
    {
        id: "help.issue",
        title: "Report an Issue",
        group: "Help",
        run: ({ actions, links }) => actions.openUrl(links.issues),
    },
];

const BY_ID = new Map(COMMANDS.map((command) => [command.id, command]));

export function commandById(id: string): CommandDefinition {
    const command = BY_ID.get(id);
    if (!command) throw new Error(`Unknown command ${id}`);
    return command;
}

export function isEnabled(command: CommandDefinition, context: CommandContext, target?: CommandTarget): boolean {
    return command.enabled ? command.enabled(context, target) : true;
}
