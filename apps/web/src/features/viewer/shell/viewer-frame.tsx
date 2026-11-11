"use client";

import type { SidebarView } from "@biga/types/stores";
import type { StreamStatus } from "@biga/types/stream";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";

import { SessionNotice } from "./session-notice";
import { SessionUnavailable } from "./session-unavailable";
import { ActivityBar } from "@/components/activity-bar";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { displayTitle } from "@/lib/session-title";

import { EditorPane } from "../editor/editor-pane";
import { LazyQuickOpen } from "../quick-open/lazy-quick-open";
import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { useFollow } from "../runtime/use-follow";
import { useUrlSync } from "../runtime/use-url-sync";
import { useViewerView } from "../runtime/navigation-context";
import { FrameSkeleton } from "./frame-skeleton";
import { SIDEBAR_COOKIE, SIDEBAR_MAX_PERCENT, SIDEBAR_MIN_PERCENT } from "./sidebar-size";
import { SidebarBody } from "./sidebar-body";
import { ViewerHeader } from "./viewer-header";

const ANNOUNCEMENTS: Partial<Record<StreamStatus, string>> = {
    live: "Connected. Watching live.",
    reconnecting: "Connection lost. Reconnecting.",
    offline: "Disconnected from the broadcast. Files may be out of date.",
    ended: "This broadcast has ended.",
};

function rememberSidebarSize(percent: number): void {
    if (percent <= 0) return;
    document.cookie = `${SIDEBAR_COOKIE}=${percent.toFixed(1)}; path=/; max-age=31536000; samesite=lax`;
}

