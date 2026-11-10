import type { Checkpoint, CheckpointSummary, HistoryStoreState } from "@biga/types";
import { createStore } from "zustand/vanilla";

const MAX_LOADED = 20;

function byAscendingSeq(summaries: readonly CheckpointSummary[]): CheckpointSummary[] {
    return [...summaries].sort((a, b) => a.seq - b.seq);
}

function newestSeq(list: readonly CheckpointSummary[]): number {
    return list.length === 0 ? -1 : (list[list.length - 1] as CheckpointSummary).seq;
}

function oldestSeq(list: readonly CheckpointSummary[]): number {
    return list.length === 0 ? Number.POSITIVE_INFINITY : (list[0] as CheckpointSummary).seq;
}

function remember(loaded: ReadonlyMap<number, Checkpoint>, checkpoint: Checkpoint, pinned: number | null): Map<number, Checkpoint> {
    const next = new Map(loaded);
    next.delete(checkpoint.seq);
    next.set(checkpoint.seq, checkpoint);
    for (const seq of next.keys()) {
        if (next.size <= MAX_LOADED) break;
        if (seq !== pinned && seq !== checkpoint.seq) next.delete(seq);
    }
    return next;
}

export function createHistoryStore() {
    return createStore<HistoryStoreState>()((set) => {
        const newer = (state: HistoryStoreState, summaries: readonly CheckpointSummary[]) =>
            byAscendingSeq(summaries.filter((summary) => summary.seq > newestSeq(state.checkpoints)));

        return {
            checkpoints: [],
            loaded: new Map(),
            selectedSeq: null,
            newWhileBrowsing: 0,
            hydrate: (summaries, reason, initial) =>
                set((state) => {
                    if (reason === "resync") {
                        const added = newer(state, summaries);
                        if (added.length === 0) return state;
                        return {
                            checkpoints: [...state.checkpoints, ...added],
                            newWhileBrowsing: state.selectedSeq === null ? 0 : state.newWhileBrowsing + added.length,
                        };
                    }
                    return {
                        checkpoints: byAscendingSeq(summaries),
                        loaded: initial ? new Map([[initial.seq, initial]]) : new Map(),
                        selectedSeq: null,
                        newWhileBrowsing: 0,
                    };
                }),
            append: (summaries, latest) =>
                set((state) => {
                    const added = newer(state, summaries);
                    const loaded = latest ? remember(state.loaded, latest, state.selectedSeq) : state.loaded;
                    if (added.length === 0) return loaded === state.loaded ? state : { loaded };
                    return {
                        checkpoints: [...state.checkpoints, ...added],
                        loaded,
                        newWhileBrowsing: state.selectedSeq === null ? 0 : state.newWhileBrowsing + added.length,
                    };
                }),
            prepend: (older) =>
                set((state) => {
                    const added = byAscendingSeq(older.filter((summary) => summary.seq < oldestSeq(state.checkpoints)));
                    return added.length === 0 ? state : { checkpoints: [...added, ...state.checkpoints] };
                }),
            select: (seq) => set((state) => ({ selectedSeq: seq, newWhileBrowsing: seq === null ? 0 : state.newWhileBrowsing })),
            cache: (checkpoint) => set((state) => ({ loaded: remember(state.loaded, checkpoint, state.selectedSeq) })),
            reset: () => set({ checkpoints: [], loaded: new Map(), selectedSeq: null, newWhileBrowsing: 0 }),
        };
    });
}
