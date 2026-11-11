"use client";

import { useViewerPrefsStore } from "@biga/stores/viewer-prefs-store";
import { baseName } from "@biga/types/file-identity";
import type { GroupIndex, CompareBase } from "@biga/types/viewer-location";
import { baseToRef } from "@biga/viewer-core/location/compare-base";
import {
    ChevronDownIcon,
    DownloadIcon,
    EllipsisIcon,
    FileIcon,
    FileX2Icon,
    GitCompareArrowsIcon,
    HistoryIcon,
    LinkIcon,
    RotateCwIcon,
    XIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import { CodeBreadcrumbs } from "@/components/code-breadcrumbs";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CodeSkeleton } from "@/components/viewer/code-skeleton";
import { CopyButton } from "@/components/viewer/copy-button";
import { EmptyState } from "@/components/viewer/empty-state";
import { IconAction } from "@/components/viewer/icon-action";
import { pluralize } from "@/lib/change-meta";

import { useCommandContext } from "../commands/command-provider";
import { CommandMenuItem } from "../commands/menu-items";
import { useViewerView } from "../runtime/navigation-context";
import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { useViewerUiStore } from "../shell/ui-state";
import { FollowPausedPill } from "./follow-paused-pill";
import { GroupTabs } from "./group-tabs";
import { LazyFileHistorySheet } from "./lazy-file-history-sheet";
import { useBlob } from "./use-blob";
import { useFileRevisionCount } from "./use-file-revision-count";
import { useRefContent } from "./use-ref-content";

const MonacoViewer = dynamic(() => import("@/components/monaco-viewer").then((module) => module.MonacoViewer), {
    ssr: false,
    loading: () => <CodeSkeleton />,
});

const MonacoDiffViewer = dynamic(() => import("@/components/monaco-viewer").then((module) => module.MonacoDiffViewer), {
    ssr: false,
    loading: () => <CodeSkeleton />,
});

function baseLabel(base: CompareBase): string {
    return base.kind === "start" ? "session start" : `checkpoint #${base.seq}`;
}

function Retry({ label, onRetry }: { label: string; onRetry: () => void }) {
    return (
        <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCwIcon />
            {label}
        </Button>
    );
}

