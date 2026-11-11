export type CompareBase = { kind: "start" } | { kind: "checkpoint"; seq: number };

export type ViewerView =
    | { type: "live" }
    | { type: "overview" }
    | { type: "file"; path: string; base: CompareBase | null; line: number | null }
    | { type: "checkpoint"; seq: number; file: string | null };

export type HistoryMode = "push" | "replace";

export type GroupIndex = 0 | 1;

export type OpenFileOptions = {
    history?: HistoryMode;
    base?: CompareBase | null;
    line?: number | null;
    group?: GroupIndex;
};

export type ViewerNavigation = {
    view: ViewerView;
    embed: boolean;
    activeFile: string | null;
    splitFile: string | null;
    openFile: (path: string, options?: OpenFileOptions) => void;
    openCheckpoint: (seq: number, file?: string | null, history?: HistoryMode) => void;
    showLive: (history?: HistoryMode) => void;
    showOverview: (history?: HistoryMode) => void;
    clearView: (history?: HistoryMode) => void;
    closeSplit: (history?: HistoryMode) => void;
};
