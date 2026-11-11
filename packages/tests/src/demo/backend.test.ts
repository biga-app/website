import assert from "node:assert/strict";
import test from "node:test";

import { ApiRequestError } from "@biga/types/api";
import type { Checkpoint } from "@biga/types/checkpoint";
import type { TransportEvent } from "@biga/types/stream";
import { decodeStreamEvent } from "@biga/types/wire";
import { createApiClient } from "@biga/viewer-core/content/api-client";
import { createStreamTransport } from "@biga/viewer-core/transport/stream-transport";
import { createDemoBackend, type DemoBackend } from "@biga/demo/backend";

import { settle } from "../fixtures/settle.ts";

const QUIET = 1_000_000_000;

function clientFor(backend: DemoBackend) {
    return createApiClient({ baseUrl: "", fetch: backend.fetch, sleep: async () => undefined, maxAttempts: 1 });
}

async function standalone(seed: string): Promise<DemoBackend> {
    return createDemoBackend({ seed, link: false, tickMs: QUIET });
}

async function waitFor(check: () => boolean): Promise<void> {
    for (let round = 0; round < 80 && !check(); round++) await new Promise((resolve) => setTimeout(resolve, 10));
    assert.ok(check(), "condition was not met in time");
}

test("the real api client reads a generated session: state, files, checkpoints and history", async () => {
    const backend = await standalone("round1");
    try {
        const api = clientFor(backend);
        const state = await api.getState(backend.sessionId);
        assert.equal(state.session.id, "round1");
        assert.equal(state.session.title, backend.project.name);
        assert.equal(state.checkpoints.length, 9);
        assert.equal(state.mode, "eager");

        const readme = await api.getFile(backend.sessionId, "README.md", "latest");
        assert.equal(readme.content, backend.session.files.get("README.md"));
        assert.equal(readme.binary, false);

        const logo = await api.getFile(backend.sessionId, "assets/logo.png", "latest");
        assert.equal(logo.binary, true);

        const checkpoint = await api.getCheckpoint(backend.sessionId, 3);
        assert.equal(checkpoint.seq, 3);
        assert.ok(checkpoint.changes.length > 0);

        const page = await api.getCheckpoints(backend.sessionId, { before: 5, limit: 2 });
        assert.deepEqual(page.map((item) => item.seq), [4, 3]);

        const history = await api.getFileHistory(backend.sessionId, "README.md");
        assert.ok(history.length >= 1);
        assert.equal(history.at(-1)?.seq, 0);
    } finally {
        backend.dispose();
    }
});

test("a save lands as a checkpoint on the stream the real transport reads", async () => {
    const backend = await standalone("stream1");
    const controller = new AbortController();
    const events: TransportEvent[] = [];
    const transport = createStreamTransport({ baseUrl: "", fetch: backend.fetch });
    const connected = transport.connect(backend.sessionId, controller.signal, (event) => events.push(event), null);
    try {
        await waitFor(() => events.some((event) => event.type === "open"));
        backend.save();
        await waitFor(() => events.some((event) => event.type === "frame" && decodeStreamEvent(event.data)?.type === "checkpoint"));
        const frames = events.flatMap((event) => (event.type === "frame" ? [decodeStreamEvent(event.data)] : []));
        const checkpoint = frames.find((frame) => frame?.type === "checkpoint");
        assert.equal(checkpoint?.type === "checkpoint" ? checkpoint.payload.seq : -1, 9);
    } finally {
        controller.abort();
        await connected;
        backend.dispose();
    }
});

test("ignoring a folder drops it from the tree and its files stop being served, and unignoring restores them", async () => {
    const backend = await standalone("ignore1");
    try {
        const api = clientFor(backend);
        const path = Object.keys(backend.project.files).find((candidate) => candidate.startsWith("docs/"))!;
        const hasDocs = async () => JSON.stringify((await api.getState(backend.sessionId)).snapshot?.tree).includes(`"${path}"`);
        assert.equal(await hasDocs(), true);

        backend.setIgnored("docs/", true);
        await settle();
        assert.equal(await hasDocs(), false);
        await assert.rejects(api.getFile(backend.sessionId, path, "latest"), (error) => error instanceof ApiRequestError && error.kind === "not_found");

        backend.setIgnored("docs/", false);
        await settle();
        assert.equal(await hasDocs(), true);
    } finally {
        backend.dispose();
    }
});

test("locked rules start hidden and show as empty stubs", async () => {
    const backend = await standalone("locked1");
    try {
        const tree = JSON.stringify((await clientFor(backend).getState(backend.sessionId)).snapshot?.tree);
        const vendor = backend.rules().find((rule) => rule.locked && rule.pattern.endsWith("/"))!;
        assert.ok(tree.includes(`"path":"${vendor.pattern.slice(0, -1)}"`));
        assert.ok(tree.includes('"ignored":true'));
    } finally {
        backend.dispose();
    }
});

test("a second tab replays the first tab's log and then follows it, checkpoint for checkpoint", async () => {
    const leader = await createDemoBackend({ seed: "sync1", tickMs: QUIET, peerWaitMs: 50 });
    leader.save();
    leader.save();
    await settle();
    const follower = await createDemoBackend({ seed: "sync1", tickMs: QUIET, peerWaitMs: 400 });
    try {
        assert.equal(leader.role(), "broadcaster");
        assert.equal(follower.role(), "follower");
        assert.equal(follower.startedAt, leader.startedAt);
        const seen: Checkpoint[] = [];
        follower.onCheckpoint((checkpoint) => seen.push(checkpoint));
        leader.save();
        follower.save();
        await waitFor(() => seen.length === 2);
        await settle();
        const summary = (backend: DemoBackend) => backend.session.checkpoints.map((checkpoint) => [checkpoint.seq, checkpoint.label, checkpoint.createdAt]);
        assert.deepEqual(summary(follower), summary(leader));
        assert.deepEqual([...follower.session.hashes], [...leader.session.hashes]);
        assert.equal(leader.session.checkpoints.length, 9 + 4);
    } finally {
        leader.dispose();
        follower.dispose();
    }
});

test("pausing stops the broadcast from saving by itself", async () => {
    const backend = await createDemoBackend({ seed: "pause1", link: false, tickMs: 20 });
    try {
        await waitFor(() => backend.session.checkpoints.length > 9);
        backend.pause();
        await settle();
        const count = backend.session.checkpoints.length;
        await new Promise((resolve) => setTimeout(resolve, 120));
        assert.equal(backend.session.checkpoints.length, count);
        assert.equal(backend.paused(), true);
        backend.resume();
        await waitFor(() => backend.session.checkpoints.length > count);
    } finally {
        backend.dispose();
    }
});
