"use client";

import { useViewerPrefsStore } from "@biga/stores/viewer-prefs-store";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

import { useModKey } from "@/components/ui/kbd";
import { useIsMobile } from "@/hooks/use-mobile";

import { useViewerView } from "../runtime/navigation-context";
import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { useViewerUi, useViewerUiStore } from "../shell/ui-state";
import { buildActions } from "./build-actions";
import { commandById, COMMANDS, isEnabled } from "./definitions";
import { isPlainShortcut, isTypingTarget, matchesShortcut, shortcutKeys, type Shortcut } from "./shortcuts";
import type { CommandContext, CommandDefinition, CommandTarget, ViewerState } from "./types";

const CommandReactContext = createContext<CommandContext | null>(null);

function useViewerState(): ViewerState {
    const { workspace, tree, history } = useRuntime().stores;
    const { view, activeFile, splitFile, embed } = useViewerView();
    const groups = useStoreValue(workspace, (state) => state.groups);
    const focused = useStoreValue(workspace, (state) => state.focused);
    const sidebarView = useStoreValue(workspace, (state) => state.sidebarView);
    const closed = useStoreValue(workspace, (state) => state.closed);
    const fileCount = useStoreValue(tree, (state) => state.fileCount);
    const checkpointCount = useStoreValue(history, (state) => state.checkpoints.length);
    const sidebarCollapsed = useViewerUi((state) => state.sidebarCollapsed);
    const wordWrap = useViewerPrefsStore((state) => state.wordWrap);
    const follow = useViewerPrefsStore((state) => state.follow);
    const diffLayout = useViewerPrefsStore((state) => state.diffLayout);
    const layout = useViewerPrefsStore((state) => state.layout);
    const panelOpen = useViewerPrefsStore((state) => state.panelOpen);

    return useMemo(
        () => ({
            view,
            activeFile,
            splitFile,
            groups,
            focused,
            canReopen: closed.some((path) => !groups[0].includes(path)),
            sidebarView,
            sidebarCollapsed,
            wordWrap,
            follow,
            diffLayout,
            layout,
            panelOpen,
            comparing: view.type === "file" && view.base !== null,
            embed,
            fileCount,
            checkpointCount,
        }),
        [view, activeFile, splitFile, groups, focused, closed, sidebarView, sidebarCollapsed, wordWrap, follow, diffLayout, layout, panelOpen, embed, fileCount, checkpointCount]
    );
}

function useShortcuts(context: CommandContext) {
    const latest = useRef(context);

    useEffect(() => {
        latest.current = context;
    });

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.isComposing) return;
            const typing = isTypingTarget(event.target);
            for (const command of COMMANDS) {
                const shortcut = command.shortcuts?.find((candidate) => matchesShortcut(event, candidate));
                if (!shortcut) continue;
                if (typing && isPlainShortcut(shortcut)) return;
                event.preventDefault();
                if (isEnabled(command, latest.current)) command.run(latest.current);
                return;
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);
}

export function CommandProvider({ children }: { children: ReactNode }) {
    const runtime = useRuntime();
    const navigation = useViewerView();
    const ui = useViewerUiStore();
    const compact = useIsMobile();
    const state = useViewerState();
    const actions = useMemo(() => buildActions({ runtime, navigation, ui, compact }), [runtime, navigation, ui, compact]);
    const value = useMemo<CommandContext>(() => ({ state, actions }), [state, actions]);
    useShortcuts(value);
    return <CommandReactContext.Provider value={value}>{children}</CommandReactContext.Provider>;
}

export function useCommandContext(): CommandContext {
    const context = useContext(CommandReactContext);
    if (!context) throw new Error("useCommandContext must be used inside CommandProvider");
    return context;
}

export type BoundCommand = {
    id: string;
    title: string;
    keys: string[] | null;
    shortcut: string | null;
    enabled: boolean;
    checked: boolean | undefined;
    run: () => void;
};

function shortcutFields(shortcut: Shortcut | undefined, mod: string): Pick<BoundCommand, "keys" | "shortcut"> {
    if (!shortcut) return { keys: null, shortcut: null };
    const keys = shortcutKeys(shortcut, mod);
    return { keys, shortcut: keys.join(mod === "⌘" ? "" : "+") };
}

export function useBoundCommand(id: string, target?: CommandTarget): BoundCommand {
    const context = useCommandContext();
    const mod = useModKey();
    const command = commandById(id);
    const shortcut = command.shortcuts?.[0];
    return {
        id,
        title: command.title,
        ...shortcutFields(shortcut, mod),
        enabled: isEnabled(command, context, target),
        checked: command.checked?.(context),
        run: () => command.run(context, target),
    };
}

export function useCommandList(target?: CommandTarget): { command: CommandDefinition; bound: BoundCommand }[] {
    const context = useCommandContext();
    const mod = useModKey();
    return COMMANDS.map((command) => {
        const shortcut = command.shortcuts?.[0];
        return {
            command,
            bound: {
                id: command.id,
                title: command.title,
                ...shortcutFields(shortcut, mod),
                enabled: isEnabled(command, context, target),
                checked: command.checked?.(context),
                run: () => command.run(context, target),
            },
        };
    });
}
