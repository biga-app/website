import {
    ApiRequestError,
    CheckpointSchema,
    CheckpointsResponseSchema,
    FileContentSchema,
    FileHistoryResponseSchema,
    SessionStateSchema,
    isValidHash,
    type ApiClient,
    type ApiClientOptions,
    type ApiErrorKind,
    type Checkpoint,
    type CheckpointSummary,
    type FileContent,
    type FileHistoryEntry,
    type RequestOptions,
    type SessionState,
} from "@biga/types";

import { parseRetryAfter } from "../http/retry-after.ts";

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 400;

type Parser<T> = { safeParse(data: unknown): { success: true; data: T } | { success: false } };

function kindForStatus(status: number): ApiErrorKind {
    if (status === 404) return "not_found";
    if (status === 429) return "rate_limited";
    return "server";
}

function isRetryable(error: ApiRequestError): boolean {
    return error.kind === "network" || error.kind === "server" || error.kind === "rate_limited";
}

function cacheModeFor(ref: string | null): RequestCache {
    return ref !== null && isValidHash(ref) ? "default" : "no-store";
}

async function readEnvelope(response: Response): Promise<unknown> {
    let body: { ok?: boolean; data?: unknown; error?: { message?: string } };
    try {
        body = await response.json();
    } catch {
        throw new ApiRequestError(
            kindForStatus(response.status),
            `The server returned an unexpected response (${response.status}).`,
            response.status,
            parseRetryAfter(response.headers.get("Retry-After"))
        );
    }
    if (!response.ok || body.ok !== true) {
        throw new ApiRequestError(
            kindForStatus(response.status),
            body.error?.message || response.statusText || "The request failed.",
            response.status,
            parseRetryAfter(response.headers.get("Retry-After"))
        );
    }
    return body.data;
}

function parseWith<T>(schema: Parser<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) throw new ApiRequestError("invalid", "The server sent data the viewer does not understand.");
    return result.data;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
    const attempts = options.maxAttempts ?? DEFAULT_ATTEMPTS;
    const backoff = options.backoffMs ?? DEFAULT_BACKOFF_MS;

    async function attempt(path: string, cache: RequestCache, request: RequestOptions): Promise<unknown> {
        let response: Response;
        try {
            response = await options.fetch(options.baseUrl + path, {
                cache,
                signal: request.signal,
                priority: request.priority,
            } as RequestInit);
        } catch (error) {
            if (request.signal?.aborted) throw error;
            throw new ApiRequestError("network", "Unable to reach the server. Check your connection and try again.");
        }
        return readEnvelope(response);
    }

    async function send(path: string, cache: RequestCache, request: RequestOptions): Promise<unknown> {
        let lastError: ApiRequestError | null = null;
        for (let index = 0; index < attempts; index++) {
            try {
                return await attempt(path, cache, request);
            } catch (error) {
                if (!(error instanceof ApiRequestError) || !isRetryable(error)) throw error;
                lastError = error;
                if (index === attempts - 1) break;
                await options.sleep(error.retryAfterMs ?? backoff * 2 ** index, request.signal);
            }
        }
        throw lastError;
    }

    return {
        async getState(sessionId: string, request: RequestOptions = {}): Promise<SessionState> {
            return parseWith(SessionStateSchema, await send(`/api/sessions/${sessionId}/state`, "no-store", request));
        },
        async getFile(sessionId: string, path: string, ref: string, request: RequestOptions = {}): Promise<FileContent> {
            const query = new URLSearchParams({ path, ref });
            const data = await send(`/api/sessions/${sessionId}/file?${query}`, cacheModeFor(ref), request);
            return parseWith(FileContentSchema, data);
        },
        async getCheckpoint(sessionId: string, seq: number, request: RequestOptions = {}): Promise<Checkpoint> {
            return parseWith(CheckpointSchema, await send(`/api/sessions/${sessionId}/checkpoints/${seq}`, "no-store", request));
        },
        async getCheckpoints(
            sessionId: string,
            page: { before?: number; limit?: number } = {},
            request: RequestOptions = {}
        ): Promise<CheckpointSummary[]> {
            const query = new URLSearchParams();
            if (page.before !== undefined) query.set("before", String(page.before));
            if (page.limit !== undefined) query.set("limit", String(page.limit));
            const suffix = query.size > 0 ? `?${query}` : "";
            const data = await send(`/api/sessions/${sessionId}/checkpoints${suffix}`, "no-store", request);
            return parseWith(CheckpointsResponseSchema, data).checkpoints;
        },
        async getFileHistory(sessionId: string, path: string, request: RequestOptions = {}): Promise<FileHistoryEntry[]> {
            const query = new URLSearchParams({ path });
            const data = await send(`/api/sessions/${sessionId}/file/history?${query}`, "no-store", request);
            return parseWith(FileHistoryResponseSchema, data).history;
        },
    };
}
