"use client";

import { useViewerPrefsStore } from "@biga/stores/viewer-prefs-store";
import { baseName } from "@biga/types/file-identity";
import type { CompareBase } from "@biga/types/viewer-location";
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
    LockIcon,
    RotateCwIcon,
    XIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { OpenTabs } from "./open-tabs";
import { CodeBreadcrumbs } from "@/components/code-breadcrumbs";
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
import { pluralize } from "@/lib/change-meta";
import { copyWithToast, downloadText } from "@/lib/file-actions";
import { languageForPath, languageLabel } from "@/lib/languages";
import { cn } from "@/lib/utils";

import { useViewerView } from "../runtime/navigation-context";
import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { LazyFileHistorySheet } from "./lazy-file-history-sheet";
import { FollowPausedPill } from "./follow-paused-pill";
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

export function FileEditor({ path }: { path: string }) {
    const runtime = useRuntime();
    const { tree, workspace } = runtime.stores;
    const { view, openFile, showLive } = useViewerView();
    const base = view.type === "file" ? view.base : null;
    const tabs = useStoreValue(workspace, (state) => state.tabs);
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
    const lineCount = current.entry?.lineCount ?? 0;

    const selectTab = (next: string) => openFile(next);
    const closeTab = (target: string) => {
        const next = workspace.getState().closeTab(target);
        if (target !== path) return;
        if (next) openFile(next, "replace");
        else showLive("replace");
    };
    const setBase = (next: CompareBase | null) => openFile(path, "replace", next);

    let body: React.ReactNode;
    if (deleted) {
        body = (
            <EmptyState
                icon={FileX2Icon}
                title={`${name} was deleted`}
                description="The broadcaster deleted this file. Its earlier versions are still in the timeline."
            >
                <Button variant="outline" size="sm" onClick={() => closeTab(path)}>
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
        body = <MonacoViewer path={path} value={content} wordWrap={wordWrap ? "on" : "off"} />;
    }

    return (
        <div className="@container flex h-full flex-col">
            <div className="flex h-10 shrink-0 items-center border-b">
                <OpenTabs tabs={[...tabs]} activePath={path} onSelect={selectTab} onClose={closeTab} />
                <FollowPausedPill />
                <div className="flex shrink-0 items-center gap-0.5 border-s ps-1.5 pe-1.5">
                    <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost"
                                size="xs"
                                aria-pressed={comparing}
                                disabled={binary || deleted}
                                onClick={() => setBase(base ? null : { kind: "start" })}
                                className={cn("text-muted-foreground hover:text-foreground", comparing && "bg-accent text-foreground")} />}>
                                <GitCompareArrowsIcon className="size-3.5" />
                                <span className="hidden @lg:inline">Compare</span>
                            </TooltipTrigger>
                        <TooltipContent>{comparing ? "Stop comparing" : "Compare with an earlier version"}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost"
                                size="xs"
                                disabled={deleted}
                                aria-label={revisionCount ? `File history, ${pluralize(revisionCount, "revision")}` : "File history"}
                                onClick={() => setHistoryOpen(true)}
                                className="text-muted-foreground hover:text-foreground" />}>
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
                                                variant="ghost"
                                                size="icon-xs"
                                                aria-label="More file actions"
                                                className="text-muted-foreground hover:text-foreground"
                                            />
                                        }
                                    />
                                }
                            >
                                <EllipsisIcon />
                            </TooltipTrigger>
                            <TooltipContent>More actions</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuCheckboxItem
                                checked={wordWrap}
                                onCheckedChange={(checked) => useViewerPrefsStore.getState().setWordWrap(checked)}
                            >
                                Wrap long lines
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => void copyWithToast(path, "path")}>
                                <LinkIcon />
                                Copy path
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={binary || deleted || !content} onClick={() => downloadText(path, content)}>
                                <DownloadIcon />
                                Download {name}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={tabs.length < 2} onClick={() => workspace.getState().closeOthers(path)}>
                                Close other tabs
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => {
                                    workspace.getState().closeAll();
                                    showLive("replace");
                                }}
                            >
                                Close all tabs
                            </DropdownMenuItem>
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

            <footer className="bg-sidebar text-muted-foreground flex h-6 shrink-0 items-center gap-4 border-t px-3 text-[11px]">
                <span className="flex items-center gap-1">
                    <LockIcon className="size-3" aria-hidden />
                    Read-only
                </span>
                {!binary && !deleted && lineCount > 0 && <span className="tabular-nums">{pluralize(lineCount, "line")}</span>}
                <span className="ms-auto">{languageLabel(languageForPath(path))}</span>
            </footer>

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
