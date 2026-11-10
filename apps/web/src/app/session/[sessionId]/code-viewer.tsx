"use client";

import { baseName, firstViewableChange } from "@biga/types";
import { useEditorStore } from "@biga/stores/editor-store";
import { useFileTreeStore } from "@biga/stores/file-tree-store";
import { useHistoryStore } from "@biga/stores/history-store";
import { useViewerPrefsStore } from "@biga/stores/viewer-prefs-store";
import { useMonaco } from "@monaco-editor/react";
import {
    ChevronDownIcon,
    DownloadIcon,
    EllipsisIcon,
    FileCodeIcon,
    FileIcon,
    FileX2Icon,
    GitCompareArrowsIcon,
    HistoryIcon,
    LinkIcon,
    LockIcon,
    RotateCwIcon,
    SearchIcon,
    XIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

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
import { Kbd, useModKey } from "@/components/ui/kbd";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CodeSkeleton } from "@/components/viewer/code-skeleton";
import { CopyButton } from "@/components/viewer/copy-button";
import { EmptyState } from "@/components/viewer/empty-state";
import { IconAction } from "@/components/viewer/icon-action";
import { pluralize } from "@/lib/change-meta";
import { copyWithToast, downloadText } from "@/lib/file-actions";
import { languageForPath, languageLabel } from "@/lib/languages";
import { useFileContent } from "@/lib/use-file-content";
import { useFileRevisionCount } from "@/lib/use-file-revision-count";
import { cn } from "@/lib/utils";

import { OpenTabs } from "./code-viewer-tab";
import { FileHistorySheet, SESSION_START_REF } from "./file-history-sheet";

const MonacoViewer = dynamic(
    () => import("@/components/monaco-viewer").then((m) => m.MonacoViewer),
    { ssr: false, loading: () => <CodeSkeleton /> }
);

const MonacoDiffViewer = dynamic(
    () => import("@/components/monaco-viewer").then((m) => m.MonacoDiffViewer),
    { ssr: false, loading: () => <CodeSkeleton /> }
);

function baseLabel(ref: string) {
    return ref === SESSION_START_REF ? "session start" : `checkpoint #${ref}`;
}

/** Open a file and point the tree at it. */
function openPath(path: string) {
    useEditorStore.getState().openFile(path);
    const tree = useFileTreeStore.getState();
    tree.setSelectedPath(path);
    tree.expandAncestors(path);
}

/** Shown when no tab is open: say where files come from and offer a way in. */
function NoFileOpen({ onOpenQuickOpen }: { onOpenQuickOpen: () => void }) {
    const mod = useModKey();
    const hasFiles = useFileTreeStore((state) => state.headMeta.size > 0);
    const latestPath = useHistoryStore((state) => {
        const latest = state.checkpoints[0];
        const checkpoint = latest ? state.bySeq.get(latest.seq) : undefined;
        return checkpoint ? firstViewableChange(checkpoint.changes) : undefined;
    });
    const latestExists = useFileTreeStore((state) =>
        latestPath ? state.headMeta.has(latestPath) : false
    );

    if (!hasFiles) {
        return (
            <EmptyState
                icon={FileCodeIcon}
                title="No files yet"
                description="Files open here once the broadcaster's first snapshot arrives."
            />
        );
    }

    return (
        <EmptyState
            icon={FileCodeIcon}
            title="No file open"
            description="Pick a file from the tree, or search for one by name."
        >
            <Button variant="outline" size="sm" onClick={onOpenQuickOpen}>
                <SearchIcon />
                Go to file
                <span className="ml-1 flex gap-0.5">
                    <Kbd>{mod}</Kbd>
                    <Kbd>P</Kbd>
                </span>
            </Button>
            {latestPath && latestExists && (
                <Button variant="ghost" size="sm" onClick={() => openPath(latestPath)}>
                    Open latest change
                </Button>
            )}
        </EmptyState>
    );
}

