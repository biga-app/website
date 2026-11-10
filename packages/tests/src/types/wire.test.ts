import assert from "node:assert/strict";
import test from "node:test";

import { create, toBinary } from "@bufbuild/protobuf";
import type { FileNode } from "@biga/types/file";
import * as pb from "@biga/types/gen/biga/v1/biga_pb";
import {
    decodeApiError,
    decodeCheckpoint,
    decodeCheckpointList,
    decodeFileContent,
    decodeFileHistory,
    decodeSession,
    decodeState,
    decodeStreamEvent,
    utf8Text,
} from "@biga/types/wire";

import { makeChange, makeCheckpoint, makeSummary } from "../fixtures/checkpoints.ts";
import { hash } from "../fixtures/hash.ts";
import { makeSessionResponse, makeState } from "../fixtures/session.ts";
import {
    encodeApiError,
    encodeCheckpoint,
    encodeCheckpointList,
    encodeFileContent,
    encodeFileHistory,
    encodeSession,
    encodeState,
    encodeStreamEvent,
} from "../fixtures/wire.ts";

test("a session keeps its optional fields as null when they are unset", () => {
    const session = makeSessionResponse("ended");
    assert.deepEqual(decodeSession(encodeSession(session)), { ...session, groupId: null });
    const grouped = { ...session, description: "about", endedAt: "2026-02-01T00:00:00.000Z", groupId: "ws1" };
    assert.deepEqual(decodeSession(encodeSession(grouped)), grouped);
});

test("an unknown session status is rejected", () => {
    const bytes = toBinary(pb.SessionSchema, create(pb.SessionSchema, { id: "s1", title: "t" }));
    assert.throws(() => decodeSession(bytes), /status/);
});

test("a state keeps its tree, summaries and eager contents", () => {
    const tree: FileNode = {
        type: "directory",
        name: "root",
        path: ".",
        children: [
            { type: "directory", name: "dist", path: "dist", children: [], ignored: true },
            { type: "directory", name: "src", path: "src", children: [{ type: "file", name: "a.ts", path: "src/a.ts", size: 3, hash: hash("a") }] },
            { type: "file", name: "logo.png", path: "logo.png", size: 12_000_000_000, hash: hash("b"), binary: true },
        ],
    };
    const state = makeState({ seqs: [0, 1, 2], mode: "eager", contents: { [hash("a")]: "héllo ✓\n" } });
    state.snapshot = { sessionId: "s1", tree, timestamp: 1700000000123, sequenceNum: 4 };
    const { state: decoded, contents } = decodeState(encodeState(state));
    assert.deepEqual(decoded.snapshot, state.snapshot);
    assert.deepEqual(decoded.checkpoints.map((item) => item.seq), [2, 1, 0]);
    assert.equal(decoded.contents, undefined, "content stays bytes until the caller reads it");
    assert.equal(utf8Text(contents[hash("a")] as Uint8Array), "héllo ✓\n");
    assert.equal(decoded.mode, "eager");
});

test("a lazy state without a snapshot has no contents", () => {
    const { state: decoded, contents } = decodeState(encodeState(makeState({ snapshot: false })));
    assert.equal(decoded.snapshot, null);
    assert.deepEqual(contents, {});
    assert.equal(decoded.mode, "lazy");
});

test("a state without a session or with an unknown mode is rejected", () => {
    assert.throws(() => decodeState(toBinary(pb.SessionStateSchema, create(pb.SessionStateSchema, {}))), /session/);
    const noMode = create(pb.SessionStateSchema, { session: { id: "s1", status: pb.SessionStatus.ACTIVE } });
    assert.throws(() => decodeState(toBinary(pb.SessionStateSchema, noMode)), /mode/);
});

test("a tree node with no kind is rejected", () => {
    const state = create(pb.SessionStateSchema, {
        session: { id: "s1", status: pb.SessionStatus.ACTIVE },
        mode: pb.LoadMode.LAZY,
        snapshot: { sessionId: "s1", tree: { name: "root", path: "." } },
    });
    assert.throws(() => decodeState(toBinary(pb.SessionStateSchema, state)), /kind/);
});

