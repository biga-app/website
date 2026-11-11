import type { Checkpoint } from "@biga/types/checkpoint";
import type { ApiClient, BlobEntry, RequestOptions } from "@biga/types/content";
import { KIND_FILE } from "@biga/types/tree-table";
import type { SessionPort } from "@biga/types/worker";
import { createApiClient } from "@biga/viewer-core/content/api-client";
import { createBlobStore, defaultBudgetBytes } from "@biga/viewer-core/content/blob-store";
import type { ShareKey } from "@biga/viewer-core/crypto/content-crypto";
import { applyBatch, type WritableStores } from "@biga/viewer-core/runtime/apply-batch";
import { createPrefetcher } from "@biga/viewer-core/runtime/prefetcher";
import { createSessionClient } from "@biga/viewer-core/runtime/session-client";
import { createInThreadPort } from "@biga/viewer-core/runtime/session-host";
import { abortableSleep, systemClock } from "@biga/viewer-core/runtime/system-env";
import { createConnectionStore } from "@biga/viewer-core/stores/connection-store";
import { createHistoryStore } from "@biga/viewer-core/stores/history-store";
import { createSessionStore } from "@biga/viewer-core/stores/session-store";
import { createTreeStore } from "@biga/viewer-core/stores/tree-store";
import { createWorkspaceStore } from "@biga/viewer-core/stores/workspace-store";


const BLOB_ENTRIES = 200;
const ACTIVITY_WINDOW_MS = 10_000;
const PREFETCH_DWELL_MS = 80;
const PREFETCH_CONCURRENCY = 4;
const PREFETCH_MAX_BYTES = 256 * 1024;

function nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function deviceMemoryGiB(): number | undefined {
    return (navigator as { deviceMemory?: number }).deviceMemory;
}

function saveDataEnabled(): boolean {
    return (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true;
}

function createWorkerPort(baseUrl: string): SessionPort | null {
    if (typeof Worker === "undefined") return null;
    try {
        const worker = new Worker(new URL("./session-worker.ts", import.meta.url), { type: "module" });
        worker.postMessage({ type: "configure", baseUrl });
        worker.addEventListener("error", (event) => console.error("viewer worker failed", event.message, event));
        return {
            send: (request) => worker.postMessage(request),
            listen: (listener) => {
                worker.onmessage = (event) => listener(event.data);
            },
            terminate: () => worker.terminate(),
        };
    } catch {
        return null;
    }
}

export type SessionRuntimeOptions = {
    sessionId: string;
    baseUrl?: string;
    fetch?: typeof fetch;
    thread?: "worker" | "inline";
    initialCheckpointSeq?: number;
    /** The key from the share link, for an encrypted session. */
    key?: ShareKey | null;
};

export type SessionControls = {
    start: () => void;
    stop: () => void;
    reconnect: () => void;
    retry: () => void;
    setHidden: (hidden: boolean) => void;
    notifyOnline: () => void;
};

export function createRuntimeCore(sessionId: string, api: ApiClient) {
    const stores: WritableStores = {
        connection: createConnectionStore(),
        session: createSessionStore(),
        tree: createTreeStore(),
        history: createHistoryStore(),
        workspace: createWorkspaceStore(),
    };
    const blobs = createBlobStore({ budgetBytes: defaultBudgetBytes(deviceMemoryGiB()), maxEntries: BLOB_ENTRIES });
    const followListeners = new Set<(path: string) => void>();
    let lastActivityAt = Number.NEGATIVE_INFINITY;

    function loadBlob(hash: string, path: string, request?: RequestOptions): Promise<BlobEntry> {
        return blobs.load(hash, async () => (await api.getFile(sessionId, path, hash, request)).content);
    }

    function prefetchBlob(path: string): Promise<unknown> {
        const entry = stores.tree.getState().reader.entry(path);
        const skip =
            !entry || entry.kind !== KIND_FILE || entry.binary || !entry.hash || entry.size > PREFETCH_MAX_BYTES || blobs.has(entry.hash) || saveDataEnabled();
        return skip ? Promise.resolve() : loadBlob(entry.hash, path, { priority: "low" });
    }

    const prefetcher = createPrefetcher({ clock: systemClock, dwellMs: PREFETCH_DWELL_MS, concurrency: PREFETCH_CONCURRENCY, run: prefetchBlob });

    async function loadCheckpoint(seq: number): Promise<Checkpoint> {
        const cached = stores.history.getState().loaded.get(seq);
        if (cached) return cached;
        const checkpoint = await api.getCheckpoint(sessionId, seq);
        stores.history.getState().cache(checkpoint);
        return checkpoint;
    }

    return {
        sessionId,
        stores,
        blobs,
        api,
        loadBlob,
        loadCheckpoint,
        prefetchFile: prefetcher.hover,
        cancelPrefetch: prefetcher.leave,
        emitFollow: (path: string) => followListeners.forEach((listener) => listener(path)),
        onFollow(listener: (path: string) => void): () => void {
            followListeners.add(listener);
            return () => void followListeners.delete(listener);
        },
        noteActivity: () => void (lastActivityAt = Date.now()),
        recentlyActive: () => Date.now() - lastActivityAt < ACTIVITY_WINDOW_MS,
    };
}

export type RuntimeCore = ReturnType<typeof createRuntimeCore>;

export type SessionRuntime = RuntimeCore &
    SessionControls & {
        /** The share link's key as text, to put back into links the viewer copies. */
        shareKey: string | null;
    };

export function createSessionRuntime(options: SessionRuntimeOptions): SessionRuntime {
    const { sessionId, key = null } = options;
    const baseUrl = options.baseUrl ?? "";
    const fetcher: typeof fetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
    const core = createRuntimeCore(sessionId, createApiClient({ baseUrl, fetch: fetcher, sleep: abortableSleep, key: key?.bytes ?? null }));

    const client = createSessionClient({
        createPort: () => options.thread === "inline" ? null : createWorkerPort(baseUrl),
        createFallbackPort: () =>
            createInThreadPort({ baseUrl, fetch: fetcher, clock: systemClock, random: Math.random, sleep: abortableSleep }),
        onBatch: (batch, done) => {
            void nextFrame()
                .then(() => applyBatch(core.stores, batch, { prefillBlobs: core.blobs.prefill, nextFrame }))
                .then((target) => {
                    if (target) core.emitFollow(target);
                    done();
                });
        },
        onUnavailable: (kind) => core.stores.connection.getState().setUnavailable(kind),
    });

    return {
        ...core,
        shareKey: key?.text ?? null,
        start: () => client.start({ sessionId, initialCheckpointSeq: options.initialCheckpointSeq, key: key?.text }),
        stop: () => client.stop(),
        reconnect: () => client.reconnect(),
        retry: () => client.retry(),
        setHidden: (hidden) => client.setHidden(hidden),
        notifyOnline: () => client.notifyOnline(),
    };
}
