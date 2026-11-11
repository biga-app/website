"use client";

import { useViewerPrefsStore as persistedPrefs, type ViewerPrefsState } from "@biga/stores/viewer-prefs-store";
import { createContext, useContext, type ReactNode } from "react";
import { useStore, type StoreApi } from "zustand";

const PrefsContext = createContext<StoreApi<ViewerPrefsState>>(persistedPrefs);

export function ViewerPrefsProvider({ store, children }: { store: StoreApi<ViewerPrefsState>; children: ReactNode }) {
    return <PrefsContext.Provider value={store}>{children}</PrefsContext.Provider>;
}

export function useViewerPrefsApi() {
    return useContext(PrefsContext);
}

export function useViewerPrefsStore<Value>(select: (state: ViewerPrefsState) => Value): Value {
    return useStore(useViewerPrefsApi(), select);
}
