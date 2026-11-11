"use client";

import type { HistoryMode, OpenFileOptions, ViewerNavigation } from "@biga/types/viewer-location";
import { deriveView, viewerParsers } from "@biga/viewer-core/location/search-params";
import { useQueryStates } from "nuqs";
import { useMemo, type ReactNode } from "react";

import { activeFileOf, NavigationProvider } from "./navigation-context";

const CLEARED = { file: null, checkpoint: null, base: null, line: null, overview: null } as const;

export function UrlNavigationProvider({ children }: { children: ReactNode }) {
    const [params, setParams] = useQueryStates(viewerParsers, { shallow: true });

    const navigation = useMemo<ViewerNavigation>(() => {
        const view = deriveView(params);
        return {
            view,
            embed: params.embed,
            activeFile: activeFileOf(view),
            splitFile: params.split,
            openFile: (path: string, options: OpenFileOptions = {}) => {
                const { history = "push", base = null, line = null, group = 0 } = options;
                if (group === 1) void setParams({ split: path }, { history });
                else void setParams({ ...CLEARED, file: path, base, line }, { history });
            },
            openCheckpoint: (seq: number, file: string | null = null, history: HistoryMode = "replace") =>
                void setParams({ ...CLEARED, checkpoint: seq, file }, { history }),
            showLive: (history: HistoryMode = "push") => void setParams(CLEARED, { history }),
            showOverview: (history: HistoryMode = "push") => void setParams({ ...CLEARED, overview: true }, { history }),
            clearView: (history: HistoryMode = "replace") => void setParams({ ...CLEARED, split: null }, { history }),
            closeSplit: (history: HistoryMode = "replace") => void setParams({ split: null }, { history }),
        };
    }, [params, setParams]);

    return <NavigationProvider value={navigation}>{children}</NavigationProvider>;
}