function LoadedFrame({ defaultSidebarSize }: { defaultSidebarSize: number }) {
    const runtime = useRuntime();
    const { stores } = runtime;
    const status = useStoreValue(stores.connection, (state) => state.status);
    const sidebarView = useStoreValue(stores.workspace, (state) => state.sidebarView);
    const session = useStoreValue(stores.session, (state) => state.session);
    const latestSeq = useStoreValue(stores.history, (state) => state.checkpoints.at(-1)?.seq ?? null);
    const { view, embed, openFile } = useViewerView();
    const sidebarRef = useRef<PanelImperativeHandle>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [quickOpen, setQuickOpen] = useState(false);
    const [seenSeq, setSeenSeq] = useState<number | null>(null);

    useUrlSync();
    useFollow();

    useEffect(() => {
        if (session) document.title = `${displayTitle(session)} · biga`;
    }, [session]);

    const timelineOnScreen = sidebarView === "timeline" && !collapsed;
    useEffect(() => {
        if (latestSeq !== null && (seenSeq === null || timelineOnScreen || drawerOpen)) setSeenSeq(latestSeq);
    }, [latestSeq, seenSeq, timelineOnScreen, drawerOpen]);
    const unseenTimeline = latestSeq !== null && seenSeq !== null && latestSeq > seenSeq;

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") {
                event.preventDefault();
                setQuickOpen(true);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const toggleSidebar = useCallback(() => {
        const panel = sidebarRef.current;
        if (panel?.isCollapsed()) panel.expand();
        else panel?.collapse();
    }, []);

    const changeView = useCallback(
        (next: SidebarView) => {
            if (next === sidebarView && !collapsed) {
                sidebarRef.current?.collapse();
                return;
            }
            stores.workspace.getState().setSidebarView(next);
            sidebarRef.current?.expand();
        },
        [sidebarView, collapsed, stores]
    );

    const noteActivity = useCallback(() => runtime.noteActivity(), [runtime]);

    return (
        <div className="flex h-svh flex-col">
            <a
                href="#viewer-main"
                className="focus:bg-background focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:ring-2"
            >
                Skip to code
            </a>
            <ViewerHeader
                status={status}
                embed={embed}
                checkpointSeq={view.type === "checkpoint" ? view.seq : undefined}
                sidebarCollapsed={collapsed}
                onToggleSidebar={toggleSidebar}
                onOpenDrawer={() => setDrawerOpen(true)}
                onOpenQuickOpen={() => setQuickOpen(true)}
            />
            <SessionNotice status={status} embed={embed} onReconnect={runtime.reconnect} />
            <div className="flex min-h-0 flex-1">
                <div className="hidden md:flex">
                    <ActivityBar view={sidebarView} sidebarOpen={!collapsed} unseenTimeline={unseenTimeline} onChange={changeView} />
                </div>
                <ResizablePanelGroup
                    onLayoutChanged={(layout) => {
                        const size = layout.sidebar ?? 0;
                        setCollapsed(size === 0);
                        rememberSidebarSize(size);
                    }}
                    className="min-h-0 flex-1"
                >
                    <ResizablePanel
                        panelRef={sidebarRef}
                        id="sidebar"
                        defaultSize={`${defaultSidebarSize}%`}
                        minSize={`${SIDEBAR_MIN_PERCENT}%`}
                        maxSize={`${SIDEBAR_MAX_PERCENT}%`}
                        collapsible
                        collapsedSize={0}
                        className="bg-sidebar text-sidebar-foreground min-w-0 max-md:hidden"
                    >
                        <aside aria-label={sidebarView === "explorer" ? "Files" : "Timeline"} className="h-full">
                            <SidebarBody onOpenQuickOpen={() => setQuickOpen(true)} />
                        </aside>
                    </ResizablePanel>
                    <ResizableHandle className="max-md:hidden" />
                    <ResizablePanel id="main" minSize="40%">
                        <main
                            id="viewer-main"
                            tabIndex={-1}
                            className="h-full outline-none"
                            onPointerDown={noteActivity}
                            onKeyDown={noteActivity}
                            onWheel={noteActivity}
                        >
                            <EditorPane onOpenQuickOpen={() => setQuickOpen(true)} />
                        </main>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent side="left" className="bg-sidebar text-sidebar-foreground w-[88vw] max-w-sm gap-0 p-0 md:hidden">
                    <SheetTitle className="sr-only">Browse session</SheetTitle>
                    <SheetDescription className="sr-only">Switch between the session&apos;s files and its timeline of checkpoints.</SheetDescription>
                    <div className="flex h-13 shrink-0 items-center gap-1 border-b pe-12 ps-2.5">
                        {(["explorer", "timeline"] as const).map((item) => (
                            <button
                                key={item}
                                type="button"
                                aria-pressed={sidebarView === item}
                                onClick={() => stores.workspace.getState().setSidebarView(item)}
                                className="hover:bg-sidebar-accent aria-pressed:bg-sidebar-accent flex-1 rounded-md px-2 py-1.5 text-[13px]"
                            >
                                {item === "explorer" ? "Files" : "Timeline"}
                            </button>
                        ))}
                    </div>
                    <div className="min-h-0 flex-1">
                        <SidebarBody comfortable onOpenQuickOpen={() => setQuickOpen(true)} onPicked={() => setDrawerOpen(false)} />
                    </div>
                </SheetContent>
            </Sheet>
            <LazyQuickOpen
                open={quickOpen}
                onOpenChange={setQuickOpen}
                onOpenFile={(path) => {
                    setQuickOpen(false);
                    setDrawerOpen(false);
                    openFile(path);
                }}
            />
            <p role="status" className="sr-only">
                {ANNOUNCEMENTS[status] ?? ""}
            </p>
            <Toaster />
        </div>
    );
}

export function ViewerFrame({ defaultSidebarSize }: { defaultSidebarSize: number }) {
    const runtime = useRuntime();
    const session = useStoreValue(runtime.stores.session, (state) => state.session);
    const unavailable = useStoreValue(runtime.stores.connection, (state) => state.unavailable);
    const { embed } = useViewerView();

    if (unavailable && !session) {
        return <SessionUnavailable sessionId={runtime.sessionId} error={{ kind: unavailable }} embed={embed} onRetry={runtime.retry} />;
    }
    if (!session) return <FrameSkeleton />;
    return <LoadedFrame defaultSidebarSize={defaultSidebarSize} />;
}