export function FileEditor({ path, group = 0 }: { path: string; group?: GroupIndex }) {
    const runtime = useRuntime();
    const { tree } = runtime.stores;
    const { view, openFile } = useViewerView();
    const { actions } = useCommandContext();
    const ui = useViewerUiStore();
    const primary = group === 0 && view.type === "file";
    const base = primary ? view.base : null;
    const line = primary ? view.line : null;
    const hash = useStoreValue(tree, (state) => state.reader.entry(path)?.hash);
    const binary = useStoreValue(tree, (state) => state.reader.entry(path)?.binary ?? false);
    const loaded = useStoreValue(tree, (state) => state.fileCount > 0);
    const wordWrap = useViewerPrefsStore((state) => state.wordWrap);
    const diffLayout = useViewerPrefsStore((state) => state.diffLayout);
    const [historyOpen, setHistoryOpen] = useState(false);

    useEffect(() => {
        setHistoryOpen(false);
    }, [path]);

    const deleted = loaded && hash === undefined;
    const current = useBlob(binary || deleted ? undefined : hash, path);
    const comparing = base !== null && !binary && !deleted;
    const baseline = useRefContent(comparing ? path : null, comparing && base ? baseToRef(base) : null);
    const revisionCount = useFileRevisionCount(deleted ? null : path, hash ?? null);

    const name = baseName(path);
    const content = current.entry?.content ?? "";
    const target = { path, group };
    const setBase = (next: CompareBase | null) => openFile(path, { history: "replace", base: next });
    const editorActions = useMemo(
        () => [
            { id: "copy-link-to-line", label: "Copy Link to Line", run: (line: number) => actions.copyFileLink(path, line) },
            { id: "copy-path", label: "Copy Path", run: () => actions.copyText(path, "path") },
        ],
        [actions, path]
    );

    let body: React.ReactNode;
    if (deleted) {
        body = (
            <EmptyState
                icon={FileX2Icon}
                title={`${name} was deleted`}
                description="The broadcaster deleted this file. Its earlier versions are still in the timeline."
            >
                <Button variant="outline" size="sm" onClick={() => actions.closeTab(path, group)}>
                    Close tab
                </Button>
            </EmptyState>
        );
    } else if (binary) {
        body = (
            <EmptyState
                icon={FileIcon}
                title="Binary file"
                description="biga lists binary files but never uploads their contents, so there's nothing to preview."
            />
        );
    } else if (current.error) {
        body = (
            <EmptyState tone="error" icon={FileX2Icon} title={`Unable to load ${name}`} description={current.error}>
                <Retry label="Try again" onRetry={current.retry} />
            </EmptyState>
        );
    } else if (!current.entry) {
        body = <CodeSkeleton />;
    } else if (comparing && base) {
        if (baseline.loading) {
            body = <CodeSkeleton />;
        } else if (baseline.error) {
            body = (
                <EmptyState tone="error" icon={GitCompareArrowsIcon} title="Unable to load the earlier version" description={baseline.error}>
                    <Retry label="Try again" onRetry={baseline.retry} />
                </EmptyState>
            );
        } else if (baseline.content === null) {
            body = (
                <EmptyState icon={GitCompareArrowsIcon} title="Nothing to compare" description={`${name} didn't exist at ${baseLabel(base)}.`}>
                    <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
                        Choose another version
                    </Button>
                </EmptyState>
            );
        } else {
            body = (
                <MonacoDiffViewer
                    path={path}
                    original={baseline.content}
                    modified={content}
                    sideBySide={diffLayout === "split"}
                    wordWrap={wordWrap ? "on" : "off"}
                />
            );
        }
    } else {
        body = (
            <MonacoViewer
                path={path}
                value={content}
                wordWrap={wordWrap ? "on" : "off"}
                line={line}
                actions={editorActions}
                onCursor={(cursor) => ui.getState().setCursor(cursor)}
                onFocus={() => actions.focusGroup(group)}
            />
        );
    }

    return (
        <div className="@container flex h-full min-w-0 flex-col">
            <div className="flex h-10 shrink-0 items-center border-b">
                <GroupTabs group={group} activePath={path} />
                {group === 0 ? <FollowPausedPill /> : null}
                <div className="flex shrink-0 items-center gap-0.5 border-s ps-1.5 pe-1.5">
                    {group === 0 ? (
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button
                                        variant={comparing ? "secondary" : "outline"}
                                        size="xs"
                                        aria-pressed={comparing}
                                        aria-label="Compare"
                                        disabled={binary || deleted}
                                        onClick={() => setBase(base ? null : { kind: "start" })}
                                    />
                                }
                            >
                                <GitCompareArrowsIcon className="size-3.5" />
                                <span className="hidden @lg:inline">Compare</span>
                            </TooltipTrigger>
                            <TooltipContent>{comparing ? "Stop comparing" : "Compare with an earlier version"}</TooltipContent>
                        </Tooltip>
                    ) : null}
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    variant="outline"
                                    size="xs"
                                    disabled={deleted}
                                    aria-label={revisionCount ? `File history, ${pluralize(revisionCount, "revision")}` : "File history"}
                                    onClick={() => setHistoryOpen(true)}
                                />
                            }
                        >
                            <HistoryIcon className="size-3.5" />
                            {revisionCount !== null && revisionCount > 1 && (
                                <span className="text-[11px] tabular-nums">{revisionCount > 99 ? "99+" : revisionCount}</span>
                            )}
                        </TooltipTrigger>
                        <TooltipContent>File history</TooltipContent>
                    </Tooltip>
                    <CopyButton text={content} label="Copy file contents" disabled={binary || deleted || !content} />
                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <DropdownMenuTrigger
                                        render={
                                            <Button
                                                variant="outline"
                                                size="icon-xs"
                                                aria-label="More file actions"
                                            />
                                        }
                                    />
                                }
                            >
                                <EllipsisIcon />
                            </TooltipTrigger>
                            <TooltipContent>More actions</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end" className="w-60">
                            <CommandMenuItem id="view.wordWrap" kind="dropdown" />
                            <DropdownMenuSeparator />
                            <CommandMenuItem id="file.copyPath" kind="dropdown" target={target} icon={<LinkIcon />} />
                            <CommandMenuItem id="file.copyLink" kind="dropdown" target={target} />
                            <CommandMenuItem id="file.download" kind="dropdown" target={target} label={`Download ${name}`} icon={<DownloadIcon />} />
                            <DropdownMenuSeparator />
                            <CommandMenuItem id="view.splitRight" kind="dropdown" target={target} />
                            <CommandMenuItem id="file.closeOthers" kind="dropdown" target={target} />
                            <CommandMenuItem id="file.closeAll" kind="dropdown" />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex h-8 shrink-0 items-center gap-2 border-b pe-1.5">
                <CodeBreadcrumbs path={path} />
                {comparing && base && (
                    <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-muted-foreground hidden text-xs @xl:inline">Comparing with</span>
                        <Button
                            variant="outline"
                            size="xs"
                            className="h-6 gap-1 px-2 font-normal"
                            onClick={() => setHistoryOpen(true)}
                            aria-label={`Comparing with ${baseLabel(base)}. Choose another version`}
                        >
                            {baseLabel(base)}
                            <ChevronDownIcon className="text-muted-foreground size-3" />
                        </Button>
                        <ToggleGroup
                            value={[diffLayout]}
                            onValueChange={([value]) => {
                                if (value === "unified" || value === "split") useViewerPrefsStore.getState().setDiffLayout(value);
                            }}
                            aria-label="Diff layout"
                            className="hidden h-6 @2xl:inline-flex"
                        >
                            <ToggleGroupItem value="unified">Unified</ToggleGroupItem>
                            <ToggleGroupItem value="split">Split</ToggleGroupItem>
                        </ToggleGroup>
                        <IconAction label="Stop comparing" className="size-6" onClick={() => setBase(null)}>
                            <XIcon />
                        </IconAction>
                    </div>
                )}
            </div>

            <div className="min-h-0 flex-1">{body}</div>

            <LazyFileHistorySheet
                path={path}
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                base={comparing ? base : null}
                onSelectBase={(next) => {
                    setBase(next);
                    setHistoryOpen(false);
                }}
                onStopComparing={() => {
                    setBase(null);
                    setHistoryOpen(false);
                }}
            />
        </div>
    );
}
