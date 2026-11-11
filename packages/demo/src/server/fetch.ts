import { isValidHash } from "@biga/types/file-identity";
import { PROTOBUF_TYPE, STREAM_TYPE } from "@biga/types/wire";
import { delimited, encodeApiError, encodeCheckpoint, encodeCheckpointList, encodeFileContent, encodeFileHistory, encodeSession, encodeState, encodeStreamEvent } from "../wire.ts";
import { fileAt, fileHistory, sessionResponse, sha, state, summary, type Session } from "./session.ts";

function response(bytes: Uint8Array, status = 200, cache = "no-store") {
    return new Response(new Uint8Array(bytes), { status, headers: { "Content-Type": PROTOBUF_TYPE, "Cache-Control": cache } });
}

const missing = (message: string) => response(encodeApiError("not_found", message), 404);

function stream(session: Session, url: URL, signal?: AbortSignal | null): Response {
    let dispose = () => {};
    const body = new ReadableStream<Uint8Array>({
        start(controller) {
            let closed = false;
            const send = (event: Parameters<typeof encodeStreamEvent>[0]) => {
                if (closed) return;
                controller.enqueue(delimited(encodeStreamEvent(event)));
                if (event !== "keepalive" && event.type === "session_ended") close();
            };
            const keepalive = setInterval(() => send("keepalive"), 15_000);
            const close = () => {
                if (closed) return;
                closed = true;
                clearInterval(keepalive);
                session.subscribers.delete(send);
                signal?.removeEventListener("abort", close);
                controller.close();
            };
            dispose = close;
            const after = url.searchParams.get("after");
            const replayed = after !== null && Number(url.searchParams.get("snapshot")) === session.snapshotAt;
            send({ type: "connected", sessionId: session.id, timestamp: session.updatedAt, replayed });
            if (replayed) for (const checkpoint of session.checkpoints) if (checkpoint.seq > Number(after)) send({ type: "checkpoint", payload: checkpoint });
            if (session.status === "ended") send({ type: "session_ended", sessionId: session.id, timestamp: session.updatedAt });
            else session.subscribers.add(send);
            signal?.addEventListener("abort", close, { once: true });
            if (signal?.aborted) close();
        },
        cancel: () => dispose(),
    });
    return new Response(body, { headers: { "Content-Type": STREAM_TYPE, "Cache-Control": "no-cache, no-transform" } });
}

export function createDemoFetch(session: Session): typeof fetch {
    return async (input, init) => {
        const request = input instanceof Request ? input : null;
        const signal = init?.signal ?? request?.signal;
        signal?.throwIfAborted();
        const url = new URL(request?.url ?? String(input), "http://biga.demo");
        if ((init?.method ?? request?.method ?? "GET") !== "GET") return response(encodeApiError("method_not_allowed", "Use GET"), 405);
        const prefix = `/api/sessions/${encodeURIComponent(session.id)}`;
        if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) return missing("Session not found");
        const route = url.pathname.slice(prefix.length).replace(/^\//, "");
        if (!route) return response(encodeSession(sessionResponse(session)));
        if (route === "state") return response(encodeState(state(session)));
        if (route === "stream") return stream(session, url, signal);
        if (route === "checkpoints") {
            const before = url.searchParams.get("before");
            const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
            const page = session.checkpoints.filter((checkpoint) => before === null || checkpoint.seq < Number(before));
            return response(encodeCheckpointList(page.slice(-limit).reverse().map(summary)));
        }
        const one = /^checkpoints\/(\d+)$/.exec(route);
        if (one) {
            const checkpoint = session.checkpoints[Number(one[1])];
            return checkpoint ? response(encodeCheckpoint(checkpoint)) : missing("Checkpoint not found");
        }
        const path = url.searchParams.get("path") ?? "";
        if (route === "file/history") return response(encodeFileHistory(fileHistory(session, path)));
        if (route === "file") {
            const ref = url.searchParams.get("ref") ?? "latest";
            const content = fileAt(session, path, ref);
            if (content === undefined) return missing("File not found");
            const binary = session.binary.has(path);
            return response(encodeFileContent({ content: binary ? "" : content, binary, hash: await sha(content) }), 200, isValidHash(ref) ? "public, max-age=31536000, immutable" : "no-store");
        }
        return missing("Route not found");
    };
}
