import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DiffLayout = "unified" | "split";
export type LayoutPreset = "default" | "review" | "focus";
export type PanelTab = "changes" | "activity";

interface ViewerPrefsState {
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

export const useViewerPrefsStore = create<ViewerPrefsState>()(
    persist(
        (set) => ({
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
        }),
        { name: "biga-viewer-prefs" }
    )
);
