export type StreamStatus = "connecting" | "live" | "reconnecting" | "offline" | "ended" | "unavailable";

export type Clock = {
    now: () => number;
    setTimer: (run: () => void, delayMs: number) => () => void;
};

export type TransportEvent =
    | { type: "open" }
    | { type: "frame"; data: Uint8Array }
    | { type: "closed"; reason: "network" | "http" | "ended"; status?: number; retryAfterMs?: number | null };

export type StreamTransport = {
    connect(sessionId: string, signal: AbortSignal, emit: (event: TransportEvent) => void): Promise<void>;
};

export type StreamTransportOptions = {
    baseUrl: string;
    fetch: typeof fetch;
};
