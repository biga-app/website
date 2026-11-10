import type { StreamTransport, StreamTransportOptions, TransportEvent } from "@biga/types/stream";
import { STREAM_TYPE } from "@biga/types/wire";

import { parseRetryAfter } from "../http/retry-after.ts";
import { createFrameParser } from "./frame-parser.ts";

const UNSUPPORTED_MEDIA_TYPE = 415;

async function pump(body: ReadableStream<Uint8Array>, emit: (event: TransportEvent) => void): Promise<void> {
    const reader = body.getReader();
    const parser = createFrameParser();
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        for (const data of parser.push(chunk.value)) emit({ type: "frame", data });
    }
}

export function createStreamTransport(options: StreamTransportOptions): StreamTransport {
    return {
        async connect(sessionId, signal, emit, resume) {
            const position = resume ? `?after=${resume.after}&snapshot=${resume.snapshot}` : "";
            let response: Response;
            try {
                response = await options.fetch(`${options.baseUrl}/api/sessions/${sessionId}/stream${position}`, {
                    headers: { Accept: STREAM_TYPE },
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
            if (!response.headers.get("Content-Type")?.startsWith(STREAM_TYPE)) {
                emit({ type: "closed", reason: "http", status: UNSUPPORTED_MEDIA_TYPE });
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
