"use client";

import { ApiRequestError } from "@biga/types";
import { useCallback, useEffect, useState } from "react";

import { useRuntime } from "../runtime/runtime-provider";

type RefState = {
    key: string | null;
    content: string | null;
    error: string | null;
};

const IDLE: RefState = { key: null, content: null, error: null };

function describe(error: unknown): string {
    return error instanceof Error ? error.message : "The earlier version could not be loaded.";
}

export function useRefContent(path: string | null, ref: string | null) {
    const runtime = useRuntime();
    const [state, setState] = useState<RefState>(IDLE);
    const [attempt, setAttempt] = useState(0);
    const key = path && ref ? `${path}\u0000${ref}` : null;

    useEffect(() => {
        if (!path || !ref) return;
        const nextKey = `${path}\u0000${ref}`;
        const controller = new AbortController();
        runtime.api
            .getFile(runtime.sessionId, path, ref, { signal: controller.signal })
            .then((result) => {
                runtime.blobs.set(result.hash, result.content);
                setState({ key: nextKey, content: result.content, error: null });
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return;
                const missing = error instanceof ApiRequestError && error.kind === "not_found";
                setState({ key: nextKey, content: null, error: missing ? null : describe(error) });
            });
        return () => controller.abort();
    }, [runtime, path, ref, attempt]);

    const retry = useCallback(() => {
        setState(IDLE);
        setAttempt((value) => value + 1);
    }, []);

    const current = state.key === key && key !== null;
    return { content: current ? state.content : null, error: current ? state.error : null, loading: key !== null && !current, retry };
}
