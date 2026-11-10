import type { SessionState } from "@biga/types";

import type { Frame } from "./frames.ts";
import { makeState } from "./session.ts";

const encoder = new TextEncoder();

type Stream = {
    push: (text: string) => void;
    close: () => void;
};

function createStream(signal: AbortSignal | null | undefined) {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
        start(started) {
            controller = started;
        },
    });
    signal?.addEventListener("abort", () => {
        try {
            controller.error(new DOMException("aborted", "AbortError"));
        } catch {
            return;
        }
    });
    const stream: Stream = {
        push: (text) => {
            try {
                controller.enqueue(encoder.encode(text));
            } catch {
                return;
            }
        },
        close: () => controller.close(),
    };
    return { body, stream };
}

function json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status });
}

export function createFakeServer(initial: SessionState = makeState()) {
    const streams: Stream[] = [];
    let state = initial;
    let stateFailure: number | null = null;
    let stateCalls = 0;

    const fakeFetch = (async (input: string, init?: RequestInit) => {
        if (input.includes("/stream")) {
            const { body, stream } = createStream(init?.signal);
            streams.push(stream);
            return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
        }
        if (input.endsWith("/state")) {
            stateCalls++;
            if (stateFailure !== null) return json(stateFailure, { ok: false, error: { code: "x", message: "failed" } });
            return json(200, { ok: true, data: state });
        }
        return json(404, { ok: false, error: { code: "not_found", message: "no such route" } });
    }) as unknown as typeof fetch;

    return {
        fetch: fakeFetch,
        pushFrame(frame: Pick<Frame, "name" | "data">): void {
            (streams[streams.length - 1] as Stream).push(`event: ${frame.name}\ndata: ${frame.data}\n\n`);
        },
        closeStream: () => (streams[streams.length - 1] as Stream).close(),
        streamCalls: () => streams.length,
        stateCalls: () => stateCalls,
        setState: (next: SessionState) => void (state = next),
        failState: (status: number | null) => void (stateFailure = status),
    };
}
