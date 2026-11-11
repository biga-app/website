"use client";

import { useReducedMotion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const INTERVAL_MS = 4200;
const MAX_SAVES = 5;

type BroadcastValue = {
    saves: number;
    paused: boolean;
    still: boolean;
    toggle: () => void;
};

const BroadcastContext = createContext<BroadcastValue>({ saves: 0, paused: false, still: false, toggle: () => undefined });

export function BroadcastProvider({ children }: { children: ReactNode }) {
    const reduce = useReducedMotion() ?? false;
    const [paused, setPaused] = useState(false);
    const [saves, setSaves] = useState(0);
    const toggle = useCallback(() => setPaused((value) => !value), []);
    const still = reduce || paused;

    useEffect(() => {
        if (still) return;
        const timer = setInterval(() => {
            if (document.hidden) return;
            setSaves((current) => (current >= MAX_SAVES ? 1 : current + 1));
        }, INTERVAL_MS);
        return () => clearInterval(timer);
    }, [still]);

    const value = useMemo(() => ({ saves, paused, still, toggle }), [saves, paused, still, toggle]);
    return <BroadcastContext.Provider value={value}>{children}</BroadcastContext.Provider>;
}

export function useBroadcast(): BroadcastValue {
    return useContext(BroadcastContext);
}
