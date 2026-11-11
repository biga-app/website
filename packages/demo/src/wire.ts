import { create, toBinary } from "@bufbuild/protobuf";
import type { ChangeType, Checkpoint, CheckpointChange, CheckpointSummary, FileHistoryEntry } from "@biga/types/checkpoint";
import type { StreamEvent } from "@biga/types/events";
import type { FileNode, FileSnapshot } from "@biga/types/file";
import * as pb from "@biga/types/gen/biga/v1/biga_pb";
import type { SessionResponse } from "@biga/types/session";
import type { FileContent, SessionState } from "@biga/types/state";

const encoder = new TextEncoder();

const CHANGE_TYPES: Record<ChangeType, pb.ChangeType> = {
    added: pb.ChangeType.ADDED,
    modified: pb.ChangeType.MODIFIED,
    deleted: pb.ChangeType.DELETED,
    renamed: pb.ChangeType.RENAMED,
};

function node(value: FileNode): pb.FileNode {
    if (value.type === "file") {
        return create(pb.FileNodeSchema, {
            name: value.name,
            path: value.path,
            kind: {
                case: "file",
                value: {
                    size: BigInt(value.size),
                    hash: value.hash,
                    binary: value.binary ?? false,
                    content: encoder.encode(value.content ?? ""),
                },
            },
        });
    }
    return create(pb.FileNodeSchema, {
        name: value.name,
        path: value.path,
        kind: { case: "directory", value: { children: value.children.map(node), ignored: value.ignored ?? false } },
    });
}

function snapshot(value: FileSnapshot): pb.FileSnapshot {
    return create(pb.FileSnapshotSchema, {
        sessionId: value.sessionId,
        tree: node(value.tree),
        timestamp: BigInt(value.timestamp),
        sequenceNum: BigInt(value.sequenceNum),
    });
}

function session(value: SessionResponse): pb.Session {
    return create(pb.SessionSchema, {
        id: value.id,
        title: value.title,
        description: value.description ?? undefined,
        status: value.status === "active" ? pb.SessionStatus.ACTIVE : pb.SessionStatus.ENDED,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        endedAt: value.endedAt ?? undefined,
        groupId: value.groupId ?? undefined,
        encrypted: value.encrypted ?? false,
    });
}

function summary(value: CheckpointSummary): pb.CheckpointSummary {
    return create(pb.CheckpointSummarySchema, {
        named: value.named ?? false,
        sessionId: value.sessionId,
        seq: value.seq,
        label: value.label,
        createdAt: value.createdAt,
        filesChanged: value.filesChanged,
        additions: value.additions,
        deletions: value.deletions,
    });
}

function change(value: CheckpointChange): pb.CheckpointChange {
    return create(pb.CheckpointChangeSchema, {
        path: value.path,
        changeType: CHANGE_TYPES[value.changeType],
        oldPath: value.oldPath ?? "",
        beforeHash: value.beforeHash ?? undefined,
        afterHash: value.afterHash ?? undefined,
        additions: value.additions,
        deletions: value.deletions,
        binary: value.binary ?? false,
    });
}

function checkpoint(value: Checkpoint): pb.Checkpoint {
    const { changes, ...rest } = value;
    return create(pb.CheckpointSchema, { summary: summary(rest), changes: changes.map(change) });
}

export function encodeSession(value: SessionResponse): Uint8Array {
    return toBinary(pb.SessionSchema, session(value));
}

/** Encodes a state. For an encrypted session, `sealed` holds each hash's sealed bytes in place of text. */
export function encodeState(value: SessionState, sealed: Record<string, Uint8Array> = {}): Uint8Array {
    return toBinary(
        pb.SessionStateSchema,
        create(pb.SessionStateSchema, {
            session: session(value.session),
            snapshot: value.snapshot ? snapshot(value.snapshot) : undefined,
            checkpoints: value.checkpoints.map(summary),
            mode: value.mode === "eager" ? pb.LoadMode.EAGER : pb.LoadMode.LAZY,
            contents: {
                ...Object.fromEntries(Object.entries(value.contents ?? {}).map(([hash, text]) => [hash, encoder.encode(text)])),
                ...sealed,
            },
        })
    );
}

export function encodeCheckpoint(value: Checkpoint): Uint8Array {
    return toBinary(pb.CheckpointSchema, checkpoint(value));
}

export function encodeCheckpointList(values: CheckpointSummary[]): Uint8Array {
    return toBinary(pb.ListCheckpointsResponseSchema, create(pb.ListCheckpointsResponseSchema, { checkpoints: values.map(summary) }));
}

export function encodeFileHistory(values: FileHistoryEntry[]): Uint8Array {
    const history = values.map((value) =>
        create(pb.FileHistoryEntrySchema, {
            seq: value.seq,
            label: value.label,
            createdAt: value.createdAt,
            changeType: CHANGE_TYPES[value.changeType],
            beforeHash: value.beforeHash ?? undefined,
            afterHash: value.afterHash ?? undefined,
            additions: value.additions,
            deletions: value.deletions,
            binary: value.binary,
        })
    );
    return toBinary(pb.FileHistoryResponseSchema, create(pb.FileHistoryResponseSchema, { history }));
}

/** Encodes a file. For an encrypted session, `sealed` is the sealed bytes sent in place of the text. */
export function encodeFileContent(value: FileContent, sealed?: Uint8Array): Uint8Array {
    return toBinary(
        pb.FileContentSchema,
        create(pb.FileContentSchema, {
            content: sealed ?? encoder.encode(value.content),
            binary: value.binary,
            hash: value.hash,
            encrypted: sealed !== undefined,
        })
    );
}

export function encodeApiError(code: string, message: string): Uint8Array {
    return toBinary(pb.ErrorSchema, create(pb.ErrorSchema, { code, message }));
}

function lengthPrefix(length: number): number[] {
    const bytes: number[] = [];
    let rest = length;
    while (rest >= 0x80) {
        bytes.push((rest & 0x7f) | 0x80);
        rest = Math.floor(rest / 128);
    }
    bytes.push(rest);
    return bytes;
}

/** A stream payload preceded by its length, as the server writes it. */
export function delimited(payload: Uint8Array): Uint8Array {
    const prefix = lengthPrefix(payload.length);
    const framed = new Uint8Array(prefix.length + payload.length);
    framed.set(prefix);
    framed.set(payload, prefix.length);
    return framed;
}

export function encodeStreamEvent(value: StreamEvent | "keepalive"): Uint8Array {
    if (value === "keepalive") {
        return toBinary(pb.StreamEventSchema, create(pb.StreamEventSchema, { event: { case: "keepalive", value: { timestamp: BigInt(1700000000000) } } }));
    }
    const event = (() => {
        switch (value.type) {
            case "connected":
                return { case: "connected", value: { sessionId: value.sessionId, timestamp: BigInt(value.timestamp), replayed: value.replayed } } as const;
            case "session_ended":
                return { case: "sessionEnded", value: { sessionId: value.sessionId, timestamp: BigInt(value.timestamp) } } as const;
            case "snapshot":
                return { case: "snapshot", value: snapshot(value.payload) } as const;
            case "checkpoint":
                return { case: "checkpoint", value: checkpoint(value.payload) } as const;
        }
    })();
    return toBinary(pb.StreamEventSchema, create(pb.StreamEventSchema, { event }));
}
