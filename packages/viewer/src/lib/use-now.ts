"use client";

import { useSyncExternalStore } from "react";

/**
 * One shared clock for relative timestamps ("4m ago"). A single interval
 * serves every subscriber and only runs while something is subscribed, so a
 * timeline of a few hundred rows does not mean a few hundred timers.
 */
const TICK_MS = 30_000;
const listeners = new Set<() => void>();
let now = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
    listeners.add(listener);
    if (!timer) {
        now = Date.now();
        timer = setInterval(() => {
            now = Date.now();
            for (const notify of listeners) {
                notify();
            }
        }, TICK_MS);
    }
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer) {
            clearInterval(timer);
            timer = undefined;
        }
    };
}

const getSnapshot = () => now;

export function useNow(): number {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
