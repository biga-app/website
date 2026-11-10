import { createSessionHost } from "@biga/viewer-core/runtime/session-host";
import { abortableSleep, systemClock } from "@biga/viewer-core/runtime/system-env";

import { apiUrl } from "@/lib/api-url";

type WorkerScope = {
    postMessage(message: unknown): void;
    onmessage: ((event: MessageEvent) => void) | null;
    fetch: typeof fetch;
};

const scope = self as unknown as WorkerScope;

const host = createSessionHost({
    baseUrl: apiUrl(""),
    fetch: (input, init) => scope.fetch(input, init),
    clock: systemClock,
    random: Math.random,
    sleep: abortableSleep,
    post: (response) => scope.postMessage(response),
});

scope.onmessage = (event) => host.handle(event.data);
