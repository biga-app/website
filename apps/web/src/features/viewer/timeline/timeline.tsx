"use client";

import type { Checkpoint, CheckpointChange, CheckpointSummary } from "@biga/types/checkpoint";
import { useVirtualizer } from "@tanstack/react-virtual";
import { GitGraphIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { FileTypeIcon } from "@/components/file-icon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/viewer/empty-state";
import { IconAction } from "@/components/viewer/icon-action";
import { PanelHeader } from "@/components/viewer/panel-header";
import { CHANGE_META, formatRelativeTime } from "@/lib/change-meta";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { baseName } from "@biga/types/file-identity";

import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { useViewerView } from "../runtime/navigation-context";

const PAGE = 50;
const CHECKPOINT_HEIGHT = 44;
const CHANGE_HEIGHT = 28;
const OVERSCAN = 8;

type Row =
    | { kind: "checkpoint"; summary: CheckpointSummary; selected: boolean }
    | { kind: "change"; seq: number; change: CheckpointChange; selected: boolean }
    | { kind: "loading"; seq: number };

function buildRows(
    checkpoints: readonly CheckpointSummary[],
    selectedSeq: number | null,
    selected: Checkpoint | undefined,
    activeFile: string | null
): Row[] {
    const rows: Row[] = [];
    for (let index = checkpoints.length - 1; index >= 0; index--) {
        const summary = checkpoints[index] as CheckpointSummary;
        const isSelected = summary.seq === selectedSeq;
        rows.push({ kind: "checkpoint", summary, selected: isSelected });
        if (!isSelected) continue;
        if (!selected) rows.push({ kind: "loading", seq: summary.seq });
        else for (const change of selected.changes) rows.push({ kind: "change", seq: summary.seq, change, selected: change.path === activeFile });
    }
    return rows;
}

function heightOf(row: Row | undefined): number {
    return row?.kind === "checkpoint" ? CHECKPOINT_HEIGHT : CHANGE_HEIGHT;
}

export function Timeline({ onPicked }: { onPicked?: () => void }) {
    const runtime = useRuntime();
    const { history } = runtime.stores;
    const checkpoints = useStoreValue(history, (state) => state.checkpoints);
    const selectedSeq = useStoreValue(history, (state) => state.selectedSeq);
    const selected = useStoreValue(history, (state) => (state.selectedSeq === null ? undefined : state.loaded.get(state.selectedSeq)));
    const { view, activeFile, openCheckpoint, showLive } = useViewerView();
    const now = useNow();
    const parentRef = useRef<HTMLDivElement>(null);
    const [exhausted, setExhausted] = useState(false);
    const fetching = useRef(false);

    const rows = useMemo(() => buildRows(checkpoints, selectedSeq, selected, view.type === "checkpoint" ? activeFile : null), [checkpoints, selectedSeq, selected, view.type, activeFile]);

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => heightOf(rows[index]),
        overscan: OVERSCAN,
    });
    const items = virtualizer.getVirtualItems();
    const lastVisible = items.length > 0 ? (items[items.length - 1] as { index: number }).index : 0;

    useEffect(() => {
        virtualizer.measure();
    }, [rows, virtualizer]);

    const oldest = checkpoints[0]?.seq ?? 0;
    useEffect(() => {
        if (exhausted || fetching.current || oldest <= 0 || lastVisible < rows.length - 4) return;
        fetching.current = true;
        runtime.api
            .getCheckpoints(runtime.sessionId, { before: oldest, limit: PAGE })
            .then((page) => {
                if (page.length < PAGE) setExhausted(true);
                history.getState().prepend(page);
            })
            .catch(() => setExhausted(true))
            .finally(() => {
                fetching.current = false;
            });
    }, [exhausted, oldest, lastVisible, rows.length, runtime, history]);

    const pick = (seq: number, file: string | null) => {
        openCheckpoint(seq, file, "replace");
        if (file) onPicked?.();
    };

    return (
        <div className="flex h-full flex-col">
            <PanelHeader
                title="Timeline"
                id="timeline-heading"
                meta={checkpoints.length > 0 ? checkpoints.length.toLocaleString() : undefined}
                actions={
                    selectedSeq !== null && (
                        <IconAction label="Back to the live files" onClick={() => showLive("push")}>
                            <GitGraphIcon />
                        </IconAction>
                    )
                }
            />
            {checkpoints.length === 0 ? (
                <EmptyState
                    icon={GitGraphIcon}
                    title="No checkpoints yet"
                    description="Each time the broadcaster saves, the change appears here."
                />
            ) : (
                <ScrollArea className="min-h-0 flex-1" viewportRef={parentRef}>
                    <ul
                        role="list"
                        aria-labelledby="timeline-heading"
                        className="relative w-full pb-2"
                        style={{ height: `${virtualizer.getTotalSize()}px` }}
                    >
                        {items.map((virtual) => {
                            const row = rows[virtual.index];
                            if (!row) return null;
                            const style = { height: virtual.size, transform: `translateY(${virtual.start}px)` };
                            if (row.kind === "loading") {
                                return (
                                    <li key={`l${row.seq}`} style={style} className="text-muted-foreground absolute start-0 top-0 flex w-full items-center ps-9 text-xs">
                                        Loading changes…
                                    </li>
                                );
                            }
                            if (row.kind === "change") {
                                const meta = CHANGE_META[row.change.changeType];
                                return (
                                    <li key={`c${row.seq}:${row.change.path}`} style={style} className="absolute start-0 top-0 w-full">
                                        <button
                                            type="button"
                                            aria-current={row.selected ? "true" : undefined}
                                            onClick={() => pick(row.seq, row.change.path)}
                                            className={cn(
                                                "hover:bg-sidebar-accent/60 focus-visible:ring-ring/70 flex h-full w-full items-center gap-1.5 pe-2 ps-8 text-start text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-inset",
                                                row.selected && "bg-sidebar-accent text-sidebar-accent-foreground"
                                            )}
                                        >
                                            <FileTypeIcon kind="file" name={baseName(row.change.path)} className="size-4" />
                                            <span className="truncate" title={row.change.path}>{baseName(row.change.path)}</span>
                                            <span className={cn("ms-auto w-3 shrink-0 text-center font-mono text-[11px] font-semibold", meta.className)} title={meta.label}>
                                                {meta.letter}
                                                <span className="sr-only">, {meta.label.toLowerCase()}</span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            }
                            const { summary } = row;
                            return (
                                <li key={`s${summary.seq}`} style={style} className="absolute start-0 top-0 w-full">
                                    <button
                                        type="button"
                                        aria-expanded={row.selected}
                                        onClick={() => (row.selected ? showLive("push") : pick(summary.seq, null))}
                                        className={cn(
                                            "hover:bg-sidebar-accent/60 focus-visible:ring-ring/70 flex h-full w-full flex-col justify-center gap-0.5 px-3 text-start outline-none focus-visible:ring-2 focus-visible:ring-inset",
                                            row.selected && "bg-sidebar-accent/50"
                                        )}
                                    >
                                        <span className="flex items-center gap-2 text-[13px] font-medium">
                                            <span className="truncate">{summary.label}</span>
                                            <span className="text-muted-foreground ms-auto shrink-0 text-[11px] font-normal tabular-nums">
                                                {formatRelativeTime(summary.createdAt, now)}
                                            </span>
                                        </span>
                                        <span className="text-muted-foreground flex items-center gap-2 text-[11px] tabular-nums">
                                            <span>#{summary.seq}</span>
                                            <span>{summary.filesChanged === 1 ? "1 file" : `${summary.filesChanged} files`}</span>
                                            <span className="text-success">+{summary.additions}</span>
                                            <span className="text-destructive">−{summary.deletions}</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </ScrollArea>
            )}
        </div>
    );
}
