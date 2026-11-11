"use client";

import { createViewerPrefsStore, type ViewerPrefsState } from "@biga/stores/viewer-prefs-store";
import type { ViewerActions } from "@biga/viewer/commands/types";
import type { SessionRuntime } from "@biga/viewer/runtime/runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { StoreApi } from "zustand";

import type { DemoBackend } from "@biga/demo/backend";
import { cleanSeed, randomSeed } from "@biga/demo/seed";

type Live = { backend: DemoBackend; runtime: SessionRuntime };

export type DemoValue = {
    seed: string | null;
    backend: DemoBackend | null;
    runtime: SessionRuntime | null;
    prefs: StoreApi<ViewerPrefsState>;
    publishActions: (actions: ViewerActions | null) => void;
    readActions: () => ViewerActions | null;
    paused: boolean;
    togglePaused: () => void;
    shuffle: () => void;
};

const DemoContext = createContext<DemoValue | null>(null);

export function useDemo(): DemoValue {
    const value = useContext(DemoContext);
    if (!value) throw new Error("useDemo must be used inside DemoProvider");
    return value;
}

function prefersReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function seedFromLocation(): string {
    return cleanSeed(new URLSearchParams(window.location.search).get("seed")) ?? randomSeed();
}

function onIdle(callback: () => void): () => void {
    if (typeof window.requestIdleCallback === "function") {
        const handle = window.requestIdleCallback(callback, { timeout: 1200 });
        return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(callback, 200);
    return () => window.clearTimeout(handle);
}

async function boot(seed: string): Promise<Live> {
    const [{ createDemoBackend }, { createSessionRuntime }] = await Promise.all([import("@biga/demo/backend"), import("@biga/viewer/runtime/runtime")]);
    const backend = await createDemoBackend({ seed });
    if (prefersReducedMotion()) backend.pause();
    const runtime = createSessionRuntime({ sessionId: backend.sessionId, fetch: backend.fetch, thread: "inline" });
    return { backend, runtime };
}

function watchVisibility(runtime: SessionRuntime): () => void {
    const onChange = () => runtime.setHidden(document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
}

export function DemoProvider({ children }: { children: ReactNode }) {
    const [seed, setSeed] = useState<string | null>(null);
    const [live, setLive] = useState<Live | null>(null);
    const [paused, setPaused] = useState(false);
    const [prefs] = useState(createViewerPrefsStore);
    const controller = useRef<ViewerActions | null>(null);
    const publishActions = useCallback((actions: ViewerActions | null) => void (controller.current = actions), []);
    const readActions = useCallback(() => controller.current, []);

    useEffect(() => setSeed(seedFromLocation()), []);

    useEffect(() => {
        if (!seed) return;
        let cancelled = false;
        let active: Live | null = null;
        let unwatch: () => void = () => undefined;
        const cancelIdle = onIdle(() => {
            void boot(seed).then((next) => {
                if (cancelled) return next.backend.dispose();
                active = next;
                unwatch = watchVisibility(next.runtime);
                next.runtime.start();
                setPaused(next.backend.paused());
                setLive(next);
            });
        });
        return () => {
            cancelled = true;
            cancelIdle();
            unwatch();
            active?.runtime.stop();
            active?.backend.dispose();
            setLive(null);
        };
    }, [seed]);

    const togglePaused = useCallback(() => {
        if (!live) return;
        if (live.backend.paused()) live.backend.resume();
        else live.backend.pause();
        setPaused(live.backend.paused());
    }, [live]);

    const shuffle = useCallback(() => setSeed(randomSeed()), []);

    const value = useMemo<DemoValue>(
        () => ({ seed, backend: live?.backend ?? null, runtime: live?.runtime ?? null, prefs, publishActions, readActions, paused, togglePaused, shuffle }),
        [seed, live, prefs, publishActions, readActions, paused, togglePaused, shuffle]
    );
    return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
