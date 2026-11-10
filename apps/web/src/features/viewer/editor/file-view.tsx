"use client";

import { FileIcon, FileX2Icon, RotateCwIcon } from "lucide-react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { CodeSkeleton } from "@/components/viewer/code-skeleton";
import { EmptyState } from "@/components/viewer/empty-state";
import { useViewerPrefsStore } from "@biga/stores/viewer-prefs-store";
import { baseName } from "@biga/types";

import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { useViewerView } from "../runtime/use-viewer-view";
import { useBlob } from "./use-blob";

const MonacoViewer = dynamic(() => import("@/components/monaco-viewer").then((module) => module.MonacoViewer), {
    ssr: false,
    loading: () => <CodeSkeleton />,
});

export function FileView({ path }: { path: string }) {
    const { tree } = useRuntime().stores;
    const hash = useStoreValue(tree, (state) => state.reader.entry(path)?.hash);
    const binary = useStoreValue(tree, (state) => state.reader.entry(path)?.binary ?? false);
    const loaded = useStoreValue(tree, (state) => state.fileCount > 0);
    const wordWrap = useViewerPrefsStore((state) => state.wordWrap);
    const { showLive } = useViewerView();
    const blob = useBlob(binary ? undefined : hash, path);
    const name = baseName(path);

    if (loaded && hash === undefined) {
        return (
            <EmptyState
                icon={FileX2Icon}
                title={`${name} was deleted`}
                description="The broadcaster deleted this file. Its earlier versions are still in the timeline."
            >
                <Button variant="outline" size="sm" onClick={() => showLive("replace")}>
                    Close file
                </Button>
            </EmptyState>
        );
    }
    if (binary) {
        return (
            <EmptyState
                icon={FileIcon}
                title="Binary file"
                description="biga lists binary files but never uploads their contents, so there's nothing to preview."
            />
        );
    }
    if (blob.error) {
        return (
            <EmptyState tone="error" icon={FileX2Icon} title={`Unable to load ${name}`} description={blob.error}>
                <Button variant="outline" size="sm" onClick={blob.retry}>
                    <RotateCwIcon />
                    Try again
                </Button>
            </EmptyState>
        );
    }
    if (!blob.entry) return <CodeSkeleton />;
    return <MonacoViewer path={path} value={blob.entry.content} wordWrap={wordWrap ? "on" : "off"} />;
}
