import { PROTOCOL_VERSION, type SessionHostEnv, type SessionPort, type WorkerRequest, type WorkerResponse } from "@biga/types/worker";

import { createApiClient } from "../content/api-client.ts";
import { createCoalescer } from "../pipeline/coalescer.ts";
import { createSupervisor } from "../pipeline/supervisor.ts";
import { buildTreeTable } from "../pipeline/tree-table.ts";
import { createSseTransport } from "../transport/sse-transport.ts";

type Running = {
    supervisor: ReturnType<typeof createSupervisor>;
    coalescer: ReturnType<typeof createCoalescer>;
};

export function createSessionHost(env: SessionHostEnv) {
    let running: Running | null = null;

    function stop(): void {
        running?.supervisor.stop();
        running?.coalescer.dispose();
        running = null;
    }

    function start(request: Extract<WorkerRequest, { type: "start" }>): void {
        stop();
        const coalescer = createCoalescer({
            send: (batch) => env.post({ type: "batch", version: PROTOCOL_VERSION, batch }),
            clock: env.clock,
        });
        const supervisor = createSupervisor({
            sessionId: request.config.sessionId,
            initialCheckpointSeq: request.config.initialCheckpointSeq,
            transport: createSseTransport({ baseUrl: env.baseUrl, fetch: env.fetch }),
            api: createApiClient({ baseUrl: env.baseUrl, fetch: env.fetch, sleep: env.sleep }),
            sink: coalescer,
            buildTable: buildTreeTable,
            clock: env.clock,
            random: env.random,
            onUnavailable: (kind) => env.post({ type: "unavailable", version: PROTOCOL_VERSION, kind }),
        });
        running = { supervisor, coalescer };
        supervisor.start();
    }

    return {
        handle(request: WorkerRequest): void {
            if (request.type === "start") return start(request);
            if (request.type === "stop") return stop();
            if (!running) return;
            if (request.type === "ack") running.coalescer.ack(request.id);
            else if (request.type === "reconnect") running.supervisor.reconnect();
            else if (request.type === "retry") running.supervisor.retry();
            else if (request.type === "visibility") running.supervisor.setHidden(request.hidden);
            else running.supervisor.notifyOnline();
        },
    };
}

export function createInThreadPort(env: Omit<SessionHostEnv, "post">): SessionPort {
    const listeners = new Set<(response: WorkerResponse) => void>();
    const host = createSessionHost({
        ...env,
        post: (response) => queueMicrotask(() => listeners.forEach((listener) => listener(response))),
    });
    return {
        send: (request) => host.handle(request),
        listen: (listener) => void listeners.add(listener),
        terminate: () => host.handle({ type: "stop", version: PROTOCOL_VERSION }),
    };
}
