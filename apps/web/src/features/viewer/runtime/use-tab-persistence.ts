"use client";

import { useEffect } from "react";

import { useRuntime } from "./runtime-provider";

const WRITE_DELAY_MS = 300;

function storageKey(sessionId: string): string {
    return `biga:tabs:${sessionId}`;
}

function readTabs(sessionId: string): string[] {
    try {
        const raw = window.sessionStorage.getItem(storageKey(sessionId));
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
        return [];
    }
}

function writeTabs(sessionId: string, tabs: readonly string[]): void {
    try {
        window.sessionStorage.setItem(storageKey(sessionId), JSON.stringify(tabs));
    } catch {
        return;
    }
}

export function useTabPersistence() {
    const { sessionId, stores } = useRuntime();

    useEffect(() => {
        const { workspace } = stores;
        const saved = readTabs(sessionId);
        if (saved.length > 0) workspace.getState().restore([saved, []]);
        let timer: ReturnType<typeof setTimeout> | undefined;
        const unsubscribe = workspace.subscribe((state, previous) => {
            if (state.groups[0] === previous.groups[0]) return;
            clearTimeout(timer);
            timer = setTimeout(() => writeTabs(sessionId, state.groups[0]), WRITE_DELAY_MS);
        });
        return () => {
            clearTimeout(timer);
            unsubscribe();
        };
    }, [sessionId, stores]);
}
