import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { parseArgs } from "node:util";

import type { Checkpoint, CheckpointChange, FileHistoryEntry } from "@biga/types/checkpoint";
import type { FileNode } from "@biga/types/file";
import type { SessionResponse } from "@biga/types/session";
import type { SessionState } from "@biga/types/state";
import { PROTOBUF_TYPE, STREAM_TYPE } from "@biga/types/wire";

import {
    delimited,
    encodeApiError,
    encodeCheckpoint,
    encodeCheckpointList,
    encodeFileContent,
    encodeFileHistory,
    encodeSession,
    encodeState,
    encodeStreamEvent,
} from "../fixtures/wire.ts";

type Scenario = "demo" | "big" | "ended";

type Session = {
    id: string;
    scenario: Scenario;
    status: "active" | "ended";
    files: Map<string, string>;
    versions: Map<string, { seq: number; hash: string }[]>;
    blobs: Map<string, string>;
    checkpoints: Checkpoint[];
    subscribers: Set<ServerResponse>;
};

const { values: flags } = parseArgs({
    options: { port: { type: "string", default: "8080" }, tick: { type: "string", default: "4000" } },
});
const PORT = Number(flags.port);
const TICK_MS = Number(flags.tick);
const NOW = Date.parse("2026-01-01T09:00:00.000Z");

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const lines = (text: string) => (text === "" ? 0 : text.split("\n").length);

const DEMO_FILES: Record<string, string> = {
    "README.md": "# Demo session\n\nThis session is served by the fixture server.\nEdit anything and watch the viewer follow along.\n",
    "package.json": '{\n  "name": "demo",\n  "version": "1.0.0",\n  "scripts": { "dev": "vite" }\n}\n',
    "src/index.ts": 'import { greet } from "./greet";\n\nconsole.log(greet("biga"));\n',
    "src/greet.ts": "export function greet(name: string): string {\n    return `Hello, ${name}!`;\n}\n",
    "src/utils/math.ts": "export const add = (a: number, b: number) => a + b;\nexport const mul = (a: number, b: number) => a * b;\n",
    "src/utils/strings.ts": "export const shout = (text: string) => text.toUpperCase();\n",
    "src/styles/app.css": ":root {\n  --accent: #63e197;\n}\n\nbody {\n  margin: 0;\n}\n",
    "cmd/server/main.go": 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("hello")\n}\n',
    "docs/guide.md": "# Guide\n\n1. Install\n2. Run\n3. Share the link\n",
    "docs/notes/todo.md": "- [ ] write tests\n- [ ] ship\n",
    "dist/bundle.min.js": `${"var a=function(b){return b+1};".repeat(1_000)}\n`,
    "data/rows.json": `[\n${Array.from({ length: 25_000 }, (_, index) => `  { "id": ${index} },`).join("\n")}\n  null\n]\n`,
};

function bigFiles(): Record<string, string> {
    const files: Record<string, string> = { "README.md": "# Big session\n\n50,000 files.\n" };
    for (let dir = 0; dir < 500; dir++) {
        for (let file = 0; file < 100; file++) {
            files[`packages/pkg-${String(dir).padStart(3, "0")}/src/file-${String(file).padStart(3, "0")}.ts`] =
                `export const value${dir}_${file} = ${dir * 100 + file};\n`;
        }
    }
    return files;
}

type Directory = Extract<FileNode, { type: "directory" }>;

function childDirectory(parent: Directory, path: string, name: string): Directory {
    const existing = parent.children.find((child): child is Directory => child.type === "directory" && child.path === path);
    if (existing) return existing;
    const created: Directory = { type: "directory", name, path, children: [] };
    parent.children.push(created);
    return created;
}

function treeOf(session: Session): FileNode {
    const root: Directory = { type: "directory", name: "root", path: ".", children: [] };
    for (const [path, content] of session.files) {
        const segments = path.split("/");
        let directory = root;
        for (let index = 0; index < segments.length - 1; index++) {
            directory = childDirectory(directory, segments.slice(0, index + 1).join("/"), segments[index] as string);
        }
        directory.children.push({ type: "file", name: segments[segments.length - 1] as string, path, size: content.length, hash: sha(content) });
    }
    return root;
}

