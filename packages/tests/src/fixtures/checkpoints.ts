import type { Checkpoint, CheckpointChange, CheckpointSummary } from "@biga/types/checkpoint";

import { hash } from "./hash.ts";

export const TIME = "2026-01-01T00:00:00.000Z";

export function makeChange(
    path: string,
    changeType: CheckpointChange["changeType"],
    afterDigit = "1",
    extra: Partial<CheckpointChange> = {}
): CheckpointChange {
    return {
        path,
        changeType,
        beforeHash: null,
        afterHash: changeType === "deleted" ? null : hash(afterDigit),
        additions: 1,
        deletions: 0,
        ...extra,
    };
}

export function makeSummary(seq: number): CheckpointSummary {
    return { sessionId: "s1", seq, label: `#${seq}`, createdAt: TIME, filesChanged: 0, additions: 0, deletions: 0 };
}

export function makeCheckpoint(seq: number, changes: CheckpointChange[] = []): Checkpoint {
    return { ...makeSummary(seq), filesChanged: changes.length, additions: 1, changes };
}
