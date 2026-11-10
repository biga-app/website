"use client";

import type { FileHistoryEntry } from "@biga/types/checkpoint";
import type { CompareBase } from "@biga/types/viewer-location";
import { baseName } from "@biga/types/file-identity";
import { CheckIcon, FlagIcon, HistoryIcon, RotateCwIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { FileTypeIcon } from "@/components/file-icon";
import { DiffStat } from "@/components/viewer/diff-stat";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/viewer/empty-state";
import { CHANGE_META, formatDateTime, formatRelativeTime, pluralize } from "@/lib/change-meta";
import { useNow } from "@/lib/use-now";
import { isSameBase, refToBase } from "@biga/viewer-core/location/compare-base";
import { cn } from "@/lib/utils";

import { useRuntime } from "../runtime/runtime-provider";


const ROW =
    "relative flex w-full gap-3 rounded-md px-3 text-start outline-none transition-colors duration-150 " +
    "focus-visible:ring-ring/60 focus-visible:ring-2";

function RevisionRow({
    entry,
    current,
    first,
    last,
    selected,
    onSelect,
}: {
    entry: FileHistoryEntry;
    /** The revision the file is at now; comparing against it would show nothing. */
    current: boolean;
    first: boolean;
    last: boolean;
    selected: boolean;
    onSelect: (ref: string) => void;
}) {
    const meta = CHANGE_META[entry.changeType];
    const now = useNow();

    return (
        <button
            type="button"
            aria-pressed={current ? undefined : selected}
            disabled={current}
            onClick={() => onSelect(String(entry.seq))}
            className={cn(
                ROW,
                "py-2.5 disabled:cursor-default",
                !current && "hover:bg-accent/60",
                selected && "bg-accent"
            )}
        >
            <span aria-hidden className="relative flex w-3 shrink-0 justify-center">
                <span
                    className={cn(
                        "bg-border absolute w-px",
                        first ? "top-2" : "-top-2.5",
                        last ? "h-2" : "-bottom-2.5"
                    )}
                />
                <span className={cn("relative mt-1 size-[7px] rounded-full", meta.dot)} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex w-full items-baseline gap-2">
                    <span className="truncate text-[13px] font-medium">{entry.label}</span>
                    <time
                        dateTime={entry.createdAt}
                        title={formatDateTime(entry.createdAt)}
                        className="text-muted-foreground ms-auto shrink-0 text-[11px] tabular-nums"
                    >
                        {formatRelativeTime(entry.createdAt, now)}
                    </time>
                </span>
                <span className="text-muted-foreground flex items-center gap-2 text-[11px] tabular-nums">
                    <span className="font-mono">#{entry.seq}</span>
                    <span className={meta.className}>{meta.label}</span>
                    <DiffStat additions={entry.additions} deletions={entry.deletions} />
                    {current ? (
                        <span className="text-muted-foreground ms-auto">Current version</span>
                    ) : (
                        selected && (
                            <span className="text-foreground ms-auto flex items-center gap-1 font-medium">
                                <CheckIcon className="size-3.5" />
                                Comparing
                            </span>
                        )
                    )}
                </span>
            </span>
        </button>
    );
}

/**
 * Per-file history: every checkpoint that touched the file, newest first,
 * ending at the session start. Picking one makes it the version the editor's
 * compare mode diffs the current file against.
 */
export function FileHistorySheet({
    path,
    open,
    onOpenChange,
    base,
    onSelectBase,
    onStopComparing,
}: {
    path: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    base: CompareBase | null;
    onSelectBase: (base: CompareBase) => void;
    onStopComparing: () => void;
}) {
    const runtime = useRuntime();
    const [entries, setEntries] = useState<FileHistoryEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [retryNonce, setRetryNonce] = useState(0);

    useEffect(() => {
        if (!open) {
            return;
        }
        setEntries(null);
        setError(null);
        const controller = new AbortController();
        runtime.api
            .getFileHistory(runtime.sessionId, path, { signal: controller.signal })
            .then(setEntries)
            .catch((err: unknown) => {
                if (!controller.signal.aborted) {
                    setError(err instanceof Error ? err.message : "The history could not be loaded.");
                }
            });
        return () => controller.abort();
    }, [open, runtime, path, retryNonce]);

    // The initial snapshot (seq 0) already represents the session start; only
    // offer the synthetic "session start" baseline when it isn't in the list.
    const showSessionStart = !entries?.some((entry) => entry.seq === 0);
    const name = baseName(path);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
                <SheetHeader className="gap-1 border-b px-4 pt-4 pb-3">
                    <SheetTitle className="flex items-center gap-2 pe-8 text-sm">
                        <FileTypeIcon kind="file" name={name} className="size-4" />
                        <span className="truncate">History of {name}</span>
                    </SheetTitle>
                    <SheetDescription className="text-[13px]">
                        Choose an earlier version to compare the current file against.
                        {entries && entries.length > 0 && <> {pluralize(entries.length, "revision")} recorded.</>}
                    </SheetDescription>
                    <p className="text-muted-foreground truncate font-mono text-[11px]" title={path}>
                        {path}
                    </p>
                </SheetHeader>

                {error ? (
                    <EmptyState
                        tone="error"
                        icon={HistoryIcon}
                        title="Unable to load the history"
                        description={error}
                    >
                        <Button variant="outline" size="sm" onClick={() => setRetryNonce((nonce) => nonce + 1)}>
                            <RotateCwIcon />
                            Try again
                        </Button>
                    </EmptyState>
                ) : !entries ? (
                    <div className="space-y-2 p-4" aria-busy>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-11 w-full" />
                        ))}
                    </div>
                ) : entries.length <= 1 && !showSessionStart ? (
                    <EmptyState
                        icon={HistoryIcon}
                        title="No changes recorded"
                        description="This file hasn't changed since the session started."
                    />
                ) : (
                    <ScrollArea className="min-h-0 flex-1">
                        <div className="p-2">
                            {entries.map((entry, index) => (
                                <RevisionRow
                                    key={entry.seq}
                                    entry={entry}
                                    current={index === 0}
                                    first={index === 0}
                                    last={index === entries.length - 1 && !showSessionStart}
                                    selected={isSameBase(base, refToBase(String(entry.seq)))}
                                    onSelect={(ref) => onSelectBase(refToBase(ref))}
                                />
                            ))}
                            {showSessionStart && (
                                <button
                                    type="button"
                                    aria-pressed={isSameBase(base, { kind: "start" })}
                                    onClick={() => onSelectBase({ kind: "start" })}
                                    className={cn(
                                        ROW,
                                        "hover:bg-accent/60 items-center py-2.5",
                                        isSameBase(base, { kind: "start" }) && "bg-accent"
                                    )}
                                >
                                    <span aria-hidden className="flex w-3 shrink-0 justify-center">
                                        <FlagIcon className="text-muted-foreground size-3" />
                                    </span>
                                    <span className="flex flex-col">
                                        <span className="text-[13px] font-medium">Session start</span>
                                        <span className="text-muted-foreground text-[11px]">
                                            The file as it was when the broadcast began
                                        </span>
                                    </span>
                                    {isSameBase(base, { kind: "start" }) && (
                                        <span className="ms-auto flex items-center gap-1 text-[11px] font-medium">
                                            <CheckIcon className="size-3.5" />
                                            Comparing
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                    </ScrollArea>
                )}

                {base !== null && (
                    <div className="flex justify-end border-t p-3">
                        <Button variant="ghost" size="sm" onClick={onStopComparing}>
                            Stop comparing
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
