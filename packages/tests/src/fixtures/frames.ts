import { makeCheckpoint } from "./checkpoints.ts";

export type Frame = { type: "frame"; name: string; data: string };

const TIMESTAMP = 1700000000000;

export function checkpointFrame(seq: number): Frame {
    return { type: "frame", name: "checkpoint", data: JSON.stringify({ type: "checkpoint", payload: makeCheckpoint(seq) }) };
}

export const connectedFrame: Frame = {
    type: "frame",
    name: "connected",
    data: JSON.stringify({ type: "connected", sessionId: "s1", timestamp: TIMESTAMP }),
};

export const endedFrame: Frame = {
    type: "frame",
    name: "session_ended",
    data: JSON.stringify({ type: "session_ended", sessionId: "s1", timestamp: TIMESTAMP + 1 }),
};

export const snapshotFrame: Frame = {
    type: "frame",
    name: "snapshot",
    data: JSON.stringify({
        type: "snapshot",
        payload: {
            sessionId: "s1",
            tree: { type: "directory", name: "root", path: ".", children: [] },
            timestamp: TIMESTAMP + 2,
            sequenceNum: 1,
        },
    }),
};

export const invalidFrame: Frame = { type: "frame", name: "checkpoint", data: "nope" };
