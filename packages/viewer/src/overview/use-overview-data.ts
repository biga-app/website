"use client";

import type { Checkpoint } from "@biga/types/checkpoint";
import { KIND_FILE } from "@biga/types/tree-table";
import {
    bucketActivity,
    languageBreakdown,
    topChangedFiles,
    totalBytes,
    type ActivityBucket,
    type ChangedFile,
    type LanguageShare,
    type SizedPath,
} from "@biga/viewer-core/runtime/session-stats";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { languageForPath } from "@biga/viewer/lib/languages";

import { useRuntime, useStoreValue } from "../runtime/runtime-provider";

const RECENT_LIMIT = 25;
const CONCURRENCY = 4;
const EARLIER_PAGE = 200;
const LANGUAGE_LIMIT = 6;
const TOP_FILES = 8;

export type OverviewData = {
    buckets: ActivityBucket[];
    totalSaves: number;
    languages: LanguageShare[];
    fileCount: number;
    bytes: number;
    topFiles: ChangedFile[];
    topLoading: boolean;
    canLoadEarlier: boolean;
    loadingEarlier: boolean;
    loadEarlier: () => void;
};

function useSizedFiles(): SizedPath[] {
    const { tree } = useRuntime().stores;
    const revision = useStoreValue(tree, (state) => state.revision);
    return useMemo(() => {
        const { reader } = tree.getState();
        const files: SizedPath[] = [];
        for (const path of reader.filePaths()) {
            const entry = reader.entry(path);
            if (entry && entry.kind === KIND_FILE) files.push({ path, size: entry.size });
        }
        return files;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tree, revision]);
}

function useRecentCheckpoints(): { checkpoints: Checkpoint[]; loading: boolean } {
    const runtime = useRuntime();
    const { history } = runtime.stores;
    const summaries = useStoreValue(history, (state) => state.checkpoints);
    const loaded = useStoreValue(history, (state) => state.loaded);
    const failed = useRef(new Set<number>());
    const wanted = useMemo(
        () => summaries.filter((summary) => summary.seq > 0).slice(-RECENT_LIMIT).map((summary) => summary.seq),
        [summaries]
    );

    useEffect(() => {
        const missing = wanted.filter((seq) => !loaded.has(seq) && !failed.current.has(seq));
        if (missing.length === 0) return;
        let cancelled = false;
        const queue = [...missing];
        const worker = async () => {
            while (!cancelled) {
                const seq = queue.pop();
                if (seq === undefined) return;
                await runtime.loadCheckpoint(seq).catch(() => failed.current.add(seq));
            }
        };
        void Promise.all(Array.from({ length: CONCURRENCY }, worker));
        return () => {
            cancelled = true;
        };
    }, [wanted, loaded, runtime]);

    const checkpoints = useMemo(
        () => wanted.map((seq) => loaded.get(seq)).filter((checkpoint): checkpoint is Checkpoint => checkpoint !== undefined),
        [wanted, loaded]
    );
    return { checkpoints, loading: wanted.some((seq) => !loaded.has(seq) && !failed.current.has(seq)) };
}

function useEarlierHistory() {
    const runtime = useRuntime();
    const { history } = runtime.stores;
    const oldest = useStoreValue(history, (state) => state.checkpoints[0]?.seq ?? 0);
    const [exhausted, setExhausted] = useState(false);
    const [loading, setLoading] = useState(false);

    const load = useCallback(() => {
        if (loading || exhausted || oldest <= 0) return;
        setLoading(true);
        runtime.api
            .getCheckpoints(runtime.sessionId, { before: oldest, limit: EARLIER_PAGE })
            .then((page) => {
                if (page.length < EARLIER_PAGE) setExhausted(true);
                history.getState().prepend(page);
            })
            .catch(() => setExhausted(true))
            .finally(() => setLoading(false));
    }, [loading, exhausted, oldest, runtime, history]);

    return { canLoad: oldest > 0 && !exhausted, loading, load };
}

export function useOverviewData(): OverviewData {
    const { history } = useRuntime().stores;
    const summaries = useStoreValue(history, (state) => state.checkpoints);
    const files = useSizedFiles();
    const { checkpoints, loading } = useRecentCheckpoints();
    const earlier = useEarlierHistory();

    const buckets = useMemo(() => bucketActivity(summaries), [summaries]);
    const languages = useMemo(() => languageBreakdown(files, languageForPath, LANGUAGE_LIMIT), [files]);
    const topFiles = useMemo(() => topChangedFiles(checkpoints, TOP_FILES), [checkpoints]);
    const bytes = useMemo(() => totalBytes(files), [files]);

    return {
        buckets,
        totalSaves: summaries.length,
        languages,
        fileCount: files.length,
        bytes,
        topFiles,
        topLoading: loading,
        canLoadEarlier: earlier.canLoad,
        loadingEarlier: earlier.loading,
        loadEarlier: earlier.load,
    };
}
