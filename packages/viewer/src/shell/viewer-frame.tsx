"use client";

import { useViewerPrefsStore } from "@biga/viewer/prefs";
import type { SidebarView } from "@biga/types/stores";
import type { StreamStatus } from "@biga/types/stream";
import { clientLazy } from "@biga/viewer/client-lazy";
import { useEffect, useRef, useState } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";

import { useViewerHost } from "../host";
import { useSheetContainer, ViewerSurface } from "../surface";
import type { ReactNode } from "react";

import { SessionNotice } from "./session-notice";
import { SessionUnavailable } from "./session-unavailable";
import { ActivityBar } from "@biga/viewer/activity-bar";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@biga/ui/components/resizable";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@biga/ui/components/sheet";
import { Toaster } from "@biga/ui/components/sonner";
import { ToggleGroup, ToggleGroupItem } from "@biga/ui/components/toggle-group";
import { useIsMobile } from "@biga/ui/hooks/use-mobile";
import { displayTitle } from "@biga/viewer/lib/session-title";

import { CommandProvider, useCommandContext } from "../commands/command-provider";
import { EditorPane } from "../editor/editor-pane";
import { LazyCommandPalette } from "../palette/lazy-command-palette";
import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { useFollow } from "../runtime/use-follow";
import { useTabPersistence } from "../runtime/use-tab-persistence";
import { useUrlSync } from "../runtime/use-url-sync";
import { useViewerView } from "../runtime/navigation-context";
import { FrameSkeleton } from "./frame-skeleton";
import { LazyShortcutsDialog } from "./lazy-shortcuts-dialog";
import { SIDEBAR_COOKIE, SIDEBAR_MAX_PERCENT, SIDEBAR_MIN_PERCENT } from "./sidebar-size";
import { SidebarBody } from "./sidebar-body";
import { StatusBar } from "./status-bar";
import { useViewerUi, useViewerUiStore, ViewerUiProvider } from "./ui-state";
import { ViewerHeader } from "./viewer-header";

const BottomPanel = clientLazy(() => import("./bottom-panel").then((module) => module.BottomPanel));

const ANNOUNCEMENTS: Partial<Record<StreamStatus, string>> = {
    live: "Connected. Watching live.",
    reconnecting: "Connection lost. Reconnecting.",
    offline: "Disconnected from the broadcast. Files may be out of date.",
    ended: "This broadcast has ended.",
};

const DRAWER_VIEWS: { view: SidebarView; label: string }[] = [
    { view: "explorer", label: "Files" },
    { view: "search", label: "Search" },
    { view: "timeline", label: "Timeline" },
];

const SIDEBAR_LABELS: Record<SidebarView, string> = { explorer: "Files", search: "Search", timeline: "Timeline" };

function rememberSidebarSize(percent: number): void {
    if (percent <= 0) return;
    document.cookie = `${SIDEBAR_COOKIE}=${percent.toFixed(1)}; path=/; max-age=31536000; samesite=lax`;
}

function MainArea() {
    const panelOpen = useViewerPrefsStore((state) => state.panelOpen);
    const { embed } = useViewerView();
    const showPanel = panelOpen && !embed;

    return (
        <ResizablePanelGroup orientation="vertical">
            <ResizablePanel id="editor" minSize="30%">
                <EditorPane />
            </ResizablePanel>
            {showPanel ? (
                <>
                    <ResizableHandle className="h-px w-full after:inset-x-0 after:inset-y-auto after:top-1/2 after:h-2 after:w-full after:-translate-y-1/2 after:translate-x-0" />
                    <ResizablePanel id="panel" defaultSize="28%" minSize="12%" maxSize="60%">
                        <BottomPanel />
                    </ResizablePanel>
                </>
            ) : null}
        </ResizablePanelGroup>
    );
}

