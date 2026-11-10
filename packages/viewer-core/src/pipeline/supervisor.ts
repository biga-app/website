import { ApiRequestError, type ApiErrorKind } from "@biga/types/api";
import type { Checkpoint } from "@biga/types/checkpoint";
import type { StreamEvent } from "@biga/types/events";
import type { SupervisorOptions } from "@biga/types/pipeline";
import type { SessionState } from "@biga/types/state";
import type { StreamStatus, TransportEvent } from "@biga/types/stream";

import { createDecoder } from "./decoder.ts";
import { createSequencer } from "./sequencer.ts";

const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30_000;
export const MAX_ATTEMPTS = 8;
export const WATCHDOG_MS = 45_000;
export const HEALTHY_MS = 30_000;
const HIDDEN_RELEASE_MS = 30_000;

const JITTER_FLOOR = 0.75;
const JITTER_SPREAD = 0.5;

export function backoffMs(attempt: number, random: number): number {
    const base = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (attempt - 1));
    return Math.round(base * (JITTER_FLOOR + JITTER_SPREAD * random));
}

function isFinalHttpStatus(status: number | undefined): boolean {
    if (status === undefined || status < 400 || status >= 500) return false;
    return ![408, 425, 429].includes(status);
}

function newestSeq(state: SessionState): number {
    return state.checkpoints.reduce((newest, checkpoint) => Math.max(newest, checkpoint.seq), -1);
}

