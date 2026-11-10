"use client";

import type { CheckpointChange } from "@biga/types";
import { useEditorStore } from "@biga/stores/editor-store";
import { useFileTreeStore } from "@biga/stores/file-tree-store";
import { useHistoryStore } from "@biga/stores/history-store";
import { useSessionStore } from "@biga/stores/session-store";
import { FilesIcon, GitGraphIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { toast } from "sonner";

import { ActivityBar, type ActivityView } from "@/components/activity-bar";
import { QuickOpen } from "@/components/quick-open";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CodeSkeleton } from "@/components/viewer/code-skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetchCheckpoint, fetchFileHistory } from "@/lib/session-api";
import { displayTitle } from "@/lib/session-title";
import { decorationsFromChanges, useSessionStream, type StreamStatus } from "@/lib/use-session-stream";

import { CheckpointDiffPane } from "./checkpoint-diff-pane";
import { CodeViewer } from "./code-viewer";
import { FileTree } from "./file-tree";
import { firstDiffable, HistoryPanel } from "./history-panel";
import { SessionHeader } from "./session-header";
import { SessionNotice } from "./session-notice";
import { SessionUnavailable } from "./session-unavailable";

/** Mirrors the loaded layout so nothing jumps when the session arrives. */
function ViewerSkeleton() {
    return (
        <div className="flex h-svh flex-col">
            <div className="flex h-12 shrink-0 items-center gap-3 border-b px-3">
                <Skeleton className="size-7" />
                <Skeleton className="h-3.5 w-40" />
                <div className="ml-auto flex items-center gap-2">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="hidden h-7 w-52 lg:block" />
                    <Skeleton className="size-7" />
                </div>
            </div>
            <div className="flex min-h-0 flex-1">
                <div className="bg-sidebar hidden w-11 shrink-0 border-r md:block" />
                <div className="bg-sidebar hidden w-[22%] max-w-80 shrink-0 space-y-3 border-r px-3 py-3 md:block">
                    <Skeleton className="h-2.5 w-12" />
                    {Array.from({ length: 10 }).map((_, i) => (
                        <Skeleton key={i} className="h-3" style={{ width: `${45 + ((i * 17) % 45)}%` }} />
                    ))}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="h-10 shrink-0 border-b" />
                    <div className="h-8 shrink-0 border-b" />
                    <CodeSkeleton />
                </div>
            </div>
            <p role="status" className="sr-only">
                Loading session…
            </p>
        </div>
    );
}

const ANNOUNCEMENTS: Partial<Record<StreamStatus, string>> = {
    live: "Connected. Watching live.",
    reconnecting: "Connection lost. Reconnecting.",
    offline: "Disconnected from the broadcast. Files may be out of date.",
    ended: "This broadcast has ended.",
};

const ACTIVITY_BAR_PX = 44;

/**
 * The panel library sizes in percentages, but a file tree needs pixels: names
 * stop being readable below ~200px however wide the window is. Convert pixel
 * targets to percentages of the space the panels share.
 */
function sidebarSizes(windowWidth: number) {
    const available = Math.max(1, windowWidth - ACTIVITY_BAR_PX);
    const percent = (px: number) => Math.min(45, Math.max(10, (px / available) * 100));
    return { defaultSize: percent(280), minSize: percent(200), maxSize: 45 };
}

/** Open a file in the editor and reveal it in the tree. */
function openPath(path: string) {
    useEditorStore.getState().openFile(path);
    const tree = useFileTreeStore.getState();
    tree.setSelectedPath(path);
    tree.expandAncestors(path);
}

/**
 * `embed` renders the viewer for an `<iframe>` on the landing page: the
 * "session ended" notice is suppressed, because the surrounding page already
 * says what this is, and links that leave the viewer target the top window so
 * they never strand a reader inside the frame. Nothing else changes, so the
 * preview is the real viewer.
 */
