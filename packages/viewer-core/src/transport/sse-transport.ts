import type { SseTransportOptions, StreamTransport, TransportEvent } from "@biga/types";

import { parseRetryAfter } from "../http/retry-after.ts";
import { createSseParser } from "./sse-parser.ts";

async function pump(
    body: ReadableStream<Uint8Array>,
    emit: (event: TransportEvent) => void
): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const parser = createSseParser();
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        for (const item of parser.push(decoder.decode(chunk.value, { stream: true }))) {
            emit(item.type === "frame" ? { type: "frame", name: item.name, data: item.data } : { type: "heartbeat" });
        }
    }
}

export function createSseTransport(options: SseTransportOptions): StreamTransport {
    return {
        async connect(sessionId, signal, emit) {
            let response: Response;
            try {
                response = await options.fetch(`${options.baseUrl}/api/sessions/${sessionId}/stream`, {
                    headers: { Accept: "text/event-stream" },
                    cache: "no-store",
                    signal,
                });
            } catch {
                if (!signal.aborted) emit({ type: "closed", reason: "network" });
                return;
            }
            if (!response.ok || !response.body) {
                emit({
                    type: "closed",
                    reason: "http",
                    status: response.status,
                    retryAfterMs: parseRetryAfter(response.headers.get("Retry-After")),
                });
                return;
            }
            emit({ type: "open" });
            try {
                await pump(response.body, emit);
            } catch {
                if (!signal.aborted) emit({ type: "closed", reason: "network" });
                return;
            }
            if (!signal.aborted) emit({ type: "closed", reason: "ended" });
        },
    };
}
