"use client";

import type { CheckpointChange } from "@biga/types";
import { baseName } from "@biga/types";
import { useFileTreeStore } from "@biga/stores/file-tree-store";
import { useHistoryStore } from "@biga/stores/history-store";
import { useViewerPrefsStore } from "@biga/stores/viewer-prefs-store";
import {
    ChevronDownIcon,
    ChevronUpIcon,
    DownloadIcon,
    EllipsisIcon,
    FileIcon,
    FileX2Icon,
    GitCommitVerticalIcon,
    HistoryIcon,
    PanelLeftOpenIcon,
    RotateCwIcon,
    SquareArrowOutUpRightIcon,
} from "lucide-react";
import dynamic from "next/dynamic";

import { CodeBreadcrumbs } from "@/components/code-breadcrumbs";
import { FileTypeIcon } from "@/components/file-icon";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CodeSkeleton } from "@/components/viewer/code-skeleton";
import { CopyButton } from "@/components/viewer/copy-button";
import { EmptyState } from "@/components/viewer/empty-state";
import { IconAction } from "@/components/viewer/icon-action";
import { CHANGE_META, formatDateTime } from "@/lib/change-meta";
import { downloadText } from "@/lib/file-actions";
import { languageForPath, languageLabel } from "@/lib/languages";
import { useFileContent } from "@/lib/use-file-content";
import { cn } from "@/lib/utils";

import { DiffStat } from "./history-panel";

const MonacoDiffViewer = dynamic(
    () => import("@/components/monaco-viewer").then((m) => m.MonacoDiffViewer),
    { ssr: false, loading: () => <CodeSkeleton /> }
);

/**
 * What one checkpoint changed in one file. The header says which file and
 * which checkpoint, and steps through the checkpoint's other files without a
 * trip back to the sidebar (which may be a closed drawer on a phone).
 */
