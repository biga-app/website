"use client";

import type { StreamStatus } from "@biga/types/stream";
import { LocateFixedIcon, LockIcon, PanelBottomIcon, TextWrapIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/change-meta";
import { languageNameForPath } from "@/lib/language-names";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

import { useBoundCommand, useCommandContext } from "../commands/command-provider";
import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { STATUS_DOT, STATUS_LABELS } from "./status-meta";
import { useViewerUi } from "./ui-state";

function Item({ className, ...props }: ComponentProps<typeof Button>) {
    return (
        <Button
            variant="ghost"
            size="xs"
            className={cn("h-full shrink-0 gap-1.5 rounded-none px-2 text-[11px] font-normal shadow-none", className)}
            {...props}
        />
    );
}

function CommandItem({ id, label, className, children }: { id: string; label?: string; className?: string; children: React.ReactNode }) {
    const bound = useBoundCommand(id);
    return (
        <Item
            onClick={bound.run}
            disabled={!bound.enabled}
            aria-pressed={bound.checked}
            aria-label={label}
            title={bound.shortcut ? `${bound.title} (${bound.shortcut})` : bound.title}
            className={className}
        >
            {children}
        </Item>
    );
}

export function StatusBar({ status }: { status: StreamStatus }) {
    const runtime = useRuntime();
    const { state, actions } = useCommandContext();
    const now = useNow();
    const latest = useStoreValue(runtime.stores.history, (current) => current.checkpoints.at(-1));
    const cursor = useViewerUi((current) => current.cursor);
    const file = state.focused === 1 ? state.splitFile : state.activeFile;
    const fileView = state.view.type === "file" && file !== null;

    return (
        <footer className="bg-sidebar text-muted-foreground flex h-6 shrink-0 items-stretch border-t text-[11px]" aria-label="Status">
            <CommandItem id="go.overview">
                <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
                <span>{STATUS_LABELS[status]}</span>
                {latest ? <span className="hidden tabular-nums sm:inline">· {formatRelativeTime(latest.createdAt, now)}</span> : null}
            </CommandItem>
            {latest ? (
                <Item onClick={() => actions.setSidebarView("timeline")} title="Show the timeline" className="hidden tabular-nums sm:flex">
                    #{latest.seq}
                </Item>
            ) : null}
            <CommandItem id="view.follow" className={cn(state.follow && "text-biga")}>
                <LocateFixedIcon className="size-3" aria-hidden />
                <span className="hidden sm:inline">{state.follow ? "Following" : "Follow off"}</span>
            </CommandItem>
            <span className="ms-auto flex items-stretch">
                {fileView && cursor ? (
                    <Item onClick={() => actions.openPalette("line")} title="Go to line" className="tabular-nums">
                        Ln {cursor.line}, Col {cursor.column}
                    </Item>
                ) : null}
                {fileView ? (
                    <span className="hidden items-center px-2 sm:flex">{languageNameForPath(file)}</span>
                ) : null}
                <CommandItem id="view.wordWrap" className={cn(state.wordWrap && "text-foreground")}>
                    <TextWrapIcon className="size-3" aria-hidden />
                    <span className="hidden sm:inline">Wrap</span>
                </CommandItem>
                <Badge variant="outline" className="my-auto me-1 hidden h-4 gap-1 px-1.5 text-[10px] font-normal sm:inline-flex">
                    <LockIcon aria-hidden />
                    Read-only
                </Badge>
                <CommandItem id="view.togglePanel" label="Toggle panel" className={cn(state.panelOpen && "text-foreground")}>
                    <PanelBottomIcon className="size-3" aria-hidden />
                    
                </CommandItem>
            </span>
        </footer>
    );
}
