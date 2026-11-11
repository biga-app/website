"use client";

import type { PanelTab } from "@biga/stores/viewer-prefs-store";
import { useViewerPrefsStore, useViewerPrefsApi } from "@biga/viewer/prefs";
import { baseName } from "@biga/types/file-identity";
import { GitCommitVerticalIcon, XIcon } from "lucide-react";
import { useEffect } from "react";

import { FileTypeIcon } from "@biga/viewer/file-icon";
import { ScrollArea } from "@biga/ui/components/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@biga/ui/components/tabs";
import { DiffStat } from "@biga/viewer/viewer/diff-stat";
import { EmptyState } from "@biga/viewer/viewer/empty-state";
import { IconAction } from "@biga/viewer/viewer/icon-action";
import { RowButton } from "@biga/viewer/viewer/row-button";
import { CHANGE_META, formatRelativeTime, pluralize } from "@biga/viewer/lib/change-meta";
import { useNow } from "@biga/viewer/lib/use-now";

import { useCommandContext } from "../commands/command-provider";
import { useViewerView } from "../runtime/navigation-context";
import { useRuntime, useStoreValue } from "../runtime/runtime-provider";

function ChangesTab() {
    const runtime = useRuntime();
    const { history } = runtime.stores;
    const { view, activeFile } = useViewerView();
    const { actions } = useCommandContext();
    const latestSeq = useStoreValue(history, (state) => state.checkpoints.at(-1)?.seq ?? null);
    const seq = view.type === "checkpoint" ? view.seq : latestSeq;
    const checkpoint = useStoreValue(history, (state) => (seq === null ? undefined : state.loaded.get(seq)));
    const now = useNow();

    useEffect(() => {
        if (seq !== null && !checkpoint) void runtime.loadCheckpoint(seq).catch(() => undefined);
    }, [seq, checkpoint, runtime]);

    if (seq === null) {
        return <EmptyState icon={GitCommitVerticalIcon} title="No checkpoints yet" description="Changed files appear here after the first save." />;
    }
    if (!checkpoint) {
        return <p className="text-muted-foreground p-3 text-xs">Loading checkpoint #{seq}…</p>;
    }

    return (
        <div className="flex flex-col">
            <p className="text-muted-foreground flex items-center gap-2 border-b px-3 py-1.5 text-xs">
                <span className="tabular-nums">#{checkpoint.seq}</span>
                <span className="truncate">{checkpoint.label}</span>
                <span className="ms-auto shrink-0 tabular-nums">
                    {pluralize(checkpoint.changes.length, "file")} · {formatRelativeTime(checkpoint.createdAt, now)}
                </span>
            </p>
            <ul>
                {checkpoint.changes.map((change) => {
                    const meta = CHANGE_META[change.changeType];
                    const selected = view.type === "checkpoint" && change.path === activeFile;
                    return (
                        <li key={change.path}>
                            <RowButton
                                selected={selected}
                                aria-current={selected ? "true" : undefined}
                                onClick={() => actions.openCheckpoint(checkpoint.seq, change.path, "replace")}
                            >
                                <span className={`w-3 shrink-0 text-center font-mono text-[11px] font-semibold ${meta.className}`} title={meta.label}>
                                    {meta.letter}
                                </span>
                                <FileTypeIcon kind="file" name={baseName(change.path)} className="size-4 shrink-0" />
                                <span className="min-w-0 flex-1 truncate" title={change.path}>
                                    {change.path}
                                </span>
                                <DiffStat additions={change.additions} deletions={change.deletions} className="shrink-0 text-xs" />
                            </RowButton>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function ActivityTab() {
    const runtime = useRuntime();
    const summaries = useStoreValue(runtime.stores.history, (state) => state.checkpoints);
    const { actions } = useCommandContext();
    const now = useNow();
    const recent = summaries.slice(-60).reverse();

    if (recent.length === 0) {
        return <EmptyState icon={GitCommitVerticalIcon} title="Waiting for saves" description="Every save is logged here as it arrives." />;
    }

    return (
        <ol role="log" aria-label="Saves, newest first" className="flex flex-col">
            {recent.map((summary) => (
                <li key={summary.seq}>
                    <RowButton onClick={() => actions.openCheckpoint(summary.seq, null, "push")} className="gap-3">
                        <span className="text-muted-foreground w-12 shrink-0 text-xs tabular-nums">#{summary.seq}</span>
                        <span className="min-w-0 flex-1 truncate">{summary.label}</span>
                        <span className="text-muted-foreground hidden shrink-0 text-xs sm:inline">{pluralize(summary.filesChanged, "file")}</span>
                        <DiffStat additions={summary.additions} deletions={summary.deletions} className="shrink-0 text-xs" />
                        <span className="text-muted-foreground w-16 shrink-0 text-end text-xs tabular-nums">{formatRelativeTime(summary.createdAt, now)}</span>
                    </RowButton>
                </li>
            ))}
        </ol>
    );
}

export function BottomPanel() {
    const preferences = useViewerPrefsApi();
    const tab = useViewerPrefsStore((state) => state.panelTab);
    const { actions } = useCommandContext();

    return (
        <section aria-label="Panel" className="bg-background flex h-full min-h-0 flex-col">
            <Tabs
                value={tab}
                onValueChange={(next) => preferences.getState().setPanelTab(next as PanelTab)}
                className="min-h-0 flex-1 gap-0"
            >
                <div className="flex h-9 shrink-0 items-center gap-1 border-b ps-2 pe-1.5">
                    <TabsList className="h-7 bg-transparent p-0">
                        <TabsTrigger value="changes" className="h-7 flex-none px-2 text-xs">
                            Changes
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="h-7 flex-none px-2 text-xs">
                            Activity
                        </TabsTrigger>
                    </TabsList>
                    <IconAction label="Close panel" className="ms-auto" onClick={() => actions.togglePanel()}>
                        <XIcon />
                    </IconAction>
                </div>
                <ScrollArea className="min-h-0 flex-1">
                    <TabsContent value="changes">
                        <ChangesTab />
                    </TabsContent>
                    <TabsContent value="activity">
                        <ActivityTab />
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </section>
    );
}
