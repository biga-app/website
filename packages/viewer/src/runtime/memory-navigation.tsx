"use client";

import type { HistoryMode, ViewerNavigation, ViewerView } from "@biga/types/viewer-location";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { activeFileOf, NavigationProvider } from "./navigation-context";

type Entry = { view: ViewerView; splitFile: string | null };
type History = { entries: Entry[]; index: number };
const initial: Entry = { view: { type: "live" }, splitFile: null };
const HistoryContext = createContext({ back: () => {}, forward: () => {}, canBack: false, canForward: false });

export function useMemoryHistory() {
    return useContext(HistoryContext);
}

export function MemoryNavigationProvider({ children }: { children: ReactNode }) {
    const [history, setHistory] = useState<History>({ entries: [initial], index: 0 });
    const update = useCallback((change: Partial<Entry>, mode: HistoryMode = "push") => {
        setHistory((current) => {
            const entry = { ...current.entries[current.index]!, ...change };
            const entries = current.entries.slice(0, current.index + (mode === "replace" ? 0 : 1));
            return { entries: [...entries, entry], index: entries.length };
        });
    }, []);
    const current = history.entries[history.index]!;
    const navigation = useMemo<ViewerNavigation>(() => ({
        ...current,
        embed: false,
        activeFile: activeFileOf(current.view),
        openFile: (path, options = {}) => options.group === 1
            ? update({ splitFile: path }, options.history)
            : update({ view: { type: "file", path, base: options.base ?? null, line: options.line ?? null } }, options.history),
        openCheckpoint: (seq, file = null, mode = "replace") => update({ view: { type: "checkpoint", seq, file } }, mode),
        showLive: (mode) => update({ view: { type: "live" } }, mode),
        showOverview: (mode) => update({ view: { type: "overview" } }, mode),
        clearView: (mode = "replace") => update(initial, mode),
        closeSplit: (mode = "replace") => update({ splitFile: null }, mode),
    }), [current, update]);
    const controls = {
        canBack: history.index > 0,
        canForward: history.index < history.entries.length - 1,
        back: () => setHistory((state) => ({ ...state, index: Math.max(0, state.index - 1) })),
        forward: () => setHistory((state) => ({ ...state, index: Math.min(state.entries.length - 1, state.index + 1) })),
    };
    return <HistoryContext.Provider value={controls}><NavigationProvider value={navigation}>{children}</NavigationProvider></HistoryContext.Provider>;
}
