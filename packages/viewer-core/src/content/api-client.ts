import { ApiRequestError, type ApiErrorKind } from "@biga/types/api";
import { CheckpointSchema, type Checkpoint, type CheckpointSummary, type FileHistoryEntry } from "@biga/types/checkpoint";
import type { ApiClient, ApiClientOptions, RequestOptions } from "@biga/types/content";
import { isValidHash } from "@biga/types/file-identity";
import { CheckpointsResponseSchema, FileContentSchema, FileHistoryResponseSchema, SessionStateSchema, type FileContent, type SessionState } from "@biga/types/state";
import { decodeApiError, decodeCheckpoint, decodeCheckpointList, decodeFileContent, decodeFileHistory, decodeState, PROTOBUF_TYPE } from "@biga/types/wire";

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

function isProtobuf(response: Response): boolean {
    return response.headers.get("Content-Type")?.startsWith(PROTOBUF_TYPE) ?? false;
}

async function readBytes(response: Response, signal: AbortSignal | undefined): Promise<Uint8Array | null> {
    try {
        return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
        if (signal?.aborted) throw error;
        return null;
    }
}

async function failureMessage(response: Response): Promise<string> {
    const fallback = response.statusText || "The request failed.";
    if (!isProtobuf(response)) return fallback;
    try {
        return decodeApiError(new Uint8Array(await response.arrayBuffer())).message || fallback;
    } catch {
        return fallback;
    }
}

async function readSuccess(response: Response, signal: AbortSignal | undefined): Promise<Uint8Array> {
    const retryAfterMs = parseRetryAfter(response.headers.get("Retry-After"));
    if (!response.ok) {
        throw new ApiRequestError(kindForStatus(response.status), await failureMessage(response), response.status, retryAfterMs);
    }
    const bytes = isProtobuf(response) ? await readBytes(response, signal) : null;
    if (bytes === null) {
        throw new ApiRequestError(
            isProtobuf(response) ? "network" : "invalid",
            `The server returned an unexpected response (${response.status}).`,
            response.status,
            retryAfterMs
        );
    }
    return bytes;
}

function parseWith<T>(schema: Parser<T>, decode: () => unknown): T {
    let value: unknown;
    try {
        value = decode();
    } catch {
        throw new ApiRequestError("invalid", "The server sent data the viewer does not understand.");
    }
    const result = schema.safeParse(value);
    if (!result.success) throw new ApiRequestError("invalid", "The server sent data the viewer does not understand.");
    return result.data;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
    const attempts = options.maxAttempts ?? DEFAULT_ATTEMPTS;
    const backoff = options.backoffMs ?? DEFAULT_BACKOFF_MS;

    async function attempt(path: string, cache: RequestCache, request: RequestOptions): Promise<Uint8Array> {
        let response: Response;
        try {
            response = await options.fetch(options.baseUrl + path, {
                headers: { Accept: PROTOBUF_TYPE },
                cache,
                signal: request.signal,
                priority: request.priority,
            } as RequestInit);
        } catch (error) {
            if (request.signal?.aborted) throw error;
            throw new ApiRequestError("network", "Unable to reach the server. Check your connection and try again.");
        }
        return readSuccess(response, request.signal);
    }

    async function send(path: string, cache: RequestCache, request: RequestOptions): Promise<Uint8Array> {
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
            const bytes = await send(`/api/sessions/${sessionId}/state`, "no-store", request);
            return parseWith(SessionStateSchema, () => decodeState(bytes));
        },
        async getFile(sessionId: string, path: string, ref: string, request: RequestOptions = {}): Promise<FileContent> {
            const query = new URLSearchParams({ path, ref });
            const bytes = await send(`/api/sessions/${sessionId}/file?${query}`, cacheModeFor(ref), request);
            return parseWith(FileContentSchema, () => decodeFileContent(bytes));
        },
        async getCheckpoint(sessionId: string, seq: number, request: RequestOptions = {}): Promise<Checkpoint> {
            const bytes = await send(`/api/sessions/${sessionId}/checkpoints/${seq}`, "no-store", request);
            return parseWith(CheckpointSchema, () => decodeCheckpoint(bytes));
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
            const bytes = await send(`/api/sessions/${sessionId}/checkpoints${suffix}`, "no-store", request);
            return parseWith(CheckpointsResponseSchema, () => ({ checkpoints: decodeCheckpointList(bytes) })).checkpoints;
        },
        async getFileHistory(sessionId: string, path: string, request: RequestOptions = {}): Promise<FileHistoryEntry[]> {
            const query = new URLSearchParams({ path });
            const bytes = await send(`/api/sessions/${sessionId}/file/history?${query}`, "no-store", request);
            return parseWith(FileHistoryResponseSchema, () => ({ history: decodeFileHistory(bytes) })).history;
        },
    };
}
