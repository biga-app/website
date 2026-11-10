import {
    ApiRequestError,
    type ApiErrorKind,
    type Checkpoint,
    type CheckpointSummary,
    type FileContent,
    type FileHistoryEntry,
    type SessionState,
} from "@biga/types";

import { apiUrl } from "./api-url";

type ApiEnvelope<T> =
    | { ok: true; data: T }
    | { ok: false; error: { code: string; message: string } };

function kindForStatus(status: number): ApiErrorKind {
    if (status === 404) return "not_found";
    if (status === 429) return "rate_limited";
    return "server";
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
    let response: Response;
    try {
        response = await fetch(apiUrl(url), { signal, cache: "no-store" });
    } catch (error) {
        if (signal?.aborted) {
            throw error;
        }
        throw new ApiRequestError("network", "Unable to reach the server. Check your connection and try again.");
    }
    let body: ApiEnvelope<T>;
    try {
        body = (await response.json()) as ApiEnvelope<T>;
    } catch {
        throw new ApiRequestError(
            kindForStatus(response.status),
            `The server returned an unexpected response (${response.status}).`,
            response.status
        );
    }
    if (!response.ok || !body.ok) {
        const message = body.ok ? response.statusText : body.error.message;
        throw new ApiRequestError(
            kindForStatus(response.status),
            message || "The request failed.",
            response.status
        );
    }
    return body.data;
}

/**
 * Fetches the full initial state for a session: the current snapshot tree,
 * recent checkpoint summaries, load mode, and (in eager mode) a content map.
 */
export function fetchSessionState(
    sessionId: string,
    signal?: AbortSignal
): Promise<SessionState> {
    return getJson<SessionState>(`/api/sessions/${sessionId}/state`, signal);
}

/**
 * Fetches a file's content at a specific version. `ref` accepts a 64-hex blob
 * hash for a direct content-addressed lookup, the literal "latest" for the
 * current head version, or a checkpoint sequence number to retrieve the file
 * as it existed at that point in history.
 */
export function fetchFileContent(
    sessionId: string,
    path: string,
    ref: string,
    signal?: AbortSignal
): Promise<FileContent> {
    const query = new URLSearchParams({ path, ref });
    return getJson<FileContent>(
        `/api/sessions/${sessionId}/file?${query.toString()}`,
        signal
    );
}

/**
 * Fetches a single checkpoint with its full per-file change list. Called lazily
 * when the user opens a checkpoint entry in the timeline panel.
 */
export function fetchCheckpoint(
    sessionId: string,
    seq: number,
    signal?: AbortSignal
): Promise<Checkpoint> {
    return getJson<Checkpoint>(
        `/api/sessions/${sessionId}/checkpoints/${seq}`,
        signal
    );
}

/**
 * Fetches the revision history of a single file: every checkpoint that touched
 * `path`, newest first. Used by the per-file timeline sheet in the editor.
 */
export async function fetchFileHistory(
    sessionId: string,
    path: string,
    signal?: AbortSignal
): Promise<FileHistoryEntry[]> {
    const query = new URLSearchParams({ path });
    const data = await getJson<{ history: FileHistoryEntry[] }>(
        `/api/sessions/${sessionId}/file/history?${query.toString()}`,
        signal
    );
    return data.history;
}

/**
 * Fetches a page of checkpoint summaries ordered newest-first. Supports cursor-
 * based pagination via `before` (exclusive seq upper bound) and `limit`.
 */
export async function fetchCheckpoints(
    sessionId: string,
    opts: { before?: number; limit?: number } = {},
    signal?: AbortSignal
): Promise<CheckpointSummary[]> {
    const query = new URLSearchParams();
    if (opts.before !== undefined) {
        query.set("before", String(opts.before));
    }
    if (opts.limit !== undefined) {
        query.set("limit", String(opts.limit));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const data = await getJson<{ checkpoints: CheckpointSummary[] }>(
        `/api/sessions/${sessionId}/checkpoints${suffix}`,
        signal
    );
    return data.checkpoints;
}
