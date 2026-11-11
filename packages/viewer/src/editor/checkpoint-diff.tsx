"use client";

import { ChevronDownIcon, ChevronUpIcon, FileX2Icon, GitCommitVerticalIcon, SquareArrowOutUpRightIcon } from "lucide-react";
import { clientLazy } from "@biga/viewer/client-lazy";
import { useEffect } from "react";

import { useViewerPrefsStore } from "@biga/viewer/prefs";
import type { CheckpointChange } from "@biga/types/checkpoint";
import { firstViewableChange } from "@biga/types/tree-utils";

import { CodeSkeleton } from "@biga/viewer/viewer/code-skeleton";
import { EmptyState } from "@biga/viewer/viewer/empty-state";
import { DiffStat } from "@biga/viewer/viewer/diff-stat";
import { IconAction } from "@biga/viewer/viewer/icon-action";
import { CHANGE_META, formatDateTime } from "@biga/viewer/lib/change-meta";

import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { useViewerView } from "../runtime/navigation-context";
import { useBlob } from "./use-blob";

const MonacoDiffViewer = clientLazy(() => import("@biga/viewer/monaco-viewer").then((module) => module.MonacoDiffViewer), <CodeSkeleton />);

function ChangeDiff({ change }: { change: CheckpointChange }) {
    const wordWrap = useViewerPrefsStore((state) => state.wordWrap);
    const diffLayout = useViewerPrefsStore((state) => state.diffLayout);
    const binary = Boolean(change.binary);
    const before = useBlob(binary ? undefined : (change.beforeHash ?? undefined), change.path);
    const after = useBlob(binary ? undefined : (change.afterHash ?? undefined), change.path);
    const beforeReady = change.beforeHash === null || before.entry !== null;
    const afterReady = change.afterHash === null || after.entry !== null;

    if (binary) {
        return <EmptyState icon={FileX2Icon} title="Binary file" description="There is no text diff for a binary file." />;
    }
    if (before.error || after.error) {
        return <EmptyState tone="error" icon={FileX2Icon} title="Unable to load this change" description={before.error ?? after.error ?? ""} />;
    }
    if (!beforeReady || !afterReady) return <CodeSkeleton />;
    return (
        <MonacoDiffViewer
            path={change.path}
            original={before.entry?.content ?? ""}
            modified={after.entry?.content ?? ""}
            sideBySide={diffLayout === "split"}
            wordWrap={wordWrap ? "on" : "off"}
        />
    );
}

export function CheckpointDiff({ seq, file }: { seq: number; file: string | null }) {
    const runtime = useRuntime();
    const checkpoint = useStoreValue(runtime.stores.history, (state) => state.loaded.get(seq));
    const { openCheckpoint, openFile } = useViewerView();

    useEffect(() => {
        if (!checkpoint) void runtime.loadCheckpoint(seq).catch(() => undefined);
    }, [runtime, seq, checkpoint]);

    useEffect(() => {
        if (!checkpoint || file !== null) return;
        const first = firstViewableChange(checkpoint.changes) ?? checkpoint.changes[0]?.path ?? null;
        if (first) openCheckpoint(seq, first, "replace");
    }, [checkpoint, file, seq, openCheckpoint]);

    if (!checkpoint) return <CodeSkeleton />;
    if (checkpoint.changes.length === 0) {
        return (
            <EmptyState
                icon={GitCommitVerticalIcon}
                title={checkpoint.named ? checkpoint.label : "No file changes"}
                description={`Checkpoint #${checkpoint.seq} didn't change any files.`}
            />
        );
    }
    const index = Math.max(0, checkpoint.changes.findIndex((change) => change.path === file));
    const change = checkpoint.changes[index];
    if (!change) return <CodeSkeleton />;
    const meta = CHANGE_META[change.changeType];
    const step = (offset: number) => {
        const target = checkpoint.changes[index + offset];
        if (target) openCheckpoint(seq, target.path, "replace");
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3 text-[13px]">
                <span className={`font-mono text-[11px] font-semibold ${meta.className}`} title={meta.label}>
                    {meta.letter}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium" title={change.path}>
                    {change.path}
                </span>
                <span className="text-muted-foreground hidden shrink-0 text-xs md:inline">
                    #{checkpoint.seq} · {formatDateTime(checkpoint.createdAt)}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {index + 1} / {checkpoint.changes.length}
                </span>
                <DiffStat additions={change.additions} deletions={change.deletions} className="hidden text-xs sm:flex" />
                <IconAction label="Open the current file" disabled={!runtime.stores.tree.getState().reader.entry(change.path)} onClick={() => openFile(change.path)}>
                    <SquareArrowOutUpRightIcon />
                </IconAction>
                <IconAction label="Previous file" disabled={index === 0} onClick={() => step(-1)}>
                    <ChevronUpIcon />
                </IconAction>
                <IconAction label="Next file" disabled={index === checkpoint.changes.length - 1} onClick={() => step(1)}>
                    <ChevronDownIcon />
                </IconAction>
            </div>
            <div className="min-h-0 flex-1">
                <ChangeDiff key={`${seq}:${change.path}`} change={change} />
            </div>
        </div>
    );
}
