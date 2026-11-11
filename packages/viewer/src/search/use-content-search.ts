"use client";

import { KIND_FILE } from "@biga/types/tree-table";
import {
    compileMatcher,
    searchContent,
    type FileMatches,
    type SearchOptions,
    type SearchSummary,
} from "@biga/viewer-core/runtime/content-search";
import { useCallback, useEffect, useRef, useState } from "react";

import { useRuntime, useStoreValue } from "../runtime/runtime-provider";

const MAX_FILE_BYTES = 1024 * 1024;

export type SearchState = {
    running: boolean;
    results: FileMatches[];
    progress: { searched: number; total: number };
    summary: SearchSummary | null;
    error: string | null;
    revision: number;
};

const IDLE: SearchState = {
    running: false,
    results: [],
    progress: { searched: 0, total: 0 },
    summary: null,
    error: null,
    revision: -1,
};

function inFolder(path: string, folder: string | null): boolean {
    return folder === null || folder === "" || path.startsWith(`${folder}/`);
}

export function useContentSearch(options: SearchOptions, folder: string | null) {
    const runtime = useRuntime();
    const { tree } = runtime.stores;
    const revision = useStoreValue(tree, (state) => state.revision);
    const [state, setState] = useState<SearchState>(IDLE);
    const controller = useRef<AbortController | null>(null);
    const key = `${options.query}\u0000${options.caseSensitive}\u0000${options.wholeWord}\u0000${options.regex}\u0000${folder ?? ""}`;
    const latest = useRef({ options, folder });

    useEffect(() => {
        latest.current = { options, folder };
    });

    const run = useCallback(() => {
        controller.current?.abort();
        const { options: current, folder: scope } = latest.current;
        const matcher = compileMatcher(current);
        if (matcher === null) {
            setState(IDLE);
            return;
        }
        if (!matcher.ok) {
            setState({ ...IDLE, error: matcher.error });
            return;
        }
        const abort = new AbortController();
        controller.current = abort;
        const startRevision = tree.getState().revision;
        const { reader } = tree.getState();
        const paths = reader.filePaths().filter((path) => {
            const entry = reader.entry(path);
            return entry !== undefined && entry.kind === KIND_FILE && !entry.binary && entry.size <= MAX_FILE_BYTES && inFolder(path, scope);
        });
        const found: FileMatches[] = [];
        let flushed = 0;
        setState({ ...IDLE, running: true, revision: startRevision, progress: { searched: 0, total: paths.length } });

        const load = async (path: string): Promise<string | null> => {
            const entry = reader.entry(path);
            if (!entry || !entry.hash) return null;
            const cached = runtime.blobs.get(entry.hash);
            if (cached) return cached.content;
            const file = await runtime.api.getFile(runtime.sessionId, path, entry.hash, { signal: abort.signal, priority: "low" });
            return file.binary ? null : file.content;
        };

        void searchContent({
            paths,
            options: current,
            load,
            signal: abort.signal,
            onFile: (result) => void found.push(result),
            onProgress: (searched, total) => {
                if (searched - flushed < 8 && searched < total) return;
                flushed = searched;
                setState((previous) => ({
                    ...previous,
                    running: true,
                    results: [...found].sort((a, b) => (a.path < b.path ? -1 : 1)),
                    progress: { searched, total },
                }));
            },
        }).then((summary) => {
            if (summary.cancelled) return;
            setState({
                running: false,
                results: [...found].sort((a, b) => (a.path < b.path ? -1 : 1)),
                progress: { searched: summary.searched, total: summary.total },
                summary,
                error: null,
                revision: startRevision,
            });
        });
    }, [runtime, tree]);

    useEffect(() => {
        const timer = setTimeout(run, 250);
        return () => clearTimeout(timer);
    }, [key, run]);

    useEffect(() => () => controller.current?.abort(), []);

    const stale = state.summary !== null && revision !== state.revision;
    return { ...state, stale, rerun: run };
}
