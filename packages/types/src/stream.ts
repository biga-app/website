export type StreamStatus = "connecting" | "live" | "reconnecting" | "offline" | "ended" | "unavailable";

export type Clock = {
    now: () => number;
    setTimer: (run: () => void, delayMs: number) => () => void;
};

export type SseItem = { type: "frame"; name: string; data: string } | { type: "comment"; text: string };

export type TransportEvent =
    | { type: "open" }
    | { type: "frame"; name: string; data: string }
    | { type: "heartbeat" }
    | { type: "closed"; reason: "network" | "http" | "ended"; status?: number; retryAfterMs?: number | null };

export type StreamTransport = {
    connect(sessionId: string, signal: AbortSignal, emit: (event: TransportEvent) => void): Promise<void>;
};

export type SseTransportOptions = {
    baseUrl: string;
    fetch: typeof fetch;
};
