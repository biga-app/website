"use client";

import type { ViewerNavigation, ViewerView } from "@biga/types/viewer-location";
import { createContext, useContext, type ReactNode } from "react";

const NavigationContext = createContext<ViewerNavigation | null>(null);

export function activeFileOf(view: ViewerView): string | null {
    if (view.type === "file") return view.path;
    if (view.type === "checkpoint") return view.file;
    return null;
}

export function useViewerView(): ViewerNavigation {
    const navigation = useContext(NavigationContext);
    if (!navigation) throw new Error("useViewerView must be used inside a navigation provider");
    return navigation;
}

export function NavigationProvider({ value, children }: { value: ViewerNavigation; children: ReactNode }) {
    return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}