function LoadedFrame({ defaultSidebarSize, children }: { defaultSidebarSize: number; children?: ReactNode }) {
    const { surface } = useViewerHost();
    const runtime = useRuntime();
    const { stores } = runtime;
    const ui = useViewerUiStore();
    const { actions } = useCommandContext();
    const status = useStoreValue(stores.connection, (state) => state.status);
    const sidebarView = useStoreValue(stores.workspace, (state) => state.sidebarView);
    const session = useStoreValue(stores.session, (state) => state.session);
    const latestSeq = useStoreValue(stores.history, (state) => state.checkpoints.at(-1)?.seq ?? null);
    const { view, embed } = useViewerView();
    const sidebarRef = useRef<PanelImperativeHandle>(null);
    const collapsed = useViewerUi((state) => state.sidebarCollapsed);
    const drawerOpen = useViewerUi((state) => state.drawerOpen);
    const [seenSeq, setSeenSeq] = useState<number | null>(null);
    const compact = useIsMobile();
    const sheetContainer = useSheetContainer();

    useUrlSync();
    useFollow();
    useTabPersistence(surface === "page");

    useEffect(() => {
        if (session && surface === "page") document.title = `${displayTitle(session)} · biga`;
    }, [session, surface]);

    useEffect(() => {
        const panel = sidebarRef.current;
        if (!panel) return;
        if (collapsed && !panel.isCollapsed()) panel.collapse();
        if (!collapsed && panel.isCollapsed()) panel.expand();
    }, [collapsed]);

    const timelineOnScreen = sidebarView === "timeline" && !collapsed;
    useEffect(() => {
        if (latestSeq !== null && (seenSeq === null || timelineOnScreen || drawerOpen)) setSeenSeq(latestSeq);
    }, [latestSeq, seenSeq, timelineOnScreen, drawerOpen]);
    const unseenTimeline = latestSeq !== null && seenSeq !== null && latestSeq > seenSeq;

    const changeView = (next: SidebarView) => {
        if (next === sidebarView && !collapsed) {
            ui.getState().setSidebarCollapsed(true);
            return;
        }
        actions.setSidebarView(next);
    };

    const openPalette = () => actions.openPalette("files");

    const main = (
        <main
            id="viewer-main"
            tabIndex={-1}
            className="h-full outline-none"
            onPointerDown={() => runtime.noteActivity()}
            onKeyDown={() => runtime.noteActivity()}
            onWheel={() => runtime.noteActivity()}
        >
            <MainArea />
        </main>
    );

    return (
        <div className={surface === "inline" ? "flex h-full min-h-0 flex-col" : "flex h-svh flex-col"}>
            <a
                href="#viewer-main"
                className="focus:bg-background focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:ring-2"
            >
                Skip to code
            </a>
            <ViewerHeader status={status} embed={embed} checkpointSeq={view.type === "checkpoint" ? view.seq : undefined} />
            <SessionNotice status={status} embed={embed} onReconnect={runtime.reconnect} />
            <div className="flex min-h-0 flex-1">
                <div className="hidden md:flex">
                    <ActivityBar view={sidebarView} sidebarOpen={!collapsed} unseenTimeline={unseenTimeline} onChange={changeView} />
                </div>
                {compact ? (
                    <div className="min-w-0 flex-1">{main}</div>
                ) : (
                    <ResizablePanelGroup
                        onLayoutChanged={(layout) => {
                            const size = layout.sidebar ?? 0;
                            ui.getState().setSidebarCollapsed(size === 0);
                            if (surface === "page") rememberSidebarSize(size);
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
                            className="bg-sidebar text-sidebar-foreground min-w-0"
                        >
                            <aside aria-label={SIDEBAR_LABELS[sidebarView]} className="h-full">
                                <SidebarBody onOpenQuickOpen={openPalette} />
                            </aside>
                        </ResizablePanel>
                        <ResizableHandle />
                        <ResizablePanel id="main" minSize="40%">
                            {main}
                        </ResizablePanel>
                    </ResizablePanelGroup>
                )}
            </div>
            <StatusBar status={status} />
            <Sheet open={drawerOpen} onOpenChange={(open) => ui.getState().setDrawerOpen(open)}>
                <SheetContent side="left" container={sheetContainer} className="bg-sidebar text-sidebar-foreground w-[88%] max-w-sm gap-0 p-0 md:hidden">
                    <SheetTitle className="sr-only">Browse session</SheetTitle>
                    <SheetDescription className="sr-only">Switch between the session&apos;s files, search and timeline of checkpoints.</SheetDescription>
                    <div className="flex h-13 shrink-0 items-center border-b pe-12 ps-2.5">
                        <ToggleGroup
                            value={[sidebarView]}
                            onValueChange={([next]) => {
                                if (next === "explorer" || next === "search" || next === "timeline") stores.workspace.getState().setSidebarView(next);
                            }}
                            aria-label="Sidebar view"
                            className="h-9 w-full"
                        >
                            {DRAWER_VIEWS.map((item) => (
                                <ToggleGroupItem key={item.view} value={item.view} className="flex-1 text-[13px]">
                                    {item.label}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>
                    <div className="min-h-0 flex-1">
                        <SidebarBody comfortable onOpenQuickOpen={openPalette} onPicked={() => ui.getState().setDrawerOpen(false)} />
                    </div>
                </SheetContent>
            </Sheet>
            <LazyCommandPalette />
            <LazyShortcutsDialog />
            <p role="status" className="sr-only">
                {ANNOUNCEMENTS[status] ?? ""}
            </p>
            <Toaster />
            {children}
        </div>
    );
}

export function ViewerFrame({ defaultSidebarSize = 22, children }: { defaultSidebarSize?: number; children?: ReactNode }) {
    const { surface } = useViewerHost();
    const runtime = useRuntime();
    const session = useStoreValue(runtime.stores.session, (state) => state.session);
    const unavailable = useStoreValue(runtime.stores.connection, (state) => state.unavailable);
    const { embed } = useViewerView();

    if (unavailable && !session) {
        return <SessionUnavailable sessionId={runtime.sessionId} error={{ kind: unavailable }} embed={embed} onRetry={runtime.retry} />;
    }
    if (!session) return <FrameSkeleton inline={surface === "inline"} />;
    return (
        <ViewerSurface><ViewerUiProvider>
            <CommandProvider>
                <LoadedFrame defaultSidebarSize={defaultSidebarSize}>{children}</LoadedFrame>
            </CommandProvider>
        </ViewerUiProvider></ViewerSurface>
    );
}
