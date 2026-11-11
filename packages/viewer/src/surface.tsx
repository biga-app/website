"use client";

import { createContext, useContext, useRef, type ReactNode, type RefObject } from "react";
import { useViewerHost } from "./host";

const SurfaceContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export function ViewerSurface({ children }: { children: ReactNode }) {
    const root = useRef<HTMLDivElement>(null);
    const { surface } = useViewerHost();
    return <SurfaceContext.Provider value={root}><div ref={root} data-viewer-surface={surface} className={surface === "inline" ? "relative isolate h-full min-h-0 overflow-hidden" : "min-h-svh"}>{children}</div></SurfaceContext.Provider>;
}

export function useViewerSurface() {
    return useContext(SurfaceContext);
}

export function useSheetContainer() {
    const { surface } = useViewerHost();
    const root = useViewerSurface();
    return surface === "inline" ? root ?? undefined : undefined;
}
