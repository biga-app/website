"use client";

import { useViewerPrefsStore } from "@biga/stores/viewer-prefs-store";
import { useEffect, useRef } from "react";

import { useRuntime } from "./runtime-provider";
import { useViewerView } from "./navigation-context";

const THROTTLE_MS = 400;
const PRELOAD_MS = 300;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useFollow() {
    const runtime = useRuntime();
    const { view, openFile } = useViewerView();
    const follow = useViewerPrefsStore((state) => state.follow);
    const latest = useRef({ view, follow, openFile });

    useEffect(() => {
        latest.current = { view, follow, openFile };
    });

    useEffect(() => {
        let pending: string | null = null;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const flush = async () => {
            timer = null;
            const path = pending;
            pending = null;
            if (!path) return;
            const entry = runtime.stores.tree.getState().reader.entry(path);
            if (entry && entry.hash && !entry.binary) {
                await Promise.race([runtime.loadBlob(entry.hash, path).catch(() => undefined), wait(PRELOAD_MS)]);
            }
            latest.current.openFile(path, "replace");
        };

        const stopListening = runtime.onFollow((path) => {
            const current = latest.current;
            if (!current.follow || current.view.type === "checkpoint") return;
            if (runtime.recentlyActive()) {
                runtime.stores.workspace.getState().pauseFollow(path);
                return;
            }
            pending = path;
            timer ??= setTimeout(() => void flush(), THROTTLE_MS);
        });

        return () => {
            stopListening();
            if (timer) clearTimeout(timer);
        };
    }, [runtime]);
}
