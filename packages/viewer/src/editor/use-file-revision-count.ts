"use client";

import { useEffect, useState } from "react";

import { useRuntime } from "../runtime/runtime-provider";

const counts = new Map<string, number>();

function keyOf(sessionId: string, path: string, hash: string | null): string {
    return `${sessionId}\u0000${path}\u0000${hash ?? ""}`;
}

export function useFileRevisionCount(path: string | null, hash: string | null): number | null {
    const runtime = useRuntime();
    const key = path ? keyOf(runtime.sessionId, path, hash) : null;
    const [count, setCount] = useState<number | null>(key ? (counts.get(key) ?? null) : null);

    useEffect(() => {
        if (key === null || !path) {
            setCount(null);
            return;
        }
        const known = counts.get(key);
        setCount(known ?? null);
        if (known !== undefined) return;
        const controller = new AbortController();
        runtime.api
            .getFileHistory(runtime.sessionId, path, { signal: controller.signal })
            .then((entries) => {
                counts.set(key, entries.length);
                setCount(entries.length);
            })
            .catch(() => undefined);
        return () => controller.abort();
    }, [runtime, key, path]);

    return count;
}
