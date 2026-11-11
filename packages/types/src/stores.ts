import type { ApiErrorKind } from "./api.js";
import type { Checkpoint, CheckpointSummary } from "./checkpoint.js";
import type { SessionResponse } from "./session.js";
import type { LoadMode } from "./state.js";
import type { StreamStatus } from "./stream.js";
import type { TreeEntry, TreePatch, TreePosition, TreeTable } from "./tree-table.js";
import type { GroupIndex } from "./viewer-location.js";

export type ReadableStore<State> = {
    getState(): State;
    subscribe(listener: (state: State, previous: State) => void): () => void;
};

export type ConnectionStoreState = {
    status: StreamStatus;
    unavailable: ApiErrorKind | null;
    setStatus(status: StreamStatus): void;
    setUnavailable(kind: ApiErrorKind): void;
    reset(): void;
};

export type SessionStoreState = {
    session: SessionResponse | null;
    mode: LoadMode;
    hydrate(session: SessionResponse, mode: LoadMode): void;
    reset(): void;
};

export type TreeReader = {
    entry(path: string): TreeEntry | undefined;
    position(path: string): TreePosition | null;
    expandedPaths(): ReadonlySet<string>;
    filePaths(): string[];
};

export type TreeStoreState = {
    revision: number;
    rows: readonly string[];
    fileCount: number;
    touched: ReadonlySet<string>;
    touchedRevision: number;
    reader: TreeReader;
    load(table: TreeTable): void;
    prepareLoad(table: TreeTable, nextFrame: () => Promise<void>): Promise<() => void>;
    apply(patches: readonly TreePatch[]): void;
    setExpanded(path: string, open: boolean): void;
    expandAncestors(path: string): void;
    collapseAll(): void;
    markTouched(paths: readonly string[]): void;
    reset(): void;
};

export type HistoryStoreState = {
    checkpoints: readonly CheckpointSummary[];
    loaded: ReadonlyMap<number, Checkpoint>;
    selectedSeq: number | null;
    newWhileBrowsing: number;
    hydrate(summaries: readonly CheckpointSummary[], reason: "initial" | "resync", initial: Checkpoint | null): void;
    append(summaries: readonly CheckpointSummary[], latest: Checkpoint | null): void;
    prepend(older: readonly CheckpointSummary[]): void;
    select(seq: number | null): void;
    cache(checkpoint: Checkpoint): void;
    reset(): void;
};

export type SidebarView = "explorer" | "timeline" | "search";

export type PausedFollow = { target: string; count: number };

export type TabGroups = readonly [readonly string[], readonly string[]];

export type WorkspaceStoreState = {
    groups: TabGroups;
    focused: GroupIndex;
    closed: readonly string[];
    sidebarView: SidebarView;
    pausedFollow: PausedFollow | null;
    openTab(path: string, group?: GroupIndex): void;
    closeTab(path: string, group?: GroupIndex): string | null;
    closeOthers(path: string, group?: GroupIndex): void;
    closeToRight(path: string, group?: GroupIndex): void;
    closeAll(group?: GroupIndex): void;
    moveTab(path: string, index: number, group?: GroupIndex): void;
    reopenClosed(): string | null;
    focusGroup(group: GroupIndex): void;
    restore(groups: TabGroups): void;
    setSidebarView(view: SidebarView): void;
    pauseFollow(target: string): void;
    resumeFollow(): void;
    reset(): void;
};

export type SessionStores = {
    connection: ReadableStore<ConnectionStoreState>;
    session: ReadableStore<SessionStoreState>;
    tree: ReadableStore<TreeStoreState>;
    history: ReadableStore<HistoryStoreState>;
    workspace: ReadableStore<WorkspaceStoreState>;
};
