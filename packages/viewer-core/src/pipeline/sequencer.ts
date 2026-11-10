import type { StreamEvent } from "@biga/types/events";
import type { SequencerOptions, SequencerState } from "@biga/types/pipeline";

const DEFAULT_MAX_PENDING = 48;

export function createSequencer(options: SequencerOptions) {
    const maxPending = options.maxPending ?? DEFAULT_MAX_PENDING;
    let pending: StreamEvent[] | null = [];
    let overflowed = false;
    let latestCheckpoint = -1;
    let latestSnapshot = -1;

    function buffer(event: StreamEvent): void {
        if (!pending) return;
        if (overflowed) return;
        if (pending.length >= maxPending) {
            pending = [];
            overflowed = true;
            return;
        }
        pending.push(event);
    }

    function accepts(event: StreamEvent): boolean {
        if (event.type === "checkpoint") {
            if (event.payload.seq <= latestCheckpoint) return false;
            if (event.payload.seq > latestCheckpoint + 1) {
                pending = [event];
                options.resynchronize();
                return false;
            }
            latestCheckpoint = event.payload.seq;
            return true;
        }
        if (event.type === "snapshot") {
            if (event.payload.timestamp <= latestSnapshot) return false;
            latestSnapshot = event.payload.timestamp;
        }
        return true;
    }

    function push(event: StreamEvent): void {
        if (pending) return buffer(event);
        if (accepts(event)) options.apply(event);
    }

    return {
        pause(): void {
            pending = [];
            overflowed = false;
        },
        /** Where the viewer is, or null before it has a snapshot to resume from. */
        position(): { after: number; snapshot: number } | null {
            return latestSnapshot < 0 ? null : { after: latestCheckpoint, snapshot: latestSnapshot };
        },
        /** Starts applying events from where the viewer already is, without a reload. */
        resumeLive(): void {
            const buffered = pending ?? [];
            pending = null;
            overflowed = false;
            buffered.forEach(push);
        },
        push,
        resume(state: SequencerState): void {
            if (overflowed) {
                pending = [];
                overflowed = false;
                options.resynchronize();
                return;
            }
            latestCheckpoint = state.checkpoints.reduce((latest, checkpoint) => Math.max(latest, checkpoint.seq), -1);
            latestSnapshot = state.snapshot?.timestamp ?? -1;
            const buffered = pending ?? [];
            pending = null;
            buffered.forEach(push);
        },
    };
}
