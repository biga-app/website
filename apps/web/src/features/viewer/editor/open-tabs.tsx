"use client";

import { baseName } from "@biga/types/file-identity";
import { LayoutDashboardIcon, XIcon } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { FileTypeIcon } from "@/components/file-icon";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { dirName } from "@/lib/change-meta";
import { cn } from "@/lib/utils";

const DRAG_TYPE = "application/x-biga-tab";

type OverviewTab = { active: boolean; onSelect: () => void };

type DropTarget = { path: string; after: boolean };

export function OpenTabs({
    tabs,
    activePath,
    label = "Open files",
    overview,
    onSelect,
    onClose,
    onMove,
    menu,
}: {
    tabs: readonly string[];
    activePath: string | null;
    label?: string;
    overview?: OverviewTab | null;
    onSelect: (path: string) => void;
    onClose: (path: string) => void;
    onMove?: (path: string, index: number) => void;
    menu?: (path: string) => ReactNode;
}) {
    const listRef = useRef<HTMLUListElement>(null);
    const refocusActive = useRef(false);
    const [dragging, setDragging] = useState<string | null>(null);
    const [drop, setDrop] = useState<DropTarget | null>(null);

    const duplicateNames = useMemo(() => {
        const counts = new Map<string, number>();
        for (const path of tabs) {
            const name = baseName(path);
            counts.set(name, (counts.get(name) ?? 0) + 1);
        }
        return counts;
    }, [tabs]);

    useEffect(() => {
        const active = listRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
        const viewport = listRef.current?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
        if (active && viewport) {
            const tab = active.getBoundingClientRect();
            const strip = viewport.getBoundingClientRect();
            if (tab.left < strip.left) {
                viewport.scrollLeft -= strip.left - tab.left;
            } else if (tab.right > strip.right) {
                viewport.scrollLeft += tab.right - strip.right;
            }
        }
        if (refocusActive.current) {
            refocusActive.current = false;
            active?.focus();
        }
    }, [activePath, tabs, overview?.active]);

    const close = (path: string, fromKeyboard: boolean) => {
        refocusActive.current = fromKeyboard;
        onClose(path);
    };

    const endDrag = () => {
        setDragging(null);
        setDrop(null);
    };

    const commitDrop = () => {
        if (dragging !== null && drop !== null && onMove) {
            const without = tabs.filter((tab) => tab !== dragging);
            const anchor = without.indexOf(drop.path);
            if (anchor !== -1) onMove(dragging, anchor + (drop.after ? 1 : 0));
        }
        endDrag();
    };

    const variantFor = (active: boolean) => (active ? "secondary" : "ghost");

    return (
        <ScrollArea className="min-w-0 flex-1">
            <ul ref={listRef} aria-label={label} className="flex h-10 w-max items-center gap-0.5 px-1.5">
                {overview ? (
                    <li className="flex items-center">
                        <Button
                            variant={variantFor(overview.active)}
                            size="xs"
                            aria-current={overview.active ? "page" : undefined}
                            onClick={overview.onSelect}
                            className="gap-1.5 px-2.5 font-normal shadow-none"
                        >
                            <LayoutDashboardIcon className="size-3.5" aria-hidden />
                            Overview
                        </Button>
                    </li>
                ) : null}
                {tabs.map((path) => {
                    const name = baseName(path);
                    const active = path === activePath;
                    const ambiguous = (duplicateNames.get(name) ?? 0) > 1;
                    const parent = ambiguous ? baseName(dirName(path)) : "";
                    const marker = drop?.path === path && dragging !== path ? (drop.after ? "after" : "before") : null;
                    const item = (
                        <li
                            data-active={active || undefined}
                            draggable={Boolean(onMove)}
                            onDragStart={(event) => {
                                event.dataTransfer.setData(DRAG_TYPE, path);
                                event.dataTransfer.effectAllowed = "move";
                                setDragging(path);
                            }}
                            onDragOver={(event) => {
                                if (dragging === null || dragging === path) return;
                                event.preventDefault();
                                const box = event.currentTarget.getBoundingClientRect();
                                const after = event.clientX > box.left + box.width / 2;
                                if (drop?.path !== path || drop.after !== after) setDrop({ path, after });
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                commitDrop();
                            }}
                            onDragEnd={endDrag}
                            className={cn(
                                "group/tab relative flex items-center",
                                dragging === path && "opacity-50",
                                marker === "before" && "before:bg-biga before:absolute before:inset-y-0.5 before:-start-px before:w-0.5 before:rounded-full",
                                marker === "after" && "after:bg-biga after:absolute after:inset-y-0.5 after:-end-px after:w-0.5 after:rounded-full"
                            )}
                        >
                            <Button
                                variant={variantFor(active)}
                                size="xs"
                                aria-current={active ? "page" : undefined}
                                title={path}
                                onClick={() => onSelect(path)}
                                onAuxClick={(event) => {
                                    if (event.button === 1) {
                                        event.preventDefault();
                                        close(path, false);
                                    }
                                }}
                                className="gap-1.5 rounded-e-none ps-2.5 pe-1 font-normal shadow-none"
                            >
                                <FileTypeIcon kind="file" name={name} className="size-3.5" />
                                {name}
                                {parent && <span className="text-muted-foreground text-[11px]">{parent}</span>}
                            </Button>
                            <Button
                                variant={variantFor(active)}
                                size="icon-xs"
                                aria-label={`Close ${name}`}
                                onClick={(event) => close(path, event.detail === 0)}
                                className={cn(
                                    "text-muted-foreground hover:text-foreground rounded-s-none shadow-none transition-opacity duration-150 focus-visible:opacity-100",
                                    "pointer-coarse:opacity-100",
                                    active ? "opacity-100" : "opacity-0 group-hover/tab:opacity-100"
                                )}
                            >
                                <XIcon className="size-3" />
                            </Button>
                        </li>
                    );
                    if (!menu) return <Fragment key={path}>{item}</Fragment>;
                    return (
                        <ContextMenu key={path}>
                            <ContextMenuTrigger render={item} />
                            <ContextMenuContent className="w-60">{menu(path)}</ContextMenuContent>
                        </ContextMenu>
                    );
                })}
            </ul>
            <ScrollBar orientation="horizontal" className="h-1.5" />
        </ScrollArea>
    );
}
