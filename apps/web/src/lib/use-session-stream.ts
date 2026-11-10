"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    ApiRequestError,
    firstViewableChange,
    preferredFilePath,
    type ApiErrorKind,
    type ChangeType,
    type Checkpoint,
    type CheckpointChange,
    type SSEEvent,
    type SessionState,
    type StreamStatus,
} from "@biga/types";
import { useEditorStore } from "@biga/stores/editor-store";
import { useFileTreeStore } from "@biga/stores/file-tree-store";
import { useHistoryStore } from "@biga/stores/history-store";
import { useSessionStore } from "@biga/stores/session-store";
import { useViewerPrefsStore } from "@biga/stores/viewer-prefs-store";
import { createSequencer } from "@biga/viewer-core/pipeline/sequencer";

import { apiUrl } from "./api-url";
import { contentCache } from "./content-cache";
import { fetchCheckpoint, fetchSessionState } from "./session-api";

export { STATUS_DOT, STATUS_LABELS } from "@/features/viewer/shell/status-meta";

export type LoadError = { kind: ApiErrorKind };

type StreamResult = {
    status: StreamStatus;
    /** True once the stores are hydrated and the first file has been chosen. */
    ready: boolean;
    /** Why the first load failed. Only set while `status` is `unavailable`. */
    error: LoadError | null;
    /** Full teardown and reload. For a session that never loaded. */
    retry: () => void;
    /** Re-open the live stream and catch up, keeping open tabs and state. */
    reconnect: () => void;
};

export function decorationsFromChanges(
    changes: CheckpointChange[]
): Map<string, ChangeType> {
    const map = new Map<string, ChangeType>();
    for (const change of changes) {
        map.set(change.path, change.changeType);
    }
    return map;
}

export type EventStores = {
    history: Pick<ReturnType<typeof useHistoryStore.getState>, "addLive" | "selectedSeq">;
    tree: Pick<ReturnType<typeof useFileTreeStore.getState>, "applyChanges" | "setDecorations" | "setTree">;
    session: Pick<ReturnType<typeof useSessionStore.getState>, "setStatus">;
};

/**
 * Applies a single SSE event to the provided stores. Pure function — no React
 * hooks, no I/O. `onSessionEnded` is a callback so the hook can close the
 * EventSource and update React state without coupling this function to either.
 *
 * Extracting this makes the store-mutation logic testable by passing mock
 * stores directly, without mounting a component or mocking EventSource.
 */
export function applySSEEvent(
    event: SSEEvent,
    stores: EventStores,
    onSessionEnded: () => void
): void {
    if (event.type === "checkpoint") {
        const checkpoint = event.payload;
        stores.history.addLive(checkpoint);
        stores.tree.applyChanges(checkpoint.changes);
        if (stores.history.selectedSeq === null) {
            stores.tree.setDecorations(decorationsFromChanges(checkpoint.changes));
        }
        return;
    }

    if (event.type === "snapshot") {
        stores.tree.setTree(event.payload.tree);
        return;
    }

    if (event.type === "session_ended") {
        stores.session.setStatus("ended");
        onSessionEnded();
    }
}

export type HydrateStores = {
    session: Pick<ReturnType<typeof useSessionStore.getState>, "setSession" | "setLoadMode">;
    history: Pick<ReturnType<typeof useHistoryStore.getState>, "setInitial">;
    tree: Pick<ReturnType<typeof useFileTreeStore.getState>, "setTree">;
};

/**
 * Populates all session stores from the initial `/state` payload. Pure
 * function — no React hooks, no network calls. Returns the file to fall back
 * on when no recent change points somewhere better.
 *
 * Testable by passing mock stores and a SessionState fixture without mounting
 * a component or stubbing fetch.
 */
export function hydrateStoresFromState(
    state: SessionState,
    stores: HydrateStores,
    cache: Pick<typeof contentCache, "prefill">
): { fallbackFile: string | undefined } {
    stores.session.setSession(state.session);
    stores.session.setLoadMode(state.mode);
    stores.history.setInitial(state.checkpoints);

    if (state.contents) {
        cache.prefill(state.contents);
    }

    let fallbackFile: string | undefined;
    if (state.snapshot) {
        stores.tree.setTree(state.snapshot.tree);
        fallbackFile = preferredFilePath(state.snapshot.tree);
    }

    return { fallbackFile };
}

/** Open a file in the editor and reveal it in the tree. */
function revealFile(path: string) {
    const tree = useFileTreeStore.getState();
    tree.setSelectedPath(path);
    tree.expandAncestors(path);
    useEditorStore.getState().openFile(path);
}

function toLoadError(caught: unknown): LoadError {
    return { kind: caught instanceof ApiRequestError ? caught.kind : "server" };
}

