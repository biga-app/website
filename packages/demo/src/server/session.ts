import type { Checkpoint, CheckpointChange, FileHistoryEntry } from "@biga/types/checkpoint";
import type { StreamEvent } from "@biga/types/events";
import type { FileNode, FileSnapshot } from "@biga/types/file";
import { isValidHash } from "@biga/types/file-identity";
import type { SessionResponse } from "@biga/types/session";
import type { SessionState } from "@biga/types/state";

export type Session = {
    id: string;
    title: string;
    description: string;
    startedAt: number;
    updatedAt: number;
    snapshotAt: number;
    status: "active" | "ended";
    files: Map<string, string>;
    hashes: Map<string, string>;
    versions: Map<string, { seq: number; hash: string | null }[]>;
    blobs: Map<string, string>;
    binary: Set<string>;
    ignored: Set<string>;
    checkpoints: Checkpoint[];
    subscribers: Set<(event: StreamEvent | "keepalive") => void>;
};

export function createSession(options: { id: string; title: string; description?: string; startedAt: number; binary?: string[] }): Session {
    return {
        ...options, description: options.description ?? "Generated for this visit", updatedAt: options.startedAt,
        snapshotAt: options.startedAt, status: "active", files: new Map(), hashes: new Map(), versions: new Map(),
        blobs: new Map(), binary: new Set(options.binary), ignored: new Set(), checkpoints: [], subscribers: new Set(),
    };
}

