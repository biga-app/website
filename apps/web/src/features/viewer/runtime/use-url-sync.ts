"use client";

import { pickInitialFile } from "@biga/viewer-core/runtime/initial-file";
import { useEffect, useRef } from "react";

import { useRuntime, useStoreValue } from "./runtime-provider";
import { useViewerView } from "./navigation-context";

export function useUrlSync() {
    const runtime = useRuntime();
    const { stores } = runtime;
    const { view, activeFile, openFile } = useViewerView();
    const hasFiles = useStoreValue(stores.tree, (state) => state.fileCount > 0);
    const pickedInitial = useRef(false);
    const checkpointSeq = view.type === "checkpoint" ? view.seq : null;
    const isLive = view.type === "live";

    useEffect(() => {
        if (activeFile) stores.workspace.getState().openTab(activeFile);
    }, [activeFile, stores]);

    useEffect(() => {
        stores.history.getState().select(checkpointSeq);
        if (checkpointSeq === null) return;
        stores.workspace.getState().setSidebarView("timeline");
        void runtime.loadCheckpoint(checkpointSeq).catch(() => undefined);
    }, [checkpointSeq, runtime, stores]);

    useEffect(() => {
        if (pickedInitial.current || !hasFiles || !isLive) return;
        pickedInitial.current = true;
        const path = pickInitialFile(stores.tree.getState().reader);
        if (path) openFile(path, "replace");
    }, [hasFiles, isLive, stores, openFile]);
}
