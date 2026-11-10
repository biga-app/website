import type { CheckpointChange } from "@biga/types/checkpoint";

import { makeCheckpoint } from "./checkpoints.ts";
import { encodeStreamEvent } from "./wire.ts";

export type Frame = { type: "frame"; data: Uint8Array };

const TIMESTAMP = 1700000000000;

export function checkpointFrame(seq: number, changes: CheckpointChange[] = []): Frame {
    return { type: "frame", data: encodeStreamEvent({ type: "checkpoint", payload: makeCheckpoint(seq, changes) }) };
}

export const connectedFrame: Frame = {
    type: "frame",
    data: encodeStreamEvent({ type: "connected", sessionId: "s1", timestamp: TIMESTAMP, replayed: false }),
};

export const resumedFrame: Frame = {
    type: "frame",
    data: encodeStreamEvent({ type: "connected", sessionId: "s1", timestamp: TIMESTAMP, replayed: true }),
};

export const endedFrame: Frame = {
    type: "frame",
    data: encodeStreamEvent({ type: "session_ended", sessionId: "s1", timestamp: TIMESTAMP + 1 }),
};

export const snapshotFrame: Frame = {
    type: "frame",
    data: encodeStreamEvent({
        type: "snapshot",
        payload: {
            sessionId: "s1",
            tree: { type: "directory", name: "root", path: ".", children: [] },
            timestamp: TIMESTAMP + 2,
            sequenceNum: 1,
        },
    }),
};

export const keepaliveFrame: Frame = { type: "frame", data: encodeStreamEvent("keepalive") };

export const invalidFrame: Frame = { type: "frame", data: new Uint8Array([0xff, 0xff, 0xff]) };
