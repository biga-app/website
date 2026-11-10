import {
    CheckpointSchema,
    CheckpointsResponseSchema,
    FileContentSchema,
    FileHistoryResponseSchema,
    SessionStateSchema,
    isValidHash,
    type Checkpoint,
    type CheckpointSummary,
    type FileContent,
    type FileHistoryEntry,
    type SessionState,
} from "@biga/types";

export type ApiErrorKind = "not_found" | "rate_limited" | "network" | "server" | "invalid";

export class ApiError extends Error {
    readonly kind: ApiErrorKind;
    readonly status: number | null;
    readonly retryAfterMs: number | null;

    constructor(kind: ApiErrorKind, message: string, status: number | null = null, retryAfterMs: number | null = null) {
        super(message);
        this.name = "ApiError";
        this.kind = kind;
        this.status = status;
        this.retryAfterMs = retryAfterMs;
    }
}

export type ApiClientOptions = {
    baseUrl: string;
    fetch: typeof fetch;
    sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
    maxAttempts?: number;
    backoffMs?: number;
};

export type RequestOptions = {
    signal?: AbortSignal;
    priority?: "high" | "low" | "auto";
};

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 400;
const MAX_RETRY_AFTER_MS = 30_000;

type Parser<T> = { safeParse(data: unknown): { success: true; data: T } | { success: false } };

function kindForStatus(status: number): ApiErrorKind {
    if (status === 404) return "not_found";
    if (status === 429) return "rate_limited";
    return "server";
}

export function parseRetryAfter(header: string | null): number | null {
    if (header === null) return null;
    const seconds = Number(header);
    if (!Number.isFinite(seconds) || seconds < 0) return null;
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
}

function isRetryable(error: ApiError): boolean {
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
        throw new ApiError(
            kindForStatus(response.status),
            `The server returned an unexpected response (${response.status}).`,
            response.status,
            parseRetryAfter(response.headers.get("Retry-After"))
        );
    }
    if (!response.ok || body.ok !== true) {
        throw new ApiError(
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
    if (!result.success) throw new ApiError("invalid", "The server sent data the viewer does not understand.");
    return result.data;
}

export function createApiClient(options: ApiClientOptions) {
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
            throw new ApiError("network", "Unable to reach the server. Check your connection and try again.");
        }
        return readEnvelope(response);
    }

    async function send(path: string, cache: RequestCache, request: RequestOptions): Promise<unknown> {
        let lastError: ApiError | null = null;
        for (let index = 0; index < attempts; index++) {
            try {
                return await attempt(path, cache, request);
            } catch (error) {
                if (!(error instanceof ApiError) || !isRetryable(error)) throw error;
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

export type ApiClient = ReturnType<typeof createApiClient>;