export function SessionViewer({
    sessionId,
    embed = false,
    initialCheckpointSeq,
}: {
    sessionId: string;
    embed?: boolean;
    initialCheckpointSeq?: number;
}) {
    const { status, ready, error, retry, reconnect } = useSessionStream(sessionId, initialCheckpointSeq);
    const session = useSessionStore((state) => state.session);
    const isMobile = useIsMobile();
    const [view, setView] = useState<ActivityView>(initialCheckpointSeq === undefined ? "explorer" : "timeline");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [quickOpen, setQuickOpen] = useState(false);
    const [selectedChange, setSelectedChange] = useState<CheckpointChange | null>(null);
    const sidebarRef = useRef<ImperativePanelHandle>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // A browser tab titled with the session's name is easier to find again.
    useEffect(() => {
        if (session) {
            document.title = `${displayTitle(session)} · biga`;
        }
    }, [session]);

    useEffect(() => {
        if (!ready || initialCheckpointSeq === undefined) return;
        const checkpoint = useHistoryStore.getState().bySeq.get(initialCheckpointSeq);
        if (checkpoint) {
            setView("timeline");
            setSelectedChange(firstDiffable(checkpoint.changes));
        } else {
            setView("explorer");
            toast.error("This checkpoint is unavailable");
        }
    }, [ready, sessionId, initialCheckpointSeq]);

    const selectedSeq = useHistoryStore((state) => state.selectedSeq);
    // Checkpoints that landed while the timeline wasn't on screen earn a dot
    // on the Timeline button.
    const latestSeq = useHistoryStore((state) => state.checkpoints[0]?.seq ?? null);
    const [seenSeq, setSeenSeq] = useState<number | null>(null);
    const timelineOnScreen = view === "timeline" && (isMobile ? drawerOpen : !sidebarCollapsed);
    useEffect(() => {
        if (latestSeq !== null && (seenSeq === null || timelineOnScreen)) {
            setSeenSeq(latestSeq);
        }
    }, [latestSeq, seenSeq, timelineOnScreen]);
    const unseenTimeline = latestSeq !== null && seenSeq !== null && latestSeq > seenSeq;

    const toggleSidebar = useCallback(() => {
        if (isMobile) {
            setDrawerOpen(true);
            return;
        }
        const panel = sidebarRef.current;
        if (panel?.isCollapsed()) {
            panel.expand();
        } else {
            panel?.collapse();
        }
    }, [isMobile]);

    /** Show the timeline, opening its newest checkpoint if nothing is picked. */
    const showTimeline = useCallback(() => {
        setView("timeline");
        if (isMobile) {
            setDrawerOpen(true);
        } else {
            sidebarRef.current?.expand();
        }
        const history = useHistoryStore.getState();
        const latest = history.checkpoints[0];
        if (latest && history.selectedSeq === null) {
            history.selectSeq(latest.seq);
            const cached = history.bySeq.get(latest.seq);
            if (cached) {
                useFileTreeStore.getState().setDecorations(decorationsFromChanges(cached.changes));
                setSelectedChange(firstDiffable(cached.changes));
            }
        }
    }, [isMobile]);

    const handleViewChange = useCallback(
        (next: ActivityView) => {
            if (!isMobile && next === view && !sidebarCollapsed) {
                // Picking the open view again hides the sidebar, as in most editors.
                sidebarRef.current?.collapse();
                return;
            }
            if (next === "timeline") {
                showTimeline();
                return;
            }
            setView(next);
            sidebarRef.current?.expand();
        },
        [isMobile, view, sidebarCollapsed, showTimeline]
    );

    /** "Show in timeline": jump to the newest checkpoint that touched the file. */
    const revealInTimeline = useCallback(
        async (path: string) => {
            showTimeline();
            try {
                const [latest] = await fetchFileHistory(sessionId, path);
                if (!latest) {
                    return;
                }
                const history = useHistoryStore.getState();
                const checkpoint =
                    history.bySeq.get(latest.seq) ?? (await fetchCheckpoint(sessionId, latest.seq));
                history.cacheCheckpoint(checkpoint);
                history.selectSeq(latest.seq);
                useFileTreeStore.getState().setDecorations(decorationsFromChanges(checkpoint.changes));
                setSelectedChange(
                    checkpoint.changes.find((change) => change.path === path) ?? firstDiffable(checkpoint.changes)
                );
            } catch {
                toast.error("Unable to find this file's changes", {
                    description: "Check your connection and try again.",
                });
            }
        },
        [sessionId, showTimeline]
    );

    const openInEditor = useCallback((path: string) => {
        setView("explorer");
        setDrawerOpen(false);
        openPath(path);
    }, []);

    const openQuickOpen = useCallback(() => setQuickOpen(true), []);
    const closeDrawer = useCallback(() => setDrawerOpen(false), []);

    if (status === "unavailable" && error) {
        return <SessionUnavailable sessionId={sessionId} error={error} embed={embed} onRetry={retry} />;
    }

    if (!ready || !session) {
        return <ViewerSkeleton />;
    }

    // Only reached in the browser: the session is never loaded during SSR.
    const sidebar = sidebarSizes(window.innerWidth);

    const sidePanel =
        view === "explorer" ? (
            <FileTree
                sessionId={sessionId}
                ended={status === "ended"}
                comfortable={isMobile}
                onOpenTimeline={(path) => void revealInTimeline(path)}
                onOpenQuickOpen={openQuickOpen}
                onFileOpened={isMobile ? closeDrawer : undefined}
            />
        ) : (
            <HistoryPanel
                sessionId={sessionId}
                selectedChange={selectedChange}
                onSelectChange={setSelectedChange}
                comfortable={isMobile}
                onChangePicked={isMobile ? closeDrawer : undefined}
            />
        );

    const mainContent =
        view === "timeline" ? (
            <CheckpointDiffPane
                sessionId={sessionId}
                selectedChange={selectedChange}
                onSelectChange={setSelectedChange}
                onOpenInEditor={openInEditor}
                onShowTimeline={isMobile || sidebarCollapsed ? showTimeline : undefined}
            />
        ) : (
            <CodeViewer sessionId={sessionId} onOpenQuickOpen={openQuickOpen} />
        );

    return (
        <div className="flex h-svh flex-col">
            <a
                href="#viewer-main"
                className="focus:bg-background focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:ring-2"
            >
                Skip to code
            </a>
            <SessionHeader
                sessionId={sessionId}
                checkpointSeq={view === "timeline" ? selectedSeq ?? undefined : undefined}
                status={status}
                embed={embed}
                isMobile={isMobile}
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={toggleSidebar}
                onOpenQuickOpen={openQuickOpen}
            />
            <SessionNotice status={status} embed={embed} onReconnect={reconnect} />

            {isMobile ? (
                <>
                    <main id="viewer-main" tabIndex={-1} className="min-h-0 flex-1 outline-none">
                        {mainContent}
                    </main>
                    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                        <SheetContent
                            side="left"
                            className="bg-sidebar text-sidebar-foreground w-[88vw] max-w-sm gap-0 p-0"
                        >
                            <SheetTitle className="sr-only">Browse session</SheetTitle>
                            <SheetDescription className="sr-only">
                                Switch between the session&apos;s files and its timeline of checkpoints.
                            </SheetDescription>
                            <div className="flex h-13 shrink-0 items-center border-b pr-12 pl-2.5">
                                <ToggleGroup
                                    type="single"
                                    value={view}
                                    onValueChange={(next) => {
                                        if (next === "explorer" || next === "timeline") {
                                            handleViewChange(next);
                                        }
                                    }}
                                    aria-label="View"
                                    className="w-full"
                                >
                                    <ToggleGroupItem value="explorer" className="flex-1 text-[13px]">
                                        <FilesIcon />
                                        Files
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="timeline" className="relative flex-1 text-[13px]">
                                        <GitGraphIcon />
                                        Timeline
                                        {unseenTimeline && view !== "timeline" && (
                                            <span aria-label="new checkpoints" className="bg-biga size-1.5 rounded-full" />
                                        )}
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                            <div className="min-h-0 flex-1">{sidePanel}</div>
                        </SheetContent>
                    </Sheet>
                </>
            ) : (
                <div className="flex min-h-0 flex-1">
                    <ActivityBar
                        view={view}
                        sidebarOpen={!sidebarCollapsed}
                        unseenTimeline={unseenTimeline}
                        onChange={handleViewChange}
                    />
                    <ResizablePanelGroup
                        direction="horizontal"
                        autoSaveId="biga-viewer-layout"
                        onLayout={(sizes) => setSidebarCollapsed((sizes[0] ?? 0) === 0)}
                        className="min-h-0 flex-1"
                    >
                        <ResizablePanel
                            ref={sidebarRef}
                            id="sidebar"
                            order={1}
                            {...sidebar}
                            collapsible
                            collapsedSize={0}
                            className="bg-sidebar text-sidebar-foreground min-w-0"
                        >
                            <aside aria-label={view === "explorer" ? "Files" : "Timeline"} className="h-full">
                                {sidePanel}
                            </aside>
                        </ResizablePanel>
                        <ResizableHandle />
                        <ResizablePanel id="main" order={2} defaultSize={100 - sidebar.defaultSize} minSize={40}>
                            <main id="viewer-main" tabIndex={-1} className="h-full outline-none">
                                {mainContent}
                            </main>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            )}

            <QuickOpen
                open={quickOpen}
                onOpenChange={setQuickOpen}
                onOpenFile={(path) => {
                    setView("explorer");
                    setDrawerOpen(false);
                    openPath(path);
                }}
            />
            <p role="status" className="sr-only">
                {ANNOUNCEMENTS[status] ?? ""}
            </p>
            <Toaster />
        </div>
    );
}
