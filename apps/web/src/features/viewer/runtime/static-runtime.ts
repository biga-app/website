import type { ApiClient } from "@biga/types";

import { createRuntimeCore, type SessionRuntime } from "./runtime";

const noop = () => undefined;

const offline = async (): Promise<never> => {
    throw new Error("This runtime has no server.");
};

const staticApi: ApiClient = {
    getState: offline,
    getFile: offline,
    getCheckpoint: offline,
    getCheckpoints: async () => [],
    getFileHistory: async () => [],
};

export function createStaticRuntime(sessionId: string): SessionRuntime {
    return {
        ...createRuntimeCore(sessionId, staticApi),
        start: noop,
        stop: noop,
        reconnect: noop,
        retry: noop,
        setHidden: noop,
        notifyOnline: noop,
    };
}
