import type { SessionState } from "@biga/types/state";
import { PROTOBUF_TYPE, STREAM_TYPE } from "@biga/types/wire";

import type { Frame } from "./frames.ts";
import { makeState } from "./session.ts";
import { delimited, encodeApiError, encodeState } from "@biga/demo/wire";

type Stream = {
    push: (bytes: Uint8Array) => void;
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
        push: (bytes) => {
            try {
                controller.enqueue(bytes);
            } catch {
                return;
            }
        },
        close: () => controller.close(),
    };
    return { body, stream };
}

function protobuf(status: number, body: Uint8Array): Response {
    return new Response(body as BodyInit, { status, headers: { "Content-Type": PROTOBUF_TYPE } });
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
            return new Response(body, { status: 200, headers: { "Content-Type": STREAM_TYPE } });
        }
        if (input.endsWith("/state")) {
            stateCalls++;
            if (stateFailure !== null) return protobuf(stateFailure, encodeApiError("x", "failed"));
            return protobuf(200, encodeState(state));
        }
        return protobuf(404, encodeApiError("not_found", "no such route"));
    }) as unknown as typeof fetch;

    return {
        fetch: fakeFetch,
        pushFrame(frame: Pick<Frame, "data">): void {
            (streams[streams.length - 1] as Stream).push(delimited(frame.data));
        },
        closeStream: () => (streams[streams.length - 1] as Stream).close(),
        streamCalls: () => streams.length,
        stateCalls: () => stateCalls,
        setState: (next: SessionState) => void (state = next),
        failState: (status: number | null) => void (stateFailure = status),
    };
}
