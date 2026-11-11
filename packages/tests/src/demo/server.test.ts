import assert from "node:assert/strict";
import test from "node:test";
import { createDemoFetch } from "@biga/demo/server/fetch";
import { broadcast, commit, createSession, setIgnored, snapshot } from "@biga/demo/server/session";
import { createApiClient } from "@biga/viewer-core/content/api-client";
import { createStreamTransport } from "@biga/viewer-core/transport/stream-transport";
import { decodeStreamEvent } from "@biga/types/wire";
import type { StreamEvent } from "@biga/types/events";

async function setup() {
    const session = createSession({ id: "test", title: "Test", startedAt: 1_700_000_000_000 });
    await commit(session, { "README.md": "# Hello\n", "dist/index.js": "export const ready = true;\n" });
    const fetch = createDemoFetch(session);
    const api = createApiClient({ baseUrl: "http://demo", fetch, sleep: async () => {} });
    return { session, fetch, api };
}

test("demo protobuf state, files, checkpoints and history round-trip through the real API client", async () => {
    const { session, api } = await setup();
    const initial = await api.getState("test");
    assert.equal(initial.session.title, "Test");
    assert.ok(initial.snapshot);
    assert.equal((await api.getFile("test", "README.md", "0")).content, "# Hello\n");
    await commit(session, { "README.md": "# Updated\n" }, "Update");
    assert.equal((await api.getCheckpoint("test", 1)).label, "Update");
    assert.equal((await api.getFileHistory("test", "README.md")).length, 2);
    assert.equal((await api.getCheckpoints("test")).length, 2);
    await commit(session, { "README.md": null });
    await assert.rejects(api.getFile("test", "README.md", "2"));
    assert.equal((await api.getFile("test", "README.md", "0")).content, "# Hello\n");
});

test("ignore rules replace the folder with a stub and prevent file reads", async () => {
    const { session, api } = await setup();
    setIgnored(session, "dist/", true, session.startedAt + 1);
    const tree = (await api.getState("test")).snapshot!.tree;
    assert.equal(tree.type, "directory");
    if (tree.type !== "directory") return;
    assert.deepEqual(tree.children.find((node) => node.path === "dist"), { type: "directory", name: "dist", path: "dist", children: [], ignored: true });
    await assert.rejects(api.getFile("test", "dist/index.js", "latest"));
    setIgnored(session, "dist/", false, session.startedAt + 2);
    assert.match((await api.getFile("test", "dist/index.js", "latest")).content, /ready/);
});

test("the real stream transport parses demo connected, checkpoint and snapshot frames and cleans up on abort", async () => {
    const { session, fetch } = await setup();
    const controller = new AbortController();
    const events: StreamEvent[] = [];
    const transport = createStreamTransport({ baseUrl: "http://demo", fetch });
    let connected!: () => void;
    const ready = new Promise<void>((resolve) => { connected = resolve; });
    const running = transport.connect("test", controller.signal, (event) => {
        if (event.type !== "frame") return;
        const decoded = decodeStreamEvent(event.data);
        if (!decoded) return;
        events.push(decoded);
        if (decoded.type === "connected") connected();
        if (decoded.type === "snapshot") controller.abort();
    }, null);
    await ready;
    const checkpoint = await commit(session, { "README.md": "# Save\n" });
    broadcast(session, { type: "checkpoint", payload: checkpoint });
    broadcast(session, { type: "snapshot", payload: snapshot(session) });
    await running;
    assert.deepEqual(events.map((event) => event.type), ["connected", "checkpoint", "snapshot"]);
    assert.equal(session.subscribers.size, 0);
});
