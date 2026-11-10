import type { SequencerOptions, SequencerState, StreamEvent } from "@biga/types";

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
