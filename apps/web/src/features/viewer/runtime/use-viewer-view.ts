"use client";

import type { CompareBase, ViewerView } from "@biga/types";
import { deriveView, viewerParsers } from "@biga/viewer-core/location/search-params";
import { useQueryStates } from "nuqs";
import { useCallback } from "react";

type HistoryMode = "push" | "replace";

export function activeFileOf(view: ViewerView): string | null {
    if (view.type === "file") return view.path;
    if (view.type === "checkpoint") return view.file;
    return null;
}

export function useViewerView() {
    const [params, setParams] = useQueryStates(viewerParsers, { shallow: true });
    const view = deriveView(params);

    const openFile = useCallback(
        (path: string, history: HistoryMode = "push", base: CompareBase | null = null) =>
            void setParams({ file: path, checkpoint: null, base }, { history }),
        [setParams]
    );
    const openCheckpoint = useCallback(
        (seq: number, file: string | null = null, history: HistoryMode = "replace") =>
            void setParams({ checkpoint: seq, file, base: null }, { history }),
        [setParams]
    );
    const showLive = useCallback(
        (history: HistoryMode = "push") => void setParams({ file: null, checkpoint: null, base: null }, { history }),
        [setParams]
    );

    return { view, embed: params.embed, activeFile: activeFileOf(view), openFile, openCheckpoint, showLive };
}
