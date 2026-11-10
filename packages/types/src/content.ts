import type { Checkpoint, CheckpointSummary, FileHistoryEntry } from "./checkpoint.js";
import type { FileContent, SessionState } from "./state.js";

export type RequestOptions = {
    signal?: AbortSignal;
    priority?: "high" | "low" | "auto";
};

export type ApiClientOptions = {
    baseUrl: string;
    fetch: typeof fetch;
    sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
    maxAttempts?: number;
    backoffMs?: number;
};

export type BlobEntry = {
    content: string;
    lineCount: number;
    maxLineLength: number;
};

export type BlobStoreOptions = {
    budgetBytes: number;
    maxEntries: number;
};

export type DocumentTier = "full" | "reduced" | "plain";

export type DocumentMeasure = {
    bytes: number;
    lineCount: number;
    maxLineLength: number;
};

export type TierFeatures = {
    highlighting: boolean;
    folding: boolean;
    bracketColorization: boolean;
    occurrencesHighlight: boolean;
    links: boolean;
    stickyScroll: boolean;
    changeHighlight: boolean;
    maxTokenizationLineLength: number;
};

export type ApiClient = {
    getState(sessionId: string, request?: RequestOptions): Promise<SessionState>;
    getFile(sessionId: string, path: string, ref: string, request?: RequestOptions): Promise<FileContent>;
    getCheckpoint(sessionId: string, seq: number, request?: RequestOptions): Promise<Checkpoint>;
    getCheckpoints(
        sessionId: string,
        page?: { before?: number; limit?: number },
        request?: RequestOptions
    ): Promise<CheckpointSummary[]>;
    getFileHistory(sessionId: string, path: string, request?: RequestOptions): Promise<FileHistoryEntry[]>;
};

export type LineRange = {
    start: number;
    end: number;
};
