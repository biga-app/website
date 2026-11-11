"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { ReadableStore } from "@biga/types/stores";

import { type SessionRuntime } from "./runtime";

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

export function RuntimeProvider({ runtime, children }: { runtime: SessionRuntime; children: ReactNode }) {
    return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}
