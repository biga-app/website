export type StreamStatus = "connecting" | "live" | "reconnecting" | "offline" | "ended" | "unavailable";

export type Clock = {
    now: () => number;
    setTimer: (run: () => void, delayMs: number) => () => void;
};

export type TransportEvent =
    | { type: "open" }
    | { type: "frame"; data: Uint8Array }
    | { type: "closed"; reason: "network" | "http" | "ended"; status?: number; retryAfterMs?: number | null };

/** Where a reconnecting viewer left off: its latest checkpoint and the snapshot it holds. */
export type ResumePosition = { after: number; snapshot: number };

export type StreamTransport = {
    connect(sessionId: string, signal: AbortSignal, emit: (event: TransportEvent) => void, resume: ResumePosition | null): Promise<void>;
};

export type StreamTransportOptions = {
    baseUrl: string;
    fetch: typeof fetch;
};
