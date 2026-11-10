"use client";

import type { StreamStatus } from "@biga/types/stream";
import { useViewerPrefsStore } from "@biga/stores/viewer-prefs-store";
import { LinkIcon, LocateFixedIcon, SearchIcon } from "lucide-react";

import { CopyGlyph } from "@/components/copy-glyph";
import { Button } from "@/components/ui/button";
import { Kbd, useModKey } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopyFeedback } from "@/components/viewer/copy-button";
import { formatDateTime, formatRelativeTime } from "@/lib/change-meta";
import { shareUrlFor } from "@/lib/session-title";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

import { useRuntime } from "../runtime/runtime-provider";
import { STATUS_DOT, STATUS_LABELS } from "./status-meta";

/** Connection state plus the one fact that makes it useful: how fresh the files are. */
export function LiveStatusView({
    status,
    latestAt,
    endedAt,
}: {
    status: StreamStatus;
    latestAt: string | null;
    endedAt: string | null;
}) {
    const now = useNow();

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

export function FollowToggle() {
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

export function CopyLinkButton({ sessionId, checkpointSeq }: { sessionId: string; checkpointSeq?: number }) {
    const { copied, copy } = useCopyFeedback();
    const { shareKey } = useRuntime();

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => void copy(shareUrlFor(sessionId, checkpointSeq, shareKey))}
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
export function GoToFileTrigger({ onClick }: { onClick: () => void }) {
    const mod = useModKey();
    return (
        <button
            type="button"
            onClick={onClick}
            className="border-input bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 hidden h-7 w-52 items-center gap-2 rounded-md border px-2 text-xs transition-colors outline-none focus-visible:ring-[3px] lg:flex xl:w-64"
        >
            <SearchIcon className="size-3.5" />
            Go to file…
            <span className="ms-auto flex gap-0.5">
                <Kbd>{mod}</Kbd>
                <Kbd>P</Kbd>
            </span>
        </button>
    );
}
