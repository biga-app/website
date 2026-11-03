import type { SSEEvent } from "@biga/types";

import type { SessionState } from "./session-api";

export function createSessionEventBuffer(
    apply: (event: SSEEvent) => void,
    resynchronize: () => void
) {
    let pending: SSEEvent[] | null = [];
    let latestCheckpoint = -1;
    let latestSnapshot = -1;

    function push(event: SSEEvent) {
        if (pending) {
            pending.push(event);
            return;
        }
        if (event.type === "checkpoint") {
            if (event.payload.seq <= latestCheckpoint) return;
            if (event.payload.seq > latestCheckpoint + 1) {
                pending = [event];
                resynchronize();
                return;
            }
            latestCheckpoint = event.payload.seq;
        }
        if (event.type === "snapshot") {
            if (event.payload.timestamp <= latestSnapshot) return;
            latestSnapshot = event.payload.timestamp;
        }
        apply(event);
    }

    return {
        pause() {
            pending = [];
        },
        push,
        resume(state: Pick<SessionState, "checkpoints" | "snapshot">) {
            latestCheckpoint = state.checkpoints.reduce((latest, checkpoint) => Math.max(latest, checkpoint.seq), -1);
            latestSnapshot = state.snapshot?.timestamp ?? -1;
            const buffered = pending ?? [];
            pending = null;
            buffered.forEach(push);
        },
    };
}
