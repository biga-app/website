"use client";

import type { StreamStatus } from "@biga/types/stream";
import { PanelLeftIcon } from "lucide-react";
import Link from "next/link";

import { CopyLinkButton, FollowToggle, GoToFileTrigger, LiveStatusView } from "./header-parts";
import { BigaMark } from "@/components/site/biga-mark";
import { ThemePicker } from "@/components/theme-picker";
import { IconAction } from "@/components/viewer/icon-action";
import { displayTitle } from "@/lib/session-title";

import { useRuntime, useStoreValue } from "../runtime/runtime-provider";

export function ViewerHeader({
    status,
    embed,
    checkpointSeq,
    sidebarCollapsed,
    onToggleSidebar,
    onOpenDrawer,
    onOpenQuickOpen,
}: {
    status: StreamStatus;
    embed: boolean;
    checkpointSeq?: number;
    sidebarCollapsed: boolean;
    onToggleSidebar: () => void;
    onOpenDrawer: () => void;
    onOpenQuickOpen: () => void;
}) {
    const runtime = useRuntime();
    const session = useStoreValue(runtime.stores.session, (state) => state.session);
    const latestAt = useStoreValue(runtime.stores.history, (state) => state.checkpoints.at(-1)?.createdAt ?? null);
    const title = session ? displayTitle(session) : "biga session";
    const description = session?.description ?? null;
    const canFollow = status === "live" || status === "reconnecting";

    return (
        <header className="flex h-12 shrink-0 items-center gap-1.5 border-b px-2 sm:gap-2 sm:px-3">
            <IconAction label="Browse files and timeline" size="icon-sm" className="md:hidden" onClick={onOpenDrawer}>
                <PanelLeftIcon className="size-4" />
            </IconAction>
            <IconAction
                label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                size="icon-sm"
                className="max-md:hidden"
                onClick={onToggleSidebar}
            >
                <PanelLeftIcon className="size-4" />
            </IconAction>
            <Link
                href="/"
                target={embed ? "_top" : undefined}
                aria-label="biga home"
                className="hover:bg-accent focus-visible:ring-ring/50 hidden size-8 shrink-0 place-items-center rounded-md transition-colors outline-none focus-visible:ring-[3px] sm:grid"
            >
                <BigaMark cell={2} className="text-foreground" />
            </Link>
            <span aria-hidden className="bg-border hidden h-4 w-px shrink-0 sm:block" />
            <div className="flex min-w-0 flex-1 items-baseline gap-2 ps-0.5">
                <h1 className="truncate text-sm font-semibold tracking-[-0.01em]" title={title}>
                    {title}
                </h1>
                {description && (
                    <p className="text-muted-foreground hidden min-w-0 truncate text-xs xl:block" title={description}>
                        {description}
                    </p>
                )}
            </div>
            <LiveStatusView status={status} latestAt={latestAt} endedAt={session?.endedAt ?? null} />
            <span aria-hidden className="bg-border mx-1 hidden h-4 w-px shrink-0 sm:block" />
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                <GoToFileTrigger onClick={onOpenQuickOpen} />
                {canFollow && <FollowToggle />}
                <CopyLinkButton sessionId={runtime.sessionId} checkpointSeq={checkpointSeq} />
                <ThemePicker />
            </div>
        </header>
    );
}
