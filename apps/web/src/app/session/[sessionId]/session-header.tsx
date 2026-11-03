"use client";

import { useHistoryStore } from "@biga/stores/history-store";
import { useSessionStore } from "@biga/stores/session-store";
import { useViewerPrefsStore } from "@biga/stores/viewer-prefs-store";
import { LinkIcon, LocateFixedIcon, PanelLeftIcon, SearchIcon } from "lucide-react";
import Link from "next/link";

import { BigaMark } from "@/components/site/biga-mark";
import { ThemePicker } from "@/components/theme-picker";
import { Button } from "@/components/ui/button";
import { Kbd, useModKey } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyGlyph } from "@/components/copy-glyph";
import { useCopyFeedback } from "@/components/viewer/copy-button";
import { IconAction } from "@/components/viewer/icon-action";
import { formatDateTime, formatRelativeTime } from "@/lib/change-meta";
import { displayTitle, shareUrlFor } from "@/lib/session-title";
import { useNow } from "@/lib/use-now";
import { STATUS_DOT, STATUS_LABELS, type StreamStatus } from "@/lib/use-session-stream";
import { cn } from "@/lib/utils";

/** Connection state plus the one fact that makes it useful: how fresh the files are. */
function LiveStatus({ status }: { status: StreamStatus }) {
    const now = useNow();
    const latestAt = useHistoryStore((state) => state.checkpoints[0]?.createdAt ?? null);
    const endedAt = useSessionStore((state) => state.session?.endedAt ?? null);

    let detail: string | null = null;
    let fullDetail: string | null = null;
    if (status === "live" && latestAt) {
        detail = `last save ${formatRelativeTime(latestAt, now)}`;
        fullDetail = `Last save ${formatDateTime(latestAt)}`;
    } else if (status === "ended" && (endedAt ?? latestAt)) {
        const at = (endedAt ?? latestAt)!;
        detail = formatRelativeTime(at, now);
        fullDetail = `Ended ${formatDateTime(at)}`;
    } else if (status === "reconnecting") {
        fullDetail = "The connection dropped. Retrying automatically.";
    }

    return (
        <span
            data-slot="live-status"
            className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs"
            title={fullDetail ?? undefined}
        >
            <span
                aria-hidden
                className={cn(
                    "relative size-2 shrink-0 rounded-full",
                    STATUS_DOT[status],
                    status === "live" && "biga-live-ring text-biga"
                )}
            />
            <span className={cn("max-sm:sr-only", status === "live" && "text-foreground font-medium")}>
                {STATUS_LABELS[status]}
                {status === "reconnecting" && "…"}
            </span>
            {detail && (
                <span className="hidden tabular-nums md:inline">
                    <span aria-hidden>· </span>
                    {detail}
                </span>
            )}
        </span>
    );
}

function FollowToggle() {
    const follow = useViewerPrefsStore((state) => state.follow);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="xs"
                    aria-pressed={follow}
                    onClick={() => useViewerPrefsStore.getState().setFollow(!follow)}
                    className={cn(
                        follow
                            ? "bg-biga/10 text-biga hover:bg-biga/15 hover:text-biga"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <LocateFixedIcon className="size-3.5" />
                    <span className="max-md:sr-only">Follow</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                {follow ? "Following: each saved file opens automatically" : "Open each file as it's saved"}
            </TooltipContent>
        </Tooltip>
    );
}

function CopyLinkButton({ sessionId, checkpointSeq }: { sessionId: string; checkpointSeq?: number }) {
    const { copied, copy } = useCopyFeedback();

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => void copy(shareUrlFor(sessionId, checkpointSeq))}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {copied ? <CopyGlyph copied /> : <LinkIcon className="size-3.5" />}
                        <span className="max-sm:sr-only">{copied ? "Copied" : checkpointSeq === undefined ? "Copy link" : "Copy checkpoint link"}</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{checkpointSeq === undefined ? "Copy the share link for this session" : "Copy the share link for this checkpoint"}</TooltipContent>
            </Tooltip>
            <span aria-live="polite" className="sr-only">
                {copied ? "Link copied" : ""}
            </span>
        </>
    );
}

/** Looks like a search field so ⌘P is discoverable; opens Go to file. */
function GoToFileTrigger({ onClick }: { onClick: () => void }) {
    const mod = useModKey();
    return (
        <button
            type="button"
            onClick={onClick}
            className="border-input bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 hidden h-7 w-52 items-center gap-2 rounded-md border px-2 text-xs transition-colors outline-none focus-visible:ring-[3px] lg:flex xl:w-64"
        >
            <SearchIcon className="size-3.5" />
            Go to file…
            <span className="ml-auto flex gap-0.5">
                <Kbd>{mod}</Kbd>
                <Kbd>P</Kbd>
            </span>
        </button>
    );
}

export function SessionHeader({
    sessionId,
    checkpointSeq,
    status,
    embed,
    isMobile,
    sidebarCollapsed,
    onToggleSidebar,
    onOpenQuickOpen,
}: {
    sessionId: string;
    checkpointSeq?: number;
    status: StreamStatus;
    embed: boolean;
    isMobile: boolean;
    sidebarCollapsed: boolean;
    onToggleSidebar: () => void;
    onOpenQuickOpen: () => void;
}) {
    const session = useSessionStore((state) => state.session);
    const title = session ? displayTitle(session) : "biga session";
    const description = session?.description ?? null;
    const canFollow = status === "live" || status === "reconnecting";

    return (
        <header className="flex h-12 shrink-0 items-center gap-1.5 border-b px-2 sm:gap-2 sm:px-3">
            <IconAction
                label={isMobile ? "Browse files and timeline" : sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                size="icon-sm"
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
            <div className="flex min-w-0 flex-1 items-baseline gap-2 pl-0.5">
                <h1 className="truncate text-sm font-semibold tracking-[-0.01em]" title={title}>
                    {title}
                </h1>
                {description && (
                    <p className="text-muted-foreground hidden min-w-0 truncate text-xs xl:block" title={description}>
                        {description}
                    </p>
                )}
            </div>
            <LiveStatus status={status} />
            <span aria-hidden className="bg-border mx-1 hidden h-4 w-px shrink-0 sm:block" />
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                <GoToFileTrigger onClick={onOpenQuickOpen} />
                {canFollow && <FollowToggle />}
                <CopyLinkButton sessionId={sessionId} checkpointSeq={checkpointSeq} />
                <ThemePicker />
            </div>
        </header>
    );
}
