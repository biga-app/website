"use client";

import type { StreamStatus } from "@biga/types/stream";
import { PanelLeftIcon, SearchIcon } from "lucide-react";
import Link from "next/link";

import { BigaMark } from "@/components/site/biga-mark";
import { Button } from "@/components/ui/button";
import { ThemePicker } from "@/components/theme-picker";
import { Kbd, useModKey } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { IconAction } from "@/components/viewer/icon-action";
import { displayTitle } from "@/lib/session-title";

import { useCommandContext } from "../commands/command-provider";
import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { CopyLinkButton, FollowToggle, LiveStatusView } from "./header-parts";
import { ViewerMenubar } from "./viewer-menubar";

function CommandCenter({ title, description }: { title: string; description: string | null }) {
    const { actions } = useCommandContext();
    const mod = useModKey();

    return (
        <h1 className="min-w-0 flex-1 text-sm font-normal">
            <Button
                variant="outline"
                aria-haspopup="dialog"
                onClick={() => actions.openPalette("files")}
                className="text-muted-foreground mx-auto h-8 w-full max-w-xl min-w-0 justify-start gap-2 px-2.5 font-normal shadow-none"
            >
                <SearchIcon className="size-3.5 shrink-0" aria-hidden />
                <span className="text-foreground min-w-0 truncate font-medium" title={title}>
                    {title}
                </span>
                {description ? (
                    <span className="hidden min-w-0 truncate text-xs xl:inline" title={description}>
                        {description}
                    </span>
                ) : null}
                <span className="ms-auto hidden shrink-0 items-center gap-0.5 md:flex">
                    <Kbd>{mod}</Kbd>
                    <Kbd>P</Kbd>
                </span>
            </Button>
        </h1>
    );
}

export function ViewerHeader({
    status,
    embed,
    checkpointSeq,
}: {
    status: StreamStatus;
    embed: boolean;
    checkpointSeq?: number;
}) {
    const runtime = useRuntime();
    const mod = useModKey();
    const { state, actions } = useCommandContext();
    const session = useStoreValue(runtime.stores.session, (current) => current.session);
    const latestAt = useStoreValue(runtime.stores.history, (current) => current.checkpoints.at(-1)?.createdAt ?? null);
    const title = session ? displayTitle(session) : "biga session";
    const canFollow = status === "live" || status === "reconnecting";

    return (
        <header className="flex h-12 shrink-0 items-center gap-1.5 border-b px-2 sm:gap-2 sm:px-3">
            <IconAction label="Browse files and timeline" size="icon-sm" className="md:hidden" onClick={() => actions.toggleSidebar()}>
                <PanelLeftIcon className="size-4" />
            </IconAction>
            <IconAction
                label={state.sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                shortcut={[mod, "B"]}
                size="icon-sm"
                className="max-md:hidden"
                onClick={() => actions.toggleSidebar()}
            >
                <PanelLeftIcon className="size-4" />
            </IconAction>
            <Link
                href="/"
                prefetch={false}
                target={embed ? "_top" : undefined}
                aria-label="biga home"
                className="hover:bg-accent focus-visible:ring-ring/50 hidden size-8 shrink-0 place-items-center rounded-md transition-colors outline-none focus-visible:ring-[3px] sm:grid"
            >
                <BigaMark cell={2} className="text-foreground" />
            </Link>
            {embed ? null : (
                <div className="hidden md:block">
                    <ViewerMenubar />
                </div>
            )}
            <CommandCenter title={title} description={session?.description ?? null} />
            <LiveStatusView status={status} latestAt={latestAt} endedAt={session?.endedAt ?? null} />
            <Separator orientation="vertical" className="mx-1 hidden h-4 sm:block" />
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                {canFollow && <FollowToggle />}
                <CopyLinkButton sessionId={runtime.sessionId} checkpointSeq={checkpointSeq} />
                <ThemePicker />
            </div>
        </header>
    );
}
