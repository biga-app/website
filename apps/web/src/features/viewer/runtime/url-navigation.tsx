"use client";

import type { CompareBase, HistoryMode, ViewerNavigation } from "@biga/types/viewer-location";
import { deriveView, viewerParsers } from "@biga/viewer-core/location/search-params";
import { useQueryStates } from "nuqs";
import { useMemo, type ReactNode } from "react";

import { activeFileOf, NavigationProvider } from "./navigation-context";

export function UrlNavigationProvider({ children }: { children: ReactNode }) {
    const [params, setParams] = useQueryStates(viewerParsers, { shallow: true });

    const navigation = useMemo<ViewerNavigation>(() => {
        const view = deriveView(params);
        return {
            view,
            embed: params.embed,
            activeFile: activeFileOf(view),
            openFile: (path: string, history: HistoryMode = "push", base: CompareBase | null = null) =>
                void setParams({ file: path, checkpoint: null, base }, { history }),
            openCheckpoint: (seq: number, file: string | null = null, history: HistoryMode = "replace") =>
                void setParams({ checkpoint: seq, file, base: null }, { history }),
            showLive: (history: HistoryMode = "push") =>
                void setParams({ file: null, checkpoint: null, base: null }, { history }),
        };
    }, [params, setParams]);

    return <NavigationProvider value={navigation}>{children}</NavigationProvider>;
}