export function createSupervisor(options: SupervisorOptions) {
    let status: StreamStatus = "connecting";
    let hydrated = false;
    let ended = false;
    let stopped = false;
    let subscribed = false;
    let streamOpen = false;
    let epoch = 0;
    let attempts = 0;
    let syncing = false;
    let rerun = false;
    let liveSince: number | null = null;
    let hiddenSince: number | null = null;
    let released = false;
    let cancelRelease: (() => void) | null = null;
    let connection: AbortController | null = null;
    let syncController: AbortController | null = null;
    let cancelWatchdog: (() => void) | null = null;
    let cancelReconnect: (() => void) | null = null;

    function setStatus(next: StreamStatus): void {
        if (status === next) return;
        status = next;
        options.sink.status(next);
    }

    function clearTimers(): void {
        cancelWatchdog?.();
        cancelReconnect?.();
        cancelRelease?.();
        cancelWatchdog = null;
        cancelReconnect = null;
        cancelRelease = null;
    }

    function closeConnection(): void {
        epoch++;
        connection?.abort();
        connection = null;
        streamOpen = false;
        cancelWatchdog?.();
        cancelWatchdog = null;
    }

    function markDisconnected(): void {
        if (liveSince !== null && options.clock.now() - liveSince >= HEALTHY_MS) attempts = 0;
        liveSince = null;
    }

    function finish(): void {
        ended = true;
        closeConnection();
        syncController?.abort();
        clearTimers();
        setStatus("ended");
    }

    function applyEvent(event: StreamEvent): void {
        if (event.type === "checkpoint") options.sink.checkpoint(event.payload);
        else if (event.type === "snapshot") options.sink.snapshot(options.buildTable(event.payload.tree));
        else if (event.type === "session_ended") finish();
    }

    const sequencer = createSequencer({ apply: applyEvent, resynchronize: () => void sync() });

    async function readInitialCheckpoint(state: SessionState, signal: AbortSignal): Promise<Checkpoint | null> {
        const wanted = options.initialCheckpointSeq;
        if (wanted !== undefined) {
            try {
                return await options.api.getCheckpoint(options.sessionId, wanted, { signal });
            } catch {
                if (signal.aborted) return null;
            }
        }
        const latest = newestSeq(state);
        if (latest <= 0 || latest === wanted) return null;
        try {
            return await options.api.getCheckpoint(options.sessionId, latest, { signal });
        } catch {
            return null;
        }
    }

    function fail(error: unknown): void {
        const kind: ApiErrorKind = error instanceof ApiRequestError ? error.kind : "server";
        if (!hydrated) {
            closeConnection();
            clearTimers();
            setStatus("unavailable");
            options.onUnavailable(kind);
            return;
        }
        closeConnection();
        scheduleReconnect(error instanceof ApiRequestError ? error.retryAfterMs : null);
    }

    async function runSync(): Promise<void> {
        const controller = new AbortController();
        syncController = controller;
        const { signal } = controller;
        try {
            const state = await options.api.getState(options.sessionId, { signal });
            if (signal.aborted) return;
            const initial = hydrated ? null : await readInitialCheckpoint(state, signal);
            if (signal.aborted) return;
            options.sink.hydrate({
                reason: hydrated ? "resync" : "initial",
                session: state.session,
                mode: state.mode,
                table: state.snapshot ? options.buildTable(state.snapshot.tree) : null,
                summaries: state.checkpoints,
                contents: state.contents ?? null,
                initial,
            });
            hydrated = true;
            if (state.session.status !== "active") return finish();
            if (subscribed) sequencer.resume(state);
            if (ended) return;
            if (subscribed && streamOpen) {
                liveSince = options.clock.now();
                setStatus("live");
            } else {
                setStatus("reconnecting");
            }
        } catch (error) {
            if (!signal.aborted) fail(error);
        } finally {
            if (syncController === controller) syncController = null;
        }
    }

    async function sync(): Promise<void> {
        if (syncing) {
            rerun = true;
            return;
        }
        syncing = true;
        try {
            do {
                rerun = false;
                await runSync();
            } while (rerun && !stopped && !ended);
        } finally {
            syncing = false;
        }
    }

    function scheduleReconnect(retryAfterMs: number | null | undefined): void {
        if (stopped || ended) return;
        attempts++;
        if (attempts > MAX_ATTEMPTS) {
            setStatus("offline");
            return;
        }
        if (hydrated) setStatus("reconnecting");
        const delay = retryAfterMs ?? backoffMs(attempts, options.random());
        cancelReconnect?.();
        cancelReconnect = options.clock.setTimer(() => {
            cancelReconnect = null;
            connect();
        }, delay);
    }

    function onClosed(event: Extract<TransportEvent, { type: "closed" }>): void {
        cancelWatchdog?.();
        cancelWatchdog = null;
        streamOpen = false;
        markDisconnected();
        if (!hydrated && !subscribed) void sync();
        if (isFinalHttpStatus(event.status)) {
            if (hydrated) setStatus("offline");
            return;
        }
        scheduleReconnect(event.retryAfterMs);
    }

    function armWatchdog(mine: number): void {
        cancelWatchdog?.();
        cancelWatchdog = options.clock.setTimer(() => {
            if (mine !== epoch) return;
            markDisconnected();
            closeConnection();
            scheduleReconnect(null);
        }, WATCHDOG_MS);
    }

    function release(): void {
        cancelRelease = null;
        if (!hydrated || ended || stopped) return;
        released = true;
        closeConnection();
        cancelReconnect?.();
        cancelReconnect = null;
    }

    function connect(): void {
        if (stopped || ended) return;
        released = false;
        cancelReconnect?.();
        cancelReconnect = null;
        closeConnection();
        syncController?.abort();
        const mine = epoch;
        const controller = new AbortController();
        connection = controller;
        sequencer.pause();
        subscribed = false;
        const decoder = createDecoder({
            onEvent: (event) => {
                if (event.type !== "connected") return sequencer.push(event);
                subscribed = true;
                if (event.replayed) {
                    sequencer.resumeLive();
                    liveSince = options.clock.now();
                    setStatus("live");
                    return;
                }
                sequencer.pause();
                void sync();
            },
            onResync: () => void sync(),
        });
        const resume = hydrated ? sequencer.position() : null;
        void options.transport.connect(
            options.sessionId,
            controller.signal,
            (event) => {
                if (mine !== epoch || stopped || ended) return;
                if (event.type === "closed") return onClosed(event);
                if (event.type === "open") streamOpen = true;
                armWatchdog(mine);
                if (event.type === "frame") decoder.push(event.data);
            },
            resume
        );
    }

    return {
        get status() {
            return status;
        },
        start(): void {
            connect();
        },
        reconnect(): void {
            if (stopped || ended) return;
            attempts = 0;
            if (hydrated) setStatus("reconnecting");
            connect();
        },
        retry(): void {
            if (stopped || ended) return;
            attempts = 0;
            hydrated = false;
            clearTimers();
            setStatus("connecting");
            connect();
        },
        setHidden(hidden: boolean): void {
            if (hidden) {
                hiddenSince = options.clock.now();
                cancelRelease?.();
                cancelRelease = options.clock.setTimer(release, HIDDEN_RELEASE_MS);
                return;
            }
            cancelRelease?.();
            cancelRelease = null;
            const away = hiddenSince === null ? 0 : options.clock.now() - hiddenSince;
            hiddenSince = null;
            if (!hydrated || ended || stopped) return;
            if (released) {
                released = false;
                attempts = 0;
                connect();
                return;
            }
            if (away < HIDDEN_RELEASE_MS || !subscribed) return;
            sequencer.pause();
            void sync();
        },
        notifyOnline(): void {
            if (stopped || ended) return;
            if (!cancelReconnect && status !== "offline") return;
            attempts = 0;
            connect();
        },
        stop(): void {
            stopped = true;
            closeConnection();
            syncController?.abort();
            clearTimers();
        },
    };
}
