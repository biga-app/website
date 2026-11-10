import { create } from "zustand";
import { summarizeCheckpoint, type Checkpoint, type CheckpointSummary } from "@biga/types";

interface HistoryState {
    /**
     * Checkpoint summaries ordered newest-first for the timeline list.
     * Summaries omit the per-file change list to keep memory usage low;
     * the full checkpoint is fetched and cached in `bySeq` on demand.
     */
    checkpoints: CheckpointSummary[];
    /**
     * Cache of full checkpoints (with per-file changes), keyed by seq.
     * Populated lazily when the user opens a checkpoint in the timeline.
     */
    bySeq: Map<number, Checkpoint>;
    /**
     * The checkpoint seq currently being viewed in the timeline, or null when
     * following the live head. Null also clears the change decorations on the
     * file tree.
     */
    selectedSeq: number | null;
    /**
     * Count of new checkpoints that arrived via SSE while the user was browsing
     * a historical checkpoint. Shown as a "jump to latest" prompt.
     */
    newWhileBrowsing: number;

    setInitial: (checkpoints: CheckpointSummary[]) => void;
    addLive: (checkpoint: Checkpoint) => void;
    /**
     * Appends an older page of summaries (from the paginated checkpoints
     * endpoint) to the end of the list. Duplicates are ignored.
     */
    appendOlder: (summaries: CheckpointSummary[]) => void;
    /**
     * Adds summaries newer than anything already listed, e.g. checkpoints that
     * landed while the live stream was reconnecting and so never arrived as
     * events. Counts toward `newWhileBrowsing` like a live checkpoint would.
     */
    mergeNewer: (summaries: CheckpointSummary[]) => void;
    cacheCheckpoint: (checkpoint: Checkpoint) => void;
    selectSeq: (seq: number | null) => void;
    clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
    checkpoints: [],
    bySeq: new Map(),
    selectedSeq: null,
    newWhileBrowsing: 0,

    setInitial: (checkpoints) =>
        set({
            checkpoints: [...checkpoints].sort((a, b) => b.seq - a.seq),
            bySeq: new Map(),
            selectedSeq: null,
            newWhileBrowsing: 0,
        }),

    addLive: (checkpoint) =>
        set((state) => {
            if (state.bySeq.has(checkpoint.seq)) {
                return state;
            }
            const bySeq = new Map(state.bySeq);
            bySeq.set(checkpoint.seq, checkpoint);
            return {
                checkpoints: [summarizeCheckpoint(checkpoint), ...state.checkpoints],
                bySeq,
                newWhileBrowsing:
                    state.selectedSeq === null
                        ? state.newWhileBrowsing
                        : state.newWhileBrowsing + 1,
            };
        }),

    appendOlder: (summaries) =>
        set((state) => {
            const known = new Set(state.checkpoints.map((c) => c.seq));
            const older = summaries
                .filter((summary) => !known.has(summary.seq))
                .sort((a, b) => b.seq - a.seq);
            if (older.length === 0) {
                return state;
            }
            return { checkpoints: [...state.checkpoints, ...older] };
        }),

    mergeNewer: (summaries) =>
        set((state) => {
            const newest = state.checkpoints[0]?.seq ?? -1;
            const newer = summaries
                .filter((summary) => summary.seq > newest)
                .sort((a, b) => b.seq - a.seq);
            if (newer.length === 0) {
                return state;
            }
            return {
                checkpoints: [...newer, ...state.checkpoints],
                newWhileBrowsing:
                    state.selectedSeq === null
                        ? state.newWhileBrowsing
                        : state.newWhileBrowsing + newer.length,
            };
        }),

    cacheCheckpoint: (checkpoint) =>
        set((state) => {
            const bySeq = new Map(state.bySeq);
            bySeq.set(checkpoint.seq, checkpoint);
            return { bySeq };
        }),

    selectSeq: (seq) =>
        set((state) => ({
            selectedSeq: seq,
            newWhileBrowsing: seq === null ? 0 : state.newWhileBrowsing,
        })),

    clear: () =>
        set({
            checkpoints: [],
            bySeq: new Map(),
            selectedSeq: null,
            newWhileBrowsing: 0,
        }),
}));
