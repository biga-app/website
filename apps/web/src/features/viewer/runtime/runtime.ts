import type { BlobEntry, Checkpoint, SessionPort } from "@biga/types";
import { createApiClient } from "@biga/viewer-core/content/api-client";
import { createBlobStore, defaultBudgetBytes } from "@biga/viewer-core/content/blob-store";
import { applyBatch, type WritableStores } from "@biga/viewer-core/runtime/apply-batch";
import { createSessionClient } from "@biga/viewer-core/runtime/session-client";
import { createInThreadPort } from "@biga/viewer-core/runtime/session-host";
import { abortableSleep, systemClock } from "@biga/viewer-core/runtime/system-env";
import { createConnectionStore } from "@biga/viewer-core/stores/connection-store";
import { createHistoryStore } from "@biga/viewer-core/stores/history-store";
import { createSessionStore } from "@biga/viewer-core/stores/session-store";
import { createTreeStore } from "@biga/viewer-core/stores/tree-store";
import { createWorkspaceStore } from "@biga/viewer-core/stores/workspace-store";

import { apiUrl } from "@/lib/api-url";

const BLOB_ENTRIES = 200;
const ACTIVITY_WINDOW_MS = 10_000;

function deviceMemoryGiB(): number | undefined {
    return (navigator as { deviceMemory?: number }).deviceMemory;
}

function createWorkerPort(): SessionPort | null {
    if (typeof Worker === "undefined") return null;
    try {
        const worker = new Worker(new URL("./session-worker.ts", import.meta.url), { type: "module" });
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
    initialCheckpointSeq?: number;
};

export function createSessionRuntime(options: SessionRuntimeOptions) {
    const { sessionId } = options;
    const stores: WritableStores = {
        connection: createConnectionStore(),
        session: createSessionStore(),
        tree: createTreeStore(),
        history: createHistoryStore(),
        workspace: createWorkspaceStore(),
    };
    const blobs = createBlobStore({ budgetBytes: defaultBudgetBytes(deviceMemoryGiB()), maxEntries: BLOB_ENTRIES });
    const baseUrl = apiUrl("");
    const fetcher: typeof fetch = (input, init) => window.fetch(input, init);
    const api = createApiClient({ baseUrl, fetch: fetcher, sleep: abortableSleep });
    const followListeners = new Set<(path: string) => void>();
    let lastActivityAt = Number.NEGATIVE_INFINITY;

    const client = createSessionClient({
        createPort: createWorkerPort,
        createFallbackPort: () =>
            createInThreadPort({ baseUrl, fetch: fetcher, clock: systemClock, random: Math.random, sleep: abortableSleep }),
        onBatch: (batch, done) => {
            requestAnimationFrame(() => {
                const target = applyBatch(stores, batch, { prefillBlobs: blobs.prefill });
                if (target) followListeners.forEach((listener) => listener(target));
                done();
            });
        },
        onUnavailable: (kind) => stores.connection.getState().setUnavailable(kind),
    });

    function loadBlob(hash: string, path: string): Promise<BlobEntry> {
        return blobs.load(hash, async () => (await api.getFile(sessionId, path, hash)).content);
    }

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
        start: () => client.start({ sessionId, initialCheckpointSeq: options.initialCheckpointSeq }),
        stop: () => client.stop(),
        reconnect: () => client.reconnect(),
        retry: () => client.retry(),
        setHidden: (hidden: boolean) => client.setHidden(hidden),
        notifyOnline: () => client.notifyOnline(),
        onFollow(listener: (path: string) => void): () => void {
            followListeners.add(listener);
            return () => void followListeners.delete(listener);
        },
        noteActivity: () => void (lastActivityAt = Date.now()),
        recentlyActive: () => Date.now() - lastActivityAt < ACTIVITY_WINDOW_MS,
    };
}

export type SessionRuntime = ReturnType<typeof createSessionRuntime>;
