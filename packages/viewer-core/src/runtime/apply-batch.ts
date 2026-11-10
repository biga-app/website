import type { Batch } from "@biga/types/pipeline";

import type { createConnectionStore } from "../stores/connection-store.ts";
import type { createHistoryStore } from "../stores/history-store.ts";
import type { createSessionStore } from "../stores/session-store.ts";
import type { createTreeStore } from "../stores/tree-store.ts";
import type { createWorkspaceStore } from "../stores/workspace-store.ts";

export type WritableStores = {
    connection: ReturnType<typeof createConnectionStore>;
    session: ReturnType<typeof createSessionStore>;
    tree: ReturnType<typeof createTreeStore>;
    history: ReturnType<typeof createHistoryStore>;
    workspace: ReturnType<typeof createWorkspaceStore>;
};

export type BatchEnv = {
    prefillBlobs: (contents: Record<string, string>) => void;
    nextFrame: () => Promise<void>;
};

export async function applyBatch(stores: WritableStores, batch: Batch, env: BatchEnv): Promise<string | null> {
    const { hydrate } = batch;
    const table = batch.table ?? hydrate?.table ?? null;
    const commitTree = table ? await stores.tree.getState().prepareLoad(table, env.nextFrame) : null;
    if (hydrate) {
        stores.session.getState().hydrate(hydrate.session, hydrate.mode);
        stores.history.getState().hydrate(hydrate.summaries, hydrate.reason, hydrate.initial);
        if (hydrate.contents) env.prefillBlobs(hydrate.contents);
    }
    commitTree?.();
    if (batch.patches.length > 0) stores.tree.getState().apply(batch.patches);
    if (batch.summaries.length > 0 || batch.latest) stores.history.getState().append(batch.summaries, batch.latest);
    if (batch.touched.length > 0) stores.tree.getState().markTouched(batch.touched);
    if (batch.status) stores.connection.getState().setStatus(batch.status);
    return hydrate ? null : batch.followTarget;
}