function commit(session: Session, edits: Record<string, string | null>, label?: string): Checkpoint {
    const seq = session.checkpoints.length;
    const changes: CheckpointChange[] = [];
    let additions = 0;
    let deletions = 0;
    for (const [path, next] of Object.entries(edits)) {
        const before = session.files.get(path);
        const beforeHash = before === undefined ? null : sha(before);
        const afterHash = next === null ? null : sha(next);
        if (before !== undefined) session.blobs.set(sha(before), before);
        if (next !== null) session.blobs.set(sha(next), next);
        const changeType = before === undefined ? "added" : next === null ? "deleted" : "modified";
        const added = Math.max(0, lines(next ?? "") - lines(before ?? "")) || (next !== null && next !== before ? 1 : 0);
        const removed = Math.max(0, lines(before ?? "") - lines(next ?? ""));
        additions += added;
        deletions += removed;
        changes.push({ path, changeType, beforeHash, afterHash, additions: added, deletions: removed, binary: false });
        if (next === null) session.files.delete(path);
        else session.files.set(path, next);
        if (afterHash) session.versions.set(path, [...(session.versions.get(path) ?? []), { seq, hash: afterHash }]);
    }
    const checkpoint: Checkpoint = {
        sessionId: session.id,
        seq,
        label: label ?? (seq === 0 ? "Initial snapshot" : `Save #${seq}`),
        createdAt: new Date(NOW + seq * 60_000).toISOString(),
        filesChanged: changes.length,
        additions,
        deletions,
        changes,
    };
    session.checkpoints.push(checkpoint);
    return checkpoint;
}

function createSession(id: string, scenario: Scenario): Session {
    const session: Session = {
        id,
        scenario,
        status: scenario === "ended" ? "ended" : "active",
        files: new Map(),
        versions: new Map(),
        blobs: new Map(),
        checkpoints: [],
        subscribers: new Set(),
    };
    commit(session, scenario === "big" ? bigFiles() : DEMO_FILES);
    if (scenario !== "big") {
        commit(session, { "src/greet.ts": "export function greet(name: string): string {\n    return `Hello, ${name}! Welcome.`;\n}\n" });
        commit(session, { "src/utils/math.ts": `${DEMO_FILES["src/utils/math.ts"]}export const sub = (a: number, b: number) => a - b;\n`, "docs/notes/todo.md": null });
        commit(session, { "README.md": `${DEMO_FILES["README.md"]}\nSecond paragraph.\n` });
    }
    return session;
}

const sessions = new Map<string, Session>([
    ["demo", createSession("demo", "demo")],
    ["big", createSession("big", "big")],
    ["ended", createSession("ended", "ended")],
]);

const summary = (checkpoint: Checkpoint) => {
    const { changes, ...rest } = checkpoint;
    void changes;
    return rest;
};

function sessionResponse(session: Session): SessionResponse {
    return {
        id: session.id,
        title: `${session.scenario} fixture`,
        description: "Served by the fixture server",
        status: session.status,
        createdAt: new Date(NOW).toISOString(),
        updatedAt: new Date().toISOString(),
        endedAt: session.status === "ended" ? new Date(NOW + 3_600_000).toISOString() : null,
        groupId: null,
    };
}

function state(session: Session): SessionState {
    const total = [...session.files.values()].reduce((sum, content) => sum + content.length, 0);
    const eager = total <= 1_536 * 1024 && session.files.size <= 400;
    const contents: Record<string, string> = {};
    if (eager) for (const content of session.files.values()) contents[sha(content)] = content;
    return {
        session: sessionResponse(session),
        snapshot: { sessionId: session.id, tree: treeOf(session), timestamp: Date.now(), sequenceNum: 0 },
        checkpoints: session.checkpoints.slice(-100).reverse().map(summary),
        mode: eager ? "eager" : "lazy",
        ...(eager ? { contents } : {}),
    };
}

function send(res: ServerResponse, status: number, body: Uint8Array, cache = "no-store"): void {
    res.writeHead(status, { "Content-Type": PROTOBUF_TYPE, "Cache-Control": cache });
    res.end(body);
}

const ok = (res: ServerResponse, body: Uint8Array, cache?: string) => send(res, 200, body, cache);
const fail = (res: ServerResponse, status: number, message: string) => send(res, status, encodeApiError("error", message));

function fileAt(session: Session, path: string, ref: string): string | undefined {
    if (/^[0-9a-f]{64}$/i.test(ref)) return session.blobs.get(ref) ?? session.files.get(path);
    if (ref === "latest") return session.files.get(path);
    const seq = Number(ref);
    const version = [...(session.versions.get(path) ?? [])].reverse().find((entry) => entry.seq <= seq);
    return version ? session.blobs.get(version.hash) ?? undefined : undefined;
}

