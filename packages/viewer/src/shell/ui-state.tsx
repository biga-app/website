"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";

export type PaletteMode = "files" | "commands" | "line";

export type Cursor = { line: number; column: number };

export type SearchRequest = { nonce: number; folder: string | null; query: string | null };

export type ViewerUiState = {
    sidebarCollapsed: boolean;
    drawerOpen: boolean;
    palette: { open: boolean; mode: PaletteMode };
    shortcutsOpen: boolean;
    searchRequest: SearchRequest;
    cursor: Cursor | null;
    setSidebarCollapsed: (collapsed: boolean) => void;
    setDrawerOpen: (open: boolean) => void;
    openPalette: (mode?: PaletteMode) => void;
    setPaletteOpen: (open: boolean) => void;
    setShortcutsOpen: (open: boolean) => void;
    requestSearch: (folder?: string | null, query?: string | null) => void;
    setCursor: (cursor: Cursor | null) => void;
};

export function createViewerUiStore(): StoreApi<ViewerUiState> {
    return createStore<ViewerUiState>()((set) => ({
        sidebarCollapsed: false,
        drawerOpen: false,
        palette: { open: false, mode: "files" },
        shortcutsOpen: false,
        searchRequest: { nonce: 0, folder: null, query: null },
        cursor: null,
        setSidebarCollapsed: (sidebarCollapsed) => set((state) => (state.sidebarCollapsed === sidebarCollapsed ? state : { sidebarCollapsed })),
        setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
        openPalette: (mode = "files") => set({ palette: { open: true, mode } }),
        setPaletteOpen: (open) => set((state) => ({ palette: { ...state.palette, open } })),
        setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
        requestSearch: (folder = null, query = null) => set((state) => ({ searchRequest: { nonce: state.searchRequest.nonce + 1, folder, query } })),
        setCursor: (cursor) =>
            set((state) =>
                state.cursor?.line === cursor?.line && state.cursor?.column === cursor?.column ? state : { cursor }
            ),
    }));
}

const UiContext = createContext<StoreApi<ViewerUiState> | null>(null);

export function ViewerUiProvider({ children }: { children: ReactNode }) {
    const [store] = useState(createViewerUiStore);
    return <UiContext.Provider value={store}>{children}</UiContext.Provider>;
}

export function useViewerUiStore(): StoreApi<ViewerUiState> {
    const store = useContext(UiContext);
    if (!store) throw new Error("useViewerUiStore must be used inside ViewerUiProvider");
    return store;
}

export function useViewerUi<Value>(select: (state: ViewerUiState) => Value): Value {
    return useStore(useViewerUiStore(), select);
}