test("a checkpoint keeps names, renames, hashes and binary flags", () => {
    const checkpoint = makeCheckpoint(3, [
        makeChange("a.ts", "added"),
        makeChange("b.ts", "renamed", "2", { oldPath: "old.ts", beforeHash: hash("9"), binary: true }),
        makeChange("c.ts", "deleted", "3", { beforeHash: hash("8") }),
    ]);
    checkpoint.named = true;
    const decoded = decodeCheckpoint(encodeCheckpoint(checkpoint));
    assert.equal(decoded.named, true);
    assert.deepEqual(decoded.changes.map((change) => change.changeType), ["added", "renamed", "deleted"]);
    assert.equal(decoded.changes[1]?.oldPath, "old.ts");
    assert.equal(decoded.changes[1]?.binary, true);
    assert.equal(decoded.changes[2]?.afterHash, null);
    assert.equal("oldPath" in (decoded.changes[0] ?? {}), false);
    assert.equal("named" in decodeCheckpoint(encodeCheckpoint(makeCheckpoint(1))), false);
});

test("a change with an unknown type is rejected", () => {
    const bytes = toBinary(
        pb.CheckpointSchema,
        create(pb.CheckpointSchema, { summary: { sessionId: "s1" }, changes: [{ path: "a" }] })
    );
    assert.throws(() => decodeCheckpoint(bytes), /change type/);
});

test("lists decode in order", () => {
    assert.deepEqual(decodeCheckpointList(encodeCheckpointList([makeSummary(5), makeSummary(2)])).map((item) => item.seq), [5, 2]);
    const entry = { seq: 4, label: "#4", createdAt: makeSummary(4).createdAt, changeType: "modified" as const, beforeHash: null, afterHash: hash("a"), additions: 2, deletions: 1, binary: false };
    assert.deepEqual(decodeFileHistory(encodeFileHistory([entry])), [entry]);
});

test("file content decodes UTF-8 and tolerates bytes that are not", () => {
    const text = { content: "héllo ✓", binary: false, hash: hash("a") };
    const decoded = decodeFileContent(encodeFileContent(text));
    assert.deepEqual({ ...decoded, content: utf8Text(decoded.content) }, { ...text, encrypted: false });
    const raw = toBinary(pb.FileContentSchema, create(pb.FileContentSchema, { content: new Uint8Array([0x61, 0xff, 0x62]), hash: hash("a") }));
    assert.equal(utf8Text(decodeFileContent(raw).content), "a�b");
});

test("an error body decodes to its code and message", () => {
    assert.deepEqual(decodeApiError(encodeApiError("not_found", "Session was not found.")), { code: "not_found", message: "Session was not found." });
});

test("every stream event decodes to the viewer's event shape", () => {
    assert.deepEqual(decodeStreamEvent(encodeStreamEvent({ type: "connected", sessionId: "s1", timestamp: 1700000000000, replayed: false })), {
        type: "connected",
        sessionId: "s1",
        timestamp: 1700000000000,
        replayed: false,
    });
    assert.equal(
        decodeStreamEvent(encodeStreamEvent({ type: "connected", sessionId: "s1", timestamp: 1700000000000, replayed: true }))?.type === "connected" &&
            (decodeStreamEvent(encodeStreamEvent({ type: "connected", sessionId: "s1", timestamp: 1700000000000, replayed: true })) as { replayed: boolean }).replayed,
        true
    );
    assert.deepEqual(decodeStreamEvent(encodeStreamEvent({ type: "session_ended", sessionId: "s1", timestamp: 5 })), {
        type: "session_ended",
        sessionId: "s1",
        timestamp: 5,
    });
    const checkpoint = makeCheckpoint(2, [makeChange("a.ts", "modified", "1", { beforeHash: hash("2"), binary: false })]);
    assert.deepEqual(decodeStreamEvent(encodeStreamEvent({ type: "checkpoint", payload: checkpoint })), { type: "checkpoint", payload: checkpoint });
    assert.equal(decodeStreamEvent(encodeStreamEvent("keepalive")), null);
});

test("a stream frame with no event is rejected", () => {
    assert.throws(() => decodeStreamEvent(new Uint8Array(0)), /no event/);
});

test("the encrypted flag survives on sessions and files", () => {
    assert.equal(decodeSession(encodeSession({ ...makeSessionResponse(), encrypted: true })).encrypted, true);
    assert.equal("encrypted" in decodeSession(encodeSession(makeSessionResponse())), false);

    const sealed = new Uint8Array([1, 0, 9, 9, 9]);
    const file = decodeFileContent(encodeFileContent({ content: "", binary: false, hash: hash("a") }, sealed));
    assert.deepEqual([file.encrypted, [...file.content]], [true, [1, 0, 9, 9, 9]]);

    const { state, contents } = decodeState(encodeState({ ...makeState({ mode: "eager" }), session: { ...makeSessionResponse(), encrypted: true } }, { [hash("a")]: sealed }));
    assert.equal(state.session.encrypted, true);
    assert.deepEqual([...(contents[hash("a")] as Uint8Array)], [1, 0, 9, 9, 9]);
});