function fileHistory(session: Session, path: string): FileHistoryEntry[] {
    return session.checkpoints
        .flatMap((checkpoint) => checkpoint.changes.filter((change) => change.path === path).map((change) => ({ checkpoint, change })))
        .reverse()
        .map(({ checkpoint, change }) => ({
            seq: checkpoint.seq,
            label: checkpoint.label,
            createdAt: checkpoint.createdAt,
            changeType: change.changeType,
            beforeHash: change.beforeHash,
            afterHash: change.afterHash,
            additions: change.additions,
            deletions: change.deletions,
            binary: false,
        }));
}

function stream(session: Session, req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, { "Content-Type": STREAM_TYPE, "Cache-Control": "no-cache, no-transform" });
    res.write(delimited(encodeStreamEvent({ type: "connected", sessionId: session.id, timestamp: Date.now() })));
    if (session.status !== "active") return void res.end();
    session.subscribers.add(res);
    const keepalive = setInterval(() => res.write(delimited(encodeStreamEvent("keepalive"))), 15_000);
    req.on("close", () => {
        clearInterval(keepalive);
        session.subscribers.delete(res);
    });
}

function broadcast(session: Session, checkpoint: Checkpoint): void {
    const frame = delimited(encodeStreamEvent({ type: "checkpoint", payload: checkpoint }));
    for (const res of session.subscribers) res.write(frame);
}

function tick(session: Session): void {
    const generated = [...session.files.keys()].filter((path) => path.startsWith("src/generated/"));
    const roll = Math.random();
    let edits: Record<string, string | null>;
    if (roll < 0.25) {
        edits = { [`src/generated/file-${session.checkpoints.length}.ts`]: `export const n = ${session.checkpoints.length};\n` };
    } else if (roll < 0.35 && generated.length > 0) {
        edits = { [generated[0] as string]: null };
    } else {
        const paths = Object.keys(DEMO_FILES).filter((path) => session.files.has(path) && path.endsWith(".ts"));
        const path = paths[Math.floor(Math.random() * paths.length)] as string;
        edits = { [path]: `${session.files.get(path)}// edit ${session.checkpoints.length}\n` };
    }
    broadcast(session, commit(session, edits));
}

setInterval(() => {
    const demo = sessions.get("demo");
    if (demo && demo.subscribers.size > 0) tick(demo);
}, TICK_MS);

createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") return void res.writeHead(204).end();
    const url = new URL(req.url ?? "/", "http://fixture");
    const match = url.pathname.match(/^\/api\/sessions\/([^/]+)(?:\/(.*))?$/);
    if (!match) return fail(res, 404, "not found");
    const session = sessions.get(match[1] as string);
    if (!session) return fail(res, 404, "Session not found");
    const route = match[2] ?? "";
    if (route === "") return ok(res, encodeSession(sessionResponse(session)));
    if (route === "state") return ok(res, encodeState(state(session)));
    if (route === "stream") return stream(session, req, res);
    if (route === "checkpoints") {
        const before = url.searchParams.get("before");
        const limit = Number(url.searchParams.get("limit") ?? 50);
        const page = session.checkpoints.filter((checkpoint) => before === null || checkpoint.seq < Number(before));
        return ok(res, encodeCheckpointList(page.slice(-limit).reverse().map(summary)));
    }
    const one = route.match(/^checkpoints\/(\d+)$/);
    if (one) {
        const checkpoint = session.checkpoints[Number(one[1])];
        return checkpoint ? ok(res, encodeCheckpoint(checkpoint)) : fail(res, 404, "Checkpoint not found");
    }
    if (route === "file") {
        const path = url.searchParams.get("path") ?? "";
        const ref = url.searchParams.get("ref") ?? "latest";
        const content = fileAt(session, path, ref);
        if (content === undefined) return fail(res, 404, "File not found");
        const immutable = /^[0-9a-f]{64}$/i.test(ref);
        return ok(res, encodeFileContent({ content, binary: false, hash: sha(content) }), immutable ? "public, max-age=31536000, immutable" : "no-store");
    }
    if (route === "file/history") return ok(res, encodeFileHistory(fileHistory(session, url.searchParams.get("path") ?? "")));
    return fail(res, 404, "not found");
}).listen(PORT, () => {
    console.log(`fixture server on http://localhost:${PORT} (sessions: demo, big, ended)`);
});