export async function sha(text: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const lines = (text: string) => text === "" ? 0 : text.split("\n").length;

export function ignoredPath(session: Session, path: string): boolean {
    return [...session.ignored].some((pattern) => path === pattern.replace(/\/$/, "") || path.startsWith(`${pattern.replace(/\/$/, "")}/`));
}

type Directory = Extract<FileNode, { type: "directory" }>;

function directoryIn(parent: Directory, path: string, name: string): Directory {
    const existing = parent.children.find((child): child is Directory => child.type === "directory" && child.path === path);
    if (existing) return existing;
    const created: Directory = { type: "directory", name, path, children: [] };
    parent.children.push(created);
    return created;
}

export function treeOf(session: Session): FileNode {
    const root: Directory = { type: "directory", name: "root", path: ".", children: [] };
    for (const [path, content] of [...session.files].sort(([a], [b]) => a.localeCompare(b))) {
        if (ignoredPath(session, path)) continue;
        const segments = path.split("/");
        let directory = root;
        for (let index = 0; index < segments.length - 1; index++) directory = directoryIn(directory, segments.slice(0, index + 1).join("/"), segments[index]!);
        directory.children.push({ type: "file", name: segments.at(-1)!, path, size: new TextEncoder().encode(content).length, hash: session.hashes.get(path)!, binary: session.binary.has(path) });
    }
    for (const pattern of session.ignored) {
        if (!pattern.endsWith("/")) continue;
        const path = pattern.slice(0, -1);
        const stub = directoryIn(root, path, path);
        stub.ignored = true;
        stub.children = [];
    }
    return root;
}

export async function commit(session: Session, edits: Record<string, string | null>, label?: string, at = session.startedAt + session.checkpoints.length * 60_000, rename?: { from: string; to: string }): Promise<Checkpoint> {
    const seq = session.checkpoints.length;
    const changes: CheckpointChange[] = [];
    for (const [path, next] of Object.entries(edits)) {
        const before = session.files.get(path);
        const beforeHash = session.hashes.get(path) ?? null;
        const afterHash = next === null ? null : await sha(next);
        if (beforeHash === afterHash) continue;
        const additions = Math.max(0, lines(next ?? "") - lines(before ?? "")) || (next !== null && next !== before ? 1 : 0);
        const deletions = Math.max(0, lines(before ?? "") - lines(next ?? ""));
        changes.push({ path, changeType: before === undefined ? "added" : next === null ? "deleted" : "modified", beforeHash, afterHash, additions, deletions, binary: session.binary.has(path) });
        if (next === null) { session.files.delete(path); session.hashes.delete(path); }
        else { session.files.set(path, next); session.hashes.set(path, afterHash!); session.blobs.set(afterHash!, next); }
        session.versions.set(path, [...(session.versions.get(path) ?? []), { seq, hash: afterHash }]);
    }
    if (rename) {
        const added = changes.find((change) => change.path === rename.to);
        const removed = changes.find((change) => change.path === rename.from);
        if (added && removed) {
            added.changeType = "renamed"; added.oldPath = rename.from; added.beforeHash = removed.beforeHash;
            changes.splice(changes.indexOf(removed), 1);
        }
    }
    const checkpoint: Checkpoint = {
        sessionId: session.id, seq, label: label ?? (seq === 0 ? "Initial snapshot" : `Save #${seq}`), createdAt: new Date(at).toISOString(),
        filesChanged: changes.length, additions: changes.reduce((sum, change) => sum + change.additions, 0),
        deletions: changes.reduce((sum, change) => sum + change.deletions, 0), changes,
    };
    session.updatedAt = at;
    session.checkpoints.push(checkpoint);
    return checkpoint;
}

export function summary(checkpoint: Checkpoint) {
    const { changes, ...rest } = checkpoint;
    void changes;
    return rest;
}

export function sessionResponse(session: Session): SessionResponse {
    return { id: session.id, title: session.title, description: session.description, status: session.status,
        createdAt: new Date(session.startedAt).toISOString(), updatedAt: new Date(session.updatedAt).toISOString(),
        endedAt: session.status === "ended" ? new Date(session.updatedAt).toISOString() : null, groupId: null };
}

export function snapshot(session: Session): FileSnapshot {
    return { sessionId: session.id, tree: treeOf(session), timestamp: session.snapshotAt, sequenceNum: session.checkpoints.at(-1)?.seq ?? 0 };
}

export function state(session: Session): SessionState {
    const visible = [...session.files].filter(([path]) => !ignoredPath(session, path));
    const eager = visible.length <= 400 && visible.reduce((sum, [, content]) => sum + content.length, 0) <= 1_536 * 1024;
    const contents = Object.fromEntries(visible.filter(([path]) => !session.binary.has(path)).map(([path, content]) => [session.hashes.get(path)!, content]));
    return { session: sessionResponse(session), snapshot: snapshot(session), checkpoints: session.checkpoints.slice(-100).reverse().map(summary), mode: eager ? "eager" : "lazy", ...(eager ? { contents } : {}) };
}

export function fileAt(session: Session, path: string, ref: string): string | undefined {
    if (ignoredPath(session, path)) return undefined;
    if (isValidHash(ref)) return session.versions.get(path)?.some((entry) => entry.hash === ref) ? session.blobs.get(ref) : undefined;
    if (ref === "latest") return session.files.get(path);
    if (!/^\d+$/.test(ref)) return undefined;
    const version = [...(session.versions.get(path) ?? [])].reverse().find((entry) => entry.seq <= Number(ref));
    return version?.hash ? session.blobs.get(version.hash) : undefined;
}

export function fileHistory(session: Session, path: string): FileHistoryEntry[] {
    if (ignoredPath(session, path)) return [];
    return session.checkpoints.flatMap((checkpoint) => checkpoint.changes.filter((change) => change.path === path || change.oldPath === path).map((change) => ({
        seq: checkpoint.seq, label: checkpoint.label, createdAt: checkpoint.createdAt, changeType: change.changeType,
        beforeHash: change.beforeHash, afterHash: change.afterHash, additions: change.additions, deletions: change.deletions, binary: change.binary ?? false,
    }))).reverse();
}

export function broadcast(session: Session, event: StreamEvent | "keepalive") {
    session.subscribers.forEach((listener) => listener(event));
}

export function setIgnored(session: Session, pattern: string, on: boolean, at: number) {
    if (on) session.ignored.add(pattern); else session.ignored.delete(pattern);
    session.snapshotAt = Math.max(session.snapshotAt + 1, at);
    broadcast(session, { type: "snapshot", payload: snapshot(session) });
}

export function endSession(session: Session) {
    session.status = "ended";
    broadcast(session, { type: "session_ended", sessionId: session.id, timestamp: session.updatedAt });
}
