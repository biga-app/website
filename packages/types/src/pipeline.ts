import type { ApiErrorKind } from "./api.js";
import type { Checkpoint, CheckpointSummary } from "./checkpoint.js";
import type { StreamEvent } from "./events.js";
import type { FileNode } from "./file.js";
import type { SessionResponse } from "./session.js";
import type { LoadMode, SessionState } from "./state.js";
import type { Clock, StreamStatus, StreamTransport } from "./stream.js";
import type { TreePatch, TreeTable } from "./tree-table.js";

export type DecodeResult = { ok: true; event: StreamEvent } | { ok: false };

export type DecoderOptions = {
    maxConsecutiveInvalid?: number;
    onEvent: (event: StreamEvent) => void;
    onResync: () => void;
};

export type SequencerState = {
    checkpoints: readonly { seq: number }[];
    snapshot: { timestamp: number } | null;
};

export type SequencerOptions = {
    apply: (event: StreamEvent) => void;
    resynchronize: () => void;
    maxPending?: number;
};

export type Hydration = {
    reason: "initial" | "resync";
    session: SessionResponse;
    mode: LoadMode;
    table: TreeTable | null;
    summaries: CheckpointSummary[];
    contents: Record<string, string> | null;
    initial: Checkpoint | null;
};

export type Batch = {
    id: number;
    hydrate: Hydration | null;
    table: TreeTable | null;
    patches: TreePatch[];
    summaries: CheckpointSummary[];
    latest: Checkpoint | null;
    touched: string[];
    followTarget: string | null;
    status: StreamStatus | null;
};

export type EventSink = {
    hydrate(hydration: Hydration): void;
    snapshot(table: TreeTable): void;
    checkpoint(checkpoint: Checkpoint): void;
    status(status: StreamStatus): void;
};

export type CoalescerOptions = {
    send: (batch: Batch) => void;
    clock: Clock;
    minIntervalMs?: number;
};

export type SupervisorApi = {
    getState(sessionId: string, request: { signal: AbortSignal }): Promise<SessionState>;
    getCheckpoint(sessionId: string, seq: number, request: { signal: AbortSignal }): Promise<Checkpoint>;
};

export type SupervisorOptions = {
    sessionId: string;
    initialCheckpointSeq?: number;
    transport: StreamTransport;
    api: SupervisorApi;
    sink: EventSink;
    buildTable: (tree: FileNode) => TreeTable;
    clock: Clock;
    random: () => number;
    onUnavailable: (kind: ApiErrorKind) => void;
};
