"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { ReadableStore } from "@biga/types/stores";
import { viewerParsers } from "@biga/viewer-core/location/search-params";
import { useQueryState } from "nuqs";

import { createSessionRuntime, type SessionRuntime } from "./runtime";

const RuntimeContext = createContext<SessionRuntime | null>(null);

export function useRuntime(): SessionRuntime {
    const runtime = useContext(RuntimeContext);
    if (!runtime) throw new Error("useRuntime must be used inside SessionRuntimeProvider");
    return runtime;
}

export function useStoreValue<State, Value>(store: ReadableStore<State>, select: (state: State) => Value): Value {
    const subscribe = useCallback((notify: () => void) => store.subscribe(() => notify()), [store]);
    const read = () => select(store.getState());
    return useSyncExternalStore(subscribe, read, read);
}

export function SessionRuntimeProvider({
    sessionId,
    fallback,
    children,
}: {
    sessionId: string;
    fallback: ReactNode;
    children: ReactNode;
}) {
    const [runtime, setRuntime] = useState<SessionRuntime | null>(null);
    const [checkpoint] = useQueryState("checkpoint", viewerParsers.checkpoint);
    const initialSeq = useRef(checkpoint ?? undefined);

    useEffect(() => {
        const created = createSessionRuntime({ sessionId, initialCheckpointSeq: initialSeq.current });
        const onVisibility = () => created.setHidden(document.hidden);
        const onOnline = () => created.notifyOnline();
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("online", onOnline);
        created.start();
        setRuntime(created);
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("online", onOnline);
            created.stop();
            setRuntime(null);
        };
    }, [sessionId]);

    if (!runtime) return <>{fallback}</>;
    return <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>;
}

export function RuntimeProvider({ runtime, children }: { runtime: SessionRuntime; children: ReactNode }) {
    return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}