export function CheckpointDiffPane({
    sessionId,
    selectedChange,
    onSelectChange,
    onOpenInEditor,
    onShowTimeline,
}: {
    sessionId: string;
    selectedChange: CheckpointChange | null;
    onSelectChange: (change: CheckpointChange) => void;
    onOpenInEditor: (path: string) => void;
    /** Present when the timeline list is hidden (collapsed or in a drawer). */
    onShowTimeline?: () => void;
}) {
    const wordWrap = useViewerPrefsStore((state) => state.wordWrap);
    const diffLayout = useViewerPrefsStore((state) => state.diffLayout);
    const selectedSeq = useHistoryStore((state) => state.selectedSeq);
    const checkpoint = useHistoryStore((state) =>
        state.selectedSeq !== null ? state.bySeq.get(state.selectedSeq) : undefined
    );
    const hasCheckpoints = useHistoryStore((state) => state.checkpoints.length > 0);
    const existsNow = useFileTreeStore((state) =>
        selectedChange ? state.headMeta.has(selectedChange.path) : false
    );

    const binary = Boolean(selectedChange?.binary);
    const before = useFileContent(
        sessionId,
        selectedChange && !binary ? selectedChange.path : null,
        selectedChange?.beforeHash ?? null,
        { binary }
    );
    const after = useFileContent(
        sessionId,
        selectedChange && !binary ? selectedChange.path : null,
        selectedChange?.afterHash ?? null,
        { binary }
    );

    if (!selectedChange) {
        if (selectedSeq !== null && !checkpoint) {
            return <CodeSkeleton />;
        }
        if (checkpoint && checkpoint.changes.length === 0) {
            return (
                <EmptyState
                    icon={GitCommitVerticalIcon}
                    title={checkpoint.named ? checkpoint.label : "No file changes"}
                    description={checkpoint.named
                        ? `Checkpoint #${checkpoint.seq} marks the synced state at this point in the session.`
                        : `Checkpoint #${checkpoint.seq} didn't change any files.`}
                />
            );
        }
        return (
            <EmptyState
                icon={HistoryIcon}
                title={hasCheckpoints ? "Choose a checkpoint" : "No checkpoints yet"}
                description={
                    hasCheckpoints
                        ? "Every save becomes a checkpoint. Pick one to see exactly what changed."
                        : "Each time the broadcaster saves, the change appears in the timeline."
                }
            >
                {onShowTimeline && hasCheckpoints && (
                    <Button variant="outline" size="sm" onClick={onShowTimeline}>
                        <PanelLeftOpenIcon />
                        Show timeline
                    </Button>
                )}
            </EmptyState>
        );
    }

    const changes = checkpoint?.changes ?? [selectedChange];
    const position = Math.max(
        0,
        changes.findIndex((change) => change.path === selectedChange.path)
    );
    const previous = changes[position - 1];
    const next = changes[position + 1];
    const meta = CHANGE_META[selectedChange.changeType];
    const name = baseName(selectedChange.path);
    const afterContent = after.content ?? "";
    const error = before.error ?? after.error;

    let body: React.ReactNode;
    if (binary) {
        body = (
            <EmptyState
                icon={FileIcon}
                title="Binary file"
                description="biga lists binary files but never uploads their contents, so there's no diff to show."
            />
        );
    } else if (before.loading || after.loading) {
        body = <CodeSkeleton />;
    } else if (error) {
        body = (
            <EmptyState tone="error" icon={FileX2Icon} title="Unable to load this change" description={error}>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        before.retry();
                        after.retry();
                    }}
                >
                    <RotateCwIcon />
                    Try again
                </Button>
            </EmptyState>
        );
    } else {
        body = (
            <MonacoDiffViewer
                path={selectedChange.path}
                original={before.content ?? ""}
                modified={afterContent}
                sideBySide={diffLayout === "split"}
                wordWrap={wordWrap ? "on" : "off"}
            />
        );
    }

    return (
        <div className="@container flex h-full flex-col">
            <div className="flex h-10 shrink-0 items-center gap-2 border-b pr-1.5 pl-3">
                <FileTypeIcon kind="file" name={name} className="size-4" />
                <span
                    className={cn(
                        "min-w-0 truncate text-[13px] font-medium",
                        selectedChange.changeType === "deleted" && "line-through decoration-1"
                    )}
                    title={selectedChange.path}
                >
                    {name}
                </span>
                <span
                    className={cn(
                        "hidden shrink-0 rounded px-1.5 py-px text-[11px] font-medium @md:inline",
                        meta.className,
                        "bg-current/10"
                    )}
                >
                    <span className="text-current">{meta.label}</span>
                </span>
                <DiffStat
                    additions={selectedChange.additions}
                    deletions={selectedChange.deletions}
                    className="hidden shrink-0 text-[11px] @sm:flex"
                />

                <div className="ml-auto flex shrink-0 items-center gap-0.5">
                    {changes.length > 1 && (
                        <div className="mr-1 flex items-center">
                            <IconAction
                                label="Previous changed file"
                                disabled={!previous}
                                onClick={() => previous && onSelectChange(previous)}
                            >
                                <ChevronUpIcon />
                            </IconAction>
                            <span className="text-muted-foreground min-w-12 text-center text-[11px] tabular-nums">
                                {position + 1} of {changes.length}
                            </span>
                            <IconAction
                                label="Next changed file"
                                disabled={!next}
                                onClick={() => next && onSelectChange(next)}
                            >
                                <ChevronDownIcon />
                            </IconAction>
                        </div>
                    )}
                    <ToggleGroup
                        type="single"
                        value={diffLayout}
                        onValueChange={(value) => {
                            if (value === "unified" || value === "split") {
                                useViewerPrefsStore.getState().setDiffLayout(value);
                            }
                        }}
                        aria-label="Diff layout"
                        className="hidden @xl:inline-flex"
                        disabled={binary}
                    >
                        <ToggleGroupItem value="unified">Unified</ToggleGroupItem>
                        <ToggleGroupItem value="split">Split</ToggleGroupItem>
                    </ToggleGroup>
                    <CopyButton
                        text={afterContent}
                        label="Copy this version"
                        disabled={binary || !afterContent}
                    />
                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label="More actions"
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <EllipsisIcon />
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>More actions</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end" className="w-60">
                            <DropdownMenuItem
                                disabled={!existsNow || binary}
                                onSelect={() => onOpenInEditor(selectedChange.path)}
                            >
                                <SquareArrowOutUpRightIcon />
                                Open latest version
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={binary || !afterContent}
                                onSelect={() => downloadText(selectedChange.path, afterContent)}
                            >
                                <DownloadIcon />
                                Download this version
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={wordWrap}
                                onCheckedChange={(checked) =>
                                    useViewerPrefsStore.getState().setWordWrap(checked)
                                }
                            >
                                Wrap long lines
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                className="@xl:hidden"
                                checked={diffLayout === "split"}
                                onCheckedChange={(checked) =>
                                    useViewerPrefsStore.getState().setDiffLayout(checked ? "split" : "unified")
                                }
                            >
                                Side-by-side diff
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex h-8 shrink-0 items-center gap-3 border-b pr-3">
                <CodeBreadcrumbs path={selectedChange.path} />
                {checkpoint && (
                    <span className="text-muted-foreground hidden shrink-0 text-[11px] tabular-nums @lg:inline">
                        Checkpoint <span className="font-mono">#{checkpoint.seq}</span>
                        <span aria-hidden> · </span>
                        <time dateTime={checkpoint.createdAt}>{formatDateTime(checkpoint.createdAt)}</time>
                    </span>
                )}
            </div>

            <div className="min-h-0 flex-1">{body}</div>

            <footer className="bg-sidebar text-muted-foreground flex h-6 shrink-0 items-center gap-4 border-t px-3 text-[11px]">
                {checkpoint && (
                    <span className="tabular-nums @lg:hidden">
                        Checkpoint <span className="font-mono">#{checkpoint.seq}</span>
                    </span>
                )}
                <span className="ml-auto">{languageLabel(languageForPath(selectedChange.path))}</span>
            </footer>
        </div>
    );
}
