import type { WorkspaceStoreState } from "@biga/types";
import { createStore } from "zustand/vanilla";

function neighbour(tabs: readonly string[], index: number): string | null {
    return tabs[index] ?? tabs[index - 1] ?? null;
}

export function createWorkspaceStore() {
    return createStore<WorkspaceStoreState>()((set, get) => ({
        tabs: [],
        sidebarView: "explorer",
        pausedFollow: null,
        openTab: (path) => set((state) => (state.tabs.includes(path) ? state : { tabs: [...state.tabs, path] })),
        closeTab: (path) => {
            const { tabs } = get();
            const index = tabs.indexOf(path);
            if (index === -1) return null;
            const remaining = tabs.filter((tab) => tab !== path);
            set({ tabs: remaining });
            return neighbour(remaining, index);
        },
        closeOthers: (path) => set((state) => ({ tabs: state.tabs.filter((tab) => tab === path) })),
        closeAll: () => set({ tabs: [] }),
        setSidebarView: (view) => set({ sidebarView: view }),
        pauseFollow: (target) =>
            set((state) => ({ pausedFollow: { target, count: (state.pausedFollow?.count ?? 0) + 1 } })),
        resumeFollow: () => set({ pausedFollow: null }),
        reset: () => set({ tabs: [], sidebarView: "explorer", pausedFollow: null }),
    }));
}
