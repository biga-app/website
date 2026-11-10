export type CompareBase = { kind: "start" } | { kind: "checkpoint"; seq: number };

export type ViewerView =
    | { type: "live" }
    | { type: "file"; path: string; base: CompareBase | null }
    | { type: "checkpoint"; seq: number; file: string | null };

export type HistoryMode = "push" | "replace";

export type ViewerNavigation = {
    view: ViewerView;
    embed: boolean;
    activeFile: string | null;
    openFile: (path: string, history?: HistoryMode, base?: CompareBase | null) => void;
    openCheckpoint: (seq: number, file?: string | null, history?: HistoryMode) => void;
    showLive: (history?: HistoryMode) => void;
};
