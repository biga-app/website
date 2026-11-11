import { create, type StateCreator } from "zustand";
import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";

export type DiffLayout = "unified" | "split";
export type LayoutPreset = "default" | "review" | "focus";
export type PanelTab = "changes" | "activity";

export interface ViewerPrefsState {
    diffLayout: DiffLayout;
    wordWrap: boolean;
    follow: boolean;
    layout: LayoutPreset;
    panelOpen: boolean;
    panelTab: PanelTab;
    setDiffLayout: (layout: DiffLayout) => void;
    setWordWrap: (wrap: boolean) => void;
    setFollow: (follow: boolean) => void;
    setLayout: (layout: LayoutPreset) => void;
    setPanelOpen: (open: boolean) => void;
    setPanelTab: (tab: PanelTab) => void;
}

const initialize: StateCreator<ViewerPrefsState> = (set) => ({
            diffLayout: "split",
            wordWrap: false,
            follow: true,
            layout: "default",
            panelOpen: false,
            panelTab: "changes",
            setDiffLayout: (diffLayout) => set({ diffLayout }),
            setWordWrap: (wordWrap) => set({ wordWrap }),
            setFollow: (follow) => set({ follow }),
            setLayout: (layout) => set({ layout }),
            setPanelOpen: (panelOpen) => set({ panelOpen }),
            setPanelTab: (panelTab) => set({ panelTab }),
        });

export const useViewerPrefsStore = create<ViewerPrefsState>()(persist(initialize, { name: "biga-viewer-prefs" }));

export function createViewerPrefsStore() {
    return createStore<ViewerPrefsState>()(initialize);
}
