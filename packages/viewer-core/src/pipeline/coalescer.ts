import { summarizeCheckpoint, type Checkpoint, type CheckpointSummary } from "@biga/types/checkpoint";
import type { Batch, CoalescerOptions, Hydration } from "@biga/types/pipeline";
import type { StreamStatus } from "@biga/types/stream";
import type { TreePatch, TreeTable } from "@biga/types/tree-table";
import { firstViewableChange } from "@biga/types/tree-utils";

import { patchesFromChanges } from "./tree-table.ts";

const DEFAULT_MIN_INTERVAL_MS = 50;

type Pending = {
    hydrate: Hydration | null;
    table: TreeTable | null;
    patches: Map<string, TreePatch>;
    summaries: CheckpointSummary[];
    latest: Checkpoint | null;
    touched: Set<string>;
    followTarget: string | null;
    status: StreamStatus | null;
};

function emptyPending(): Pending {
    return {
        hydrate: null,
        table: null,
        patches: new Map(),
        summaries: [],
        latest: null,
        touched: new Set(),
        followTarget: null,
        status: null,
    };
}

function isEmpty(pending: Pending): boolean {
    return (
        pending.hydrate === null &&
        pending.table === null &&
        pending.patches.size === 0 &&
        pending.summaries.length === 0 &&
        pending.status === null
    );
}

export function createCoalescer(options: CoalescerOptions) {
    const minInterval = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
    let pending = emptyPending();
    let inflight: number | null = null;
    let nextId = 1;
    let lastSentAt = Number.NEGATIVE_INFINITY;
    let cancelTimer: (() => void) | null = null;

    function toBatch(id: number): Batch {
        const batch: Batch = {
            id,
            hydrate: pending.hydrate,
            table: pending.table,
            patches: [...pending.patches.values()],
            summaries: pending.summaries,
            latest: pending.latest,
            touched: [...pending.touched],
            followTarget: pending.followTarget,
            status: pending.status,
        };
        pending = emptyPending();
        return batch;
    }

    function tryFlush(): void {
        if (inflight !== null || isEmpty(pending) || cancelTimer) return;
        const wait = lastSentAt + minInterval - options.clock.now();
        if (wait > 0) {
            cancelTimer = options.clock.setTimer(() => {
                cancelTimer = null;
                tryFlush();
            }, wait);
            return;
        }
        const id = nextId++;
        inflight = id;
        lastSentAt = options.clock.now();
        options.send(toBatch(id));
    }

    function replaceTable(table: TreeTable): void {
        pending.patches.clear();
        if (pending.hydrate) pending.hydrate.table = table;
        else pending.table = table;
    }

    return {
        hydrate(hydration: Hydration): void {
            pending = emptyPending();
            pending.hydrate = hydration;
            tryFlush();
        },
        snapshot(table: TreeTable): void {
            replaceTable(table);
            tryFlush();
        },
        checkpoint(checkpoint: Checkpoint): void {
            for (const patch of patchesFromChanges(checkpoint.changes)) pending.patches.set(patch.path, patch);
            for (const change of checkpoint.changes) pending.touched.add(change.path);
            pending.summaries.push(summarizeCheckpoint(checkpoint));
            pending.latest = checkpoint;
            pending.followTarget = firstViewableChange(checkpoint.changes) ?? pending.followTarget;
            tryFlush();
        },
        status(status: StreamStatus): void {
            pending.status = status;
            tryFlush();
        },
        ack(id: number): void {
            if (id !== inflight) return;
            inflight = null;
            tryFlush();
        },
        dispose(): void {
            cancelTimer?.();
            cancelTimer = null;
            pending = emptyPending();
        },
    };
}
