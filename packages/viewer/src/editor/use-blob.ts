"use client";

import type { BlobEntry } from "@biga/types/content";
import { useCallback, useEffect, useState } from "react";

import { useRuntime } from "../runtime/runtime-provider";

type BlobState = {
    key: string | null;
    entry: BlobEntry | null;
    error: string | null;
};

const IDLE: BlobState = { key: null, entry: null, error: null };

function describe(error: unknown): string {
    return error instanceof Error ? error.message : "The file could not be loaded.";
}

export function useBlob(hash: string | undefined, path: string | null) {
    const runtime = useRuntime();
    const [state, setState] = useState<BlobState>(IDLE);
    const [attempt, setAttempt] = useState(0);
    const key = hash && path ? `${path}\u0000${hash}` : null;
    const pathKey = path ?? "";

    useEffect(() => {
        if (!hash || !path) return;
        const nextKey = `${path}\u0000${hash}`;
        let cancelled = false;
        runtime.blobs.pin(hash);
        const cached = runtime.blobs.get(hash);
        if (cached) {
            setState({ key: nextKey, entry: cached, error: null });
        } else {
            runtime
                .loadBlob(hash, path)
                .then((entry) => !cancelled && setState({ key: nextKey, entry, error: null }))
                .catch((error: unknown) => !cancelled && setState({ key: nextKey, entry: null, error: describe(error) }));
        }
        return () => {
            cancelled = true;
            runtime.blobs.unpin(hash);
        };
    }, [runtime, hash, path, attempt]);

    const retry = useCallback(() => {
        setState(IDLE);
        setAttempt((value) => value + 1);
    }, []);

    const current = state.key === key;
    const samePath = state.key !== null && state.key.startsWith(`${pathKey}\u0000`);
    const shown = current ? state : samePath ? state : IDLE;
    return {
        entry: shown.entry,
        error: current ? state.error : null,
        loading: key !== null && !current && !(samePath && state.entry),
        retry,
    };
}
