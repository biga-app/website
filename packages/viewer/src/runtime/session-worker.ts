import { createSessionHost } from "@biga/viewer-core/runtime/session-host";
import { abortableSleep, systemClock } from "@biga/viewer-core/runtime/system-env";


type WorkerScope = {
    postMessage(message: unknown): void;
    onmessage: ((event: MessageEvent) => void) | null;
    fetch: typeof fetch;
};

const scope = self as unknown as WorkerScope;

let host: ReturnType<typeof createSessionHost> | null = null;

scope.onmessage = (event) => {
    if (event.data.type === "configure") {
        host = createSessionHost({
            baseUrl: event.data.baseUrl,
            fetch: (input, init) => scope.fetch(input, init),
            clock: systemClock,
            random: Math.random,
            sleep: abortableSleep,
            post: (response) => scope.postMessage(response),
        });
        return;
    }
    host?.handle(event.data);
};
