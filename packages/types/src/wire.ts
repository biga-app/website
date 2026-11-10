import { fromBinary } from "@bufbuild/protobuf";

import type { ChangeType, Checkpoint, CheckpointChange, CheckpointSummary, FileHistoryEntry } from "./checkpoint.js";
import type { StreamEvent } from "./events.js";
import type { FileNode, FileSnapshot } from "./file.js";
import * as pb from "./gen/biga/v1/biga_pb.js";
import type { SessionResponse } from "./session.js";
import type { FileContent, LoadMode, SessionState } from "./state.js";

export const PROTOBUF_TYPE = "application/x-protobuf";
export const STREAM_TYPE = "application/vnd.biga.stream+protobuf";

const utf8 = new TextDecoder();

function text(bytes: Uint8Array): string {
    return utf8.decode(bytes);
}

function changeType(value: pb.ChangeType): ChangeType {
    switch (value) {
        case pb.ChangeType.ADDED:
            return "added";
        case pb.ChangeType.MODIFIED:
            return "modified";
        case pb.ChangeType.DELETED:
            return "deleted";
        case pb.ChangeType.RENAMED:
            return "renamed";
        default:
            throw new Error("unknown change type");
    }
}

function loadMode(value: pb.LoadMode): LoadMode {
    if (value === pb.LoadMode.EAGER) return "eager";
    if (value === pb.LoadMode.LAZY) return "lazy";
    throw new Error("unknown load mode");
}

function required<T>(value: T | undefined, what: string): T {
    if (value === undefined) throw new Error(`missing ${what}`);
    return value;
}

function session(value: pb.Session): SessionResponse {
    let status: SessionResponse["status"];
    if (value.status === pb.SessionStatus.ACTIVE) status = "active";
    else if (value.status === pb.SessionStatus.ENDED) status = "ended";
    else throw new Error("unknown session status");
    return {
        id: value.id,
        title: value.title,
        description: value.description ?? null,
        status,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        endedAt: value.endedAt ?? null,
        groupId: value.groupId ?? null,
    };
}

function fileNode(node: pb.FileNode): FileNode {
    const { kind } = node;
    if (kind.case === "file") {
        const file: Extract<FileNode, { type: "file" }> = {
            type: "file",
            name: node.name,
            path: node.path,
            size: Number(kind.value.size),
            hash: kind.value.hash,
        };
        if (kind.value.binary) file.binary = true;
        return file;
    }
    if (kind.case === "directory") {
        const directory: Extract<FileNode, { type: "directory" }> = {
            type: "directory",
            name: node.name,
            path: node.path,
            children: kind.value.children.map(fileNode),
        };
        if (kind.value.ignored) directory.ignored = true;
        return directory;
    }
    throw new Error("tree node has no kind");
}

function snapshot(value: pb.FileSnapshot): FileSnapshot {
    return {
        sessionId: value.sessionId,
        tree: fileNode(required(value.tree, "tree")),
        timestamp: Number(value.timestamp),
        sequenceNum: Number(value.sequenceNum),
    };
}

function summary(value: pb.CheckpointSummary): CheckpointSummary {
    const result: CheckpointSummary = {
        sessionId: value.sessionId,
        seq: value.seq,
        label: value.label,
        createdAt: value.createdAt,
        filesChanged: value.filesChanged,
        additions: value.additions,
        deletions: value.deletions,
    };
    if (value.named) result.named = true;
    return result;
}

function change(value: pb.CheckpointChange): CheckpointChange {
    const result: CheckpointChange = {
        path: value.path,
        changeType: changeType(value.changeType),
        beforeHash: value.beforeHash ?? null,
        afterHash: value.afterHash ?? null,
        additions: value.additions,
        deletions: value.deletions,
        binary: value.binary,
    };
    if (value.oldPath !== "") result.oldPath = value.oldPath;
    return result;
}

function checkpoint(value: pb.Checkpoint): Checkpoint {
    return { ...summary(required(value.summary, "checkpoint summary")), changes: value.changes.map(change) };
}

function historyEntry(value: pb.FileHistoryEntry): FileHistoryEntry {
    return {
        seq: value.seq,
        label: value.label,
        createdAt: value.createdAt,
        changeType: changeType(value.changeType),
        beforeHash: value.beforeHash ?? null,
        afterHash: value.afterHash ?? null,
        additions: value.additions,
        deletions: value.deletions,
        binary: value.binary,
    };
}

export function decodeSession(bytes: Uint8Array): SessionResponse {
    return session(fromBinary(pb.SessionSchema, bytes));
}

export function decodeState(bytes: Uint8Array): SessionState {
    const value = fromBinary(pb.SessionStateSchema, bytes);
    const state: SessionState = {
        session: session(required(value.session, "session")),
        snapshot: value.snapshot ? snapshot(value.snapshot) : null,
        checkpoints: value.checkpoints.map(summary),
        mode: loadMode(value.mode),
    };
    const hashes = Object.keys(value.contents);
    if (hashes.length > 0) {
        state.contents = Object.fromEntries(hashes.map((hash) => [hash, text(value.contents[hash] as Uint8Array)]));
    }
    return state;
}

export function decodeCheckpoint(bytes: Uint8Array): Checkpoint {
    return checkpoint(fromBinary(pb.CheckpointSchema, bytes));
}

export function decodeCheckpointList(bytes: Uint8Array): CheckpointSummary[] {
    return fromBinary(pb.ListCheckpointsResponseSchema, bytes).checkpoints.map(summary);
}

export function decodeFileHistory(bytes: Uint8Array): FileHistoryEntry[] {
    return fromBinary(pb.FileHistoryResponseSchema, bytes).history.map(historyEntry);
}

export function decodeFileContent(bytes: Uint8Array): FileContent {
    const value = fromBinary(pb.FileContentSchema, bytes);
    return { content: text(value.content), binary: value.binary, hash: value.hash };
}

export function decodeApiError(bytes: Uint8Array): { code: string; message: string } {
    const value = fromBinary(pb.ErrorSchema, bytes);
    return { code: value.code, message: value.message };
}

/** Decodes one stream frame. Keepalives carry no event and decode to null. */
export function decodeStreamEvent(bytes: Uint8Array): StreamEvent | null {
    const { event } = fromBinary(pb.StreamEventSchema, bytes);
    switch (event.case) {
        case "connected":
            return {
                type: "connected",
                sessionId: event.value.sessionId,
                timestamp: Number(event.value.timestamp),
                replayed: event.value.replayed,
            };
        case "snapshot":
            return { type: "snapshot", payload: snapshot(event.value) };
        case "checkpoint":
            return { type: "checkpoint", payload: checkpoint(event.value) };
        case "sessionEnded":
            return { type: "session_ended", sessionId: event.value.sessionId, timestamp: Number(event.value.timestamp) };
        case "keepalive":
            return null;
        default:
            throw new Error("stream frame has no event");
    }
}
