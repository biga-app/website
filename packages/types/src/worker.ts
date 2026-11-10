import type { ApiErrorKind } from "./api.js";
import type { Clock } from "./stream.js";
import type { Batch } from "./pipeline.js";

export const PROTOCOL_VERSION = 1;

export type SessionConfig = {
    sessionId: string;
    initialCheckpointSeq?: number;
    /** The share link's key as text, for an encrypted session. */
    key?: string;
};

export type WorkerRequest =
    | { type: "start"; version: number; config: SessionConfig }
    | { type: "ack"; version: number; id: number }
    | { type: "reconnect"; version: number }
    | { type: "retry"; version: number }
    | { type: "visibility"; version: number; hidden: boolean }
    | { type: "online"; version: number }
    | { type: "stop"; version: number };

export type WorkerResponse =
    | { type: "batch"; version: number; batch: Batch }
    | { type: "unavailable"; version: number; kind: ApiErrorKind };

export type SessionHostEnv = {
    baseUrl: string;
    fetch: typeof fetch;
    clock: Clock;
    random: () => number;
    sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
    post: (response: WorkerResponse) => void;
};

export type SessionPort = {
    send(request: WorkerRequest): void;
    listen(listener: (response: WorkerResponse) => void): void;
    terminate(): void;
};

export type SessionClientOptions = {
    createPort: () => SessionPort | null;
    createFallbackPort: () => SessionPort;
    onBatch: (batch: Batch, done: () => void) => void;
    onUnavailable: (kind: ApiErrorKind) => void;
};