export function useSessionStream(sessionId: string, initialCheckpointSeq?: number): StreamResult {
    const [status, setStatus] = useState<StreamStatus>("connecting");
    const [error, setError] = useState<LoadError | null>(null);
    const [ready, setReady] = useState(false);
    // Bumping this re-runs the effect below: full teardown + re-hydrate + resubscribe.
    const [retryNonce, setRetryNonce] = useState(0);
    // Set by the effect so the manual "Reconnect" action can reach its closure.
    const reconnectRef = useRef<() => void>(() => {});

    useEffect(() => {
        let eventSource: EventSource | null = null;
        let syncController: AbortController | undefined;
        let cancelled = false;
        let hydrated = false;
        let ended = false;

        const markEnded = () => {
            ended = true;
            setStatus("ended");
            eventSource?.close();
        };

        const events = createSequencer({
            apply: (event) => {
                if (ended) return;
                applySSEEvent(
                    event,
                    {
                        history: useHistoryStore.getState(),
                        tree: useFileTreeStore.getState(),
                        session: useSessionStore.getState(),
                    },
                    markEnded
                );

                // Follow mode: bring the file the broadcaster just saved to the
                // front, unless the viewer is busy browsing an older checkpoint.
                if (
                    event.type === "checkpoint" &&
                    useViewerPrefsStore.getState().follow &&
                    useHistoryStore.getState().selectedSeq === null
                ) {
                    const path = firstViewableChange(event.payload.changes);
                    if (path) {
                        revealFile(path);
                    }
                }
            },
            resynchronize: () => {
                if (eventSource) void synchronize(eventSource, true);
            },
        });

        const readInitialCheckpoint = async (state: SessionState, signal: AbortSignal) => {
            if (initialCheckpointSeq !== undefined) {
                try {
                    return await fetchCheckpoint(sessionId, initialCheckpointSeq, signal);
                } catch {
                    if (signal.aborted) return undefined;
                }
            }
            const latest = state.checkpoints[0];
            if (!latest || latest.seq === 0 || latest.seq === initialCheckpointSeq) return undefined;
            try {
                return await fetchCheckpoint(sessionId, latest.seq, signal);
            } catch {
                return undefined;
            }
        };

        const hydrate = (state: SessionState, checkpoint?: Checkpoint) => {
            const { fallbackFile } = hydrateStoresFromState(
                state,
                {
                    session: useSessionStore.getState(),
                    history: useHistoryStore.getState(),
                    tree: useFileTreeStore.getState(),
                },
                contentCache
            );
            let path = fallbackFile;
            if (checkpoint) {
                const history = useHistoryStore.getState();
                history.cacheCheckpoint(checkpoint);
                if (checkpoint.seq === initialCheckpointSeq) {
                    history.selectSeq(checkpoint.seq);
                }
                const tree = useFileTreeStore.getState();
                tree.setDecorations(decorationsFromChanges(checkpoint.changes));
                const changed = firstViewableChange(checkpoint.changes);
                if (changed && tree.headMeta.has(changed)) path = changed;
            }
            if (path) revealFile(path);
            hydrated = true;
            setReady(true);
        };

        const synchronize = async (source: EventSource, subscribed: boolean) => {
            syncController?.abort();
            const controller = new AbortController();
            syncController = controller;
            try {
                const state = await fetchSessionState(sessionId, controller.signal);
                if (controller.signal.aborted) return;
                if (hydrated) {
                    if (state.contents) contentCache.prefill(state.contents);
                    if (state.snapshot) useFileTreeStore.getState().setTree(state.snapshot.tree);
                    useHistoryStore.getState().mergeNewer(state.checkpoints);
                    useSessionStore.getState().setSession(state.session);
                    useSessionStore.getState().setLoadMode(state.mode);
                } else {
                    const checkpoint = await readInitialCheckpoint(state, controller.signal);
                    if (controller.signal.aborted) return;
                    hydrate(state, checkpoint);
                }

                if (state.session.status !== "active") {
                    markEnded();
                } else {
                    if (subscribed) events.resume(state);
                    if (!ended) {
                        if (subscribed && source.readyState === EventSource.OPEN) {
                            setStatus("live");
                        } else {
                            setStatus(source.readyState === EventSource.CLOSED ? "offline" : "reconnecting");
                        }
                    }
                }
            } catch (caught) {
                if (controller.signal.aborted) return;
                source.close();
                if (hydrated) {
                    setStatus("offline");
                } else {
                    setError(toLoadError(caught));
                    setStatus("unavailable");
                }
            } finally {
                if (syncController === controller) syncController = undefined;
            }
        };

        const connect = () => {
            syncController?.abort();
            eventSource?.close();
            events.pause();
            const source = new EventSource(apiUrl(`/api/sessions/${sessionId}/stream`));
            eventSource = source;
            const isCurrent = () => source === eventSource && !cancelled && !ended;

            const forward = (raw: MessageEvent<string>) => {
                if (!isCurrent()) return;
                let event: SSEEvent;
                try {
                    event = JSON.parse(raw.data) as SSEEvent;
                } catch {
                    return;
                }
                events.push(event);
            };

            source.addEventListener("checkpoint", forward);
            source.addEventListener("snapshot", forward);
            source.addEventListener("session_ended", forward);
            source.addEventListener("connected", () => {
                if (!isCurrent()) return;
                events.pause();
                void synchronize(source, true);
            });
            source.onerror = () => {
                if (!isCurrent()) return;
                if (hydrated) {
                    setStatus(source.readyState === EventSource.CLOSED ? "offline" : "reconnecting");
                } else if (!syncController) {
                    void synchronize(source, false);
                }
            };
        };

        reconnectRef.current = () => {
            if (ended || cancelled) return;
            setStatus("reconnecting");
            connect();
        };

        connect();

        return () => {
            cancelled = true;
            reconnectRef.current = () => {};
            syncController?.abort();
            eventSource?.close();
            useEditorStore.getState().clearAll();
            useFileTreeStore.getState().clearTree();
            useHistoryStore.getState().clear();
            useSessionStore.getState().clearSession();
            contentCache.clear();
        };
    }, [sessionId, initialCheckpointSeq, retryNonce]);

    const retry = useCallback(() => {
        setError(null);
        setReady(false);
        setStatus("connecting");
        setRetryNonce((nonce) => nonce + 1);
    }, []);

    const reconnect = useCallback(() => reconnectRef.current(), []);

    return { status, ready, error, retry, reconnect };
}