export function CodeViewer({
    sessionId,
    onOpenQuickOpen,
}: {
    sessionId: string;
    onOpenQuickOpen: () => void;
}) {
    const tabs = useEditorStore((state) => state.tabs);
    const activeFilePath = useEditorStore((state) => state.activeFilePath);
    const meta = useFileTreeStore((state) =>
        activeFilePath ? state.headMeta.get(activeFilePath) : undefined
    );
    const treeLoaded = useFileTreeStore((state) => state.root !== null);
    const wordWrap = useViewerPrefsStore((state) => state.wordWrap);
    const diffLayout = useViewerPrefsStore((state) => state.diffLayout);

    const [compare, setCompare] = useState(false);
    const [diffBase, setDiffBase] = useState(SESSION_START_REF);
    const [historyOpen, setHistoryOpen] = useState(false);

    // A revision picked in the history sheet belongs to one file's history;
    // fall back to the session-start baseline when the active file changes.
    useEffect(() => {
        setDiffBase(SESSION_START_REF);
    }, [activeFilePath]);

    /**
     * Dispose Monaco models for tabs that were closed since the last render.
     * Without this, models accumulate over a long session and leak memory.
     * Matching is done by path URI so that diff-editor models, which use
     * synthetic generated URIs, are never accidentally disposed here.
     */
    const monaco = useMonaco();
    const prevTabs = useRef<string[]>([]);
    useEffect(() => {
        if (monaco) {
            const current = new Set(tabs);
            for (const path of prevTabs.current) {
                if (!current.has(path)) {
                    monaco.editor.getModel(monaco.Uri.parse(path))?.dispose();
                }
            }
        }
        prevTabs.current = tabs;
    }, [monaco, tabs]);

    const deleted = Boolean(activeFilePath && treeLoaded && !meta);
    const binary = Boolean(meta?.binary);
    const revisionCount = useFileRevisionCount(sessionId, deleted ? null : activeFilePath, meta?.hash ?? null);
    const ref = deleted ? null : (meta?.hash ?? (activeFilePath ? "latest" : null));
    const current = useFileContent(sessionId, activeFilePath, ref, { binary });
    const comparing = compare && !binary && !deleted;
    const baseline = useFileContent(
        sessionId,
        comparing ? activeFilePath : null,
        comparing ? diffBase : null
    );

    if (!activeFilePath) {
        return <NoFileOpen onOpenQuickOpen={onOpenQuickOpen} />;
    }

    const content = current.content ?? "";
    const lineCount = content ? content.split("\n").length : 0;
    const name = baseName(activeFilePath);
    const language = languageForPath(activeFilePath);

    const selectTab = (path: string) => {
        useEditorStore.getState().setActiveFile(path);
        useFileTreeStore.getState().setSelectedPath(path);
    };

    const closeTab = (path: string) => {
        useEditorStore.getState().closeFile(path);
        const next = useEditorStore.getState().activeFilePath;
        useFileTreeStore.getState().setSelectedPath(next);
    };

    const closeOthers = () => {
        const editor = useEditorStore.getState();
        for (const path of editor.tabs) {
            if (path !== activeFilePath) {
                editor.closeFile(path);
            }
        }
    };

    const closeAll = () => {
        useEditorStore.getState().clearAll();
        useFileTreeStore.getState().setSelectedPath(null);
    };

    let body: React.ReactNode;
    if (deleted) {
        body = (
            <EmptyState
                icon={FileX2Icon}
                title={`${name} was deleted`}
                description="The broadcaster deleted this file. Its earlier versions are still in the timeline."
            >
                <Button variant="outline" size="sm" onClick={() => closeTab(activeFilePath)}>
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
    } else if (current.loading) {
        body = <CodeSkeleton />;
    } else if (current.error) {
        body = (
            <EmptyState tone="error" icon={FileX2Icon} title={`Unable to load ${name}`} description={current.error}>
                <Button variant="outline" size="sm" onClick={current.retry}>
                    <RotateCwIcon />
                    Try again
                </Button>
            </EmptyState>
        );
    } else if (comparing) {
        if (baseline.loading) {
            body = <CodeSkeleton />;
        } else if (baseline.error) {
            body = (
                <EmptyState
                    tone="error"
                    icon={GitCompareArrowsIcon}
                    title="Unable to load the earlier version"
                    description={baseline.error}
                >
                    <Button variant="outline" size="sm" onClick={baseline.retry}>
                        <RotateCwIcon />
                        Try again
                    </Button>
                </EmptyState>
            );
        } else if (baseline.content === null) {
            body = (
                <EmptyState
                    icon={GitCompareArrowsIcon}
                    title="Nothing to compare"
                    description={`${name} didn't exist at ${baseLabel(diffBase)}.`}
                >
                    <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
                        Choose another version
                    </Button>
                </EmptyState>
            );
        } else {
            body = (
                <MonacoDiffViewer
                    path={activeFilePath}
                    original={baseline.content}
                    modified={content}
                    sideBySide={diffLayout === "split"}
                    wordWrap={wordWrap ? "on" : "off"}
                />
            );
        }
    } else {
        body = <MonacoViewer path={activeFilePath} value={content} wordWrap={wordWrap ? "on" : "off"} />;
    }

    return (
        <div className="@container flex h-full flex-col">
            <div className="flex h-10 shrink-0 items-center border-b">
                <OpenTabs tabs={tabs} activePath={activeFilePath} onSelect={selectTab} onClose={closeTab} />
                <div className="flex shrink-0 items-center gap-0.5 border-l pr-1.5 pl-1.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="xs"
                                aria-pressed={comparing}
                                disabled={binary || deleted}
                                onClick={() => setCompare((value) => !value)}
                                className={cn(
                                    "text-muted-foreground hover:text-foreground",
                                    comparing && "bg-accent text-foreground"
                                )}
                            >
                                <GitCompareArrowsIcon className="size-3.5" />
                                <span className="hidden @lg:inline">Compare</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {comparing ? "Stop comparing" : "Compare with an earlier version"}
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="xs"
                                disabled={deleted}
                                aria-label={
                                    revisionCount
                                        ? `File history, ${pluralize(revisionCount, "revision")}`
                                        : "File history"
                                }
                                onClick={() => setHistoryOpen(true)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <HistoryIcon className="size-3.5" />
                                {revisionCount !== null && revisionCount > 1 && (
                                    <span className="text-[11px] tabular-nums">
                                        {revisionCount > 99 ? "99+" : revisionCount}
                                    </span>
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>File history</TooltipContent>
                    </Tooltip>
                    <CopyButton text={content} label="Copy file contents" disabled={binary || deleted || !content} />
                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label="More file actions"
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <EllipsisIcon />
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>More actions</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuCheckboxItem
                                checked={wordWrap}
                                onCheckedChange={(checked) =>
                                    useViewerPrefsStore.getState().setWordWrap(checked)
                                }
                            >
                                Wrap long lines
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => void copyWithToast(activeFilePath, "path")}>
                                <LinkIcon />
                                Copy path
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={binary || deleted || !content}
                                onSelect={() => downloadText(activeFilePath, content)}
                            >
                                <DownloadIcon />
                                Download {name}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={tabs.length < 2} onSelect={closeOthers}>
                                Close other tabs
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={closeAll}>Close all tabs</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex h-8 shrink-0 items-center gap-2 border-b pr-1.5">
                <CodeBreadcrumbs path={activeFilePath} />
                {comparing && (
                    <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-muted-foreground hidden text-xs @xl:inline">Comparing with</span>
                        <Button
                            variant="outline"
                            size="xs"
                            className="h-6 gap-1 px-2 font-normal"
                            onClick={() => setHistoryOpen(true)}
                            aria-label={`Comparing with ${baseLabel(diffBase)}. Choose another version`}
                        >
                            {baseLabel(diffBase)}
                            <ChevronDownIcon className="text-muted-foreground size-3" />
                        </Button>
                        <ToggleGroup
                            type="single"
                            value={diffLayout}
                            onValueChange={(value) => {
                                if (value === "unified" || value === "split") {
                                    useViewerPrefsStore.getState().setDiffLayout(value);
                                }
                            }}
                            aria-label="Diff layout"
                            className="hidden h-6 @2xl:inline-flex"
                        >
                            <ToggleGroupItem value="unified">Unified</ToggleGroupItem>
                            <ToggleGroupItem value="split">Split</ToggleGroupItem>
                        </ToggleGroup>
                        <IconAction label="Stop comparing" className="size-6" onClick={() => setCompare(false)}>
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
                {!binary && !deleted && lineCount > 0 && (
                    <span className="tabular-nums">{pluralize(lineCount, "line")}</span>
                )}
                <span className="ml-auto">{languageLabel(language)}</span>
            </footer>

            <FileHistorySheet
                sessionId={sessionId}
                path={activeFilePath}
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                diffBase={comparing ? diffBase : null}
                onSelectBase={(nextRef) => {
                    setDiffBase(nextRef);
                    setCompare(true);
                    setHistoryOpen(false);
                }}
                onStopComparing={() => {
                    setCompare(false);
                    setHistoryOpen(false);
                }}
            />
        </div>
    );
}
