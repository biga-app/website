"use client";

import { baseName } from "@biga/types";
import { XIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { FileTypeIcon } from "@/components/file-icon";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { dirName } from "@/lib/change-meta";
import { cn } from "@/lib/utils";

/**
 * Open files as a row of tabs. Each tab is a real button (with
 * `aria-current` on the active one) beside its own close button, middle-click
 * closes, and two files with the same name show their folder to tell them
 * apart.
 */
export function OpenTabs({
    tabs,
    activePath,
    onSelect,
    onClose,
}: {
    tabs: string[];
    activePath: string;
    onSelect: (path: string) => void;
    onClose: (path: string) => void;
}) {
    const listRef = useRef<HTMLUListElement>(null);
    const refocusActive = useRef(false);

    const duplicateNames = useMemo(() => {
        const counts = new Map<string, number>();
        for (const path of tabs) {
            const name = baseName(path);
            counts.set(name, (counts.get(name) ?? 0) + 1);
        }
        return counts;
    }, [tabs]);

    // Keep the active tab in view, and give focus back to it after a tab was
    // closed from the keyboard so focus never falls to the page.
    useEffect(() => {
        const active = listRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
        // Scroll the tab strip itself. `scrollIntoView` would also scroll every
        // ancestor, and the page with it when the viewer is embedded in one.
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
    }, [activePath, tabs]);

    const close = (path: string, fromKeyboard: boolean) => {
        refocusActive.current = fromKeyboard;
        onClose(path);
    };

    return (
        <ScrollArea className="min-w-0 flex-1">
            <ul ref={listRef} aria-label="Open files" className="flex h-10 w-max items-center gap-0.5 px-1.5">
                {tabs.map((path) => {
                    const name = baseName(path);
                    const active = path === activePath;
                    const ambiguous = (duplicateNames.get(name) ?? 0) > 1;
                    const parent = ambiguous ? baseName(dirName(path)) : "";
                    return (
                        <li
                            key={path}
                            data-active={active || undefined}
                            className={cn(
                                "group/tab flex h-7 items-center rounded-md transition-colors duration-150",
                                active
                                    ? "bg-accent text-foreground"
                                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                            )}
                        >
                            <button
                                type="button"
                                aria-current={active ? "page" : undefined}
                                title={path}
                                onClick={() => onSelect(path)}
                                onAuxClick={(event) => {
                                    if (event.button === 1) {
                                        event.preventDefault();
                                        close(path, false);
                                    }
                                }}
                                className="focus-visible:ring-ring/60 flex h-full items-center gap-1.5 rounded-md pr-1 pl-2.5 text-xs whitespace-nowrap outline-none focus-visible:ring-2"
                            >
                                <FileTypeIcon kind="file" name={name} className="size-3.5" />
                                {name}
                                {parent && <span className="text-muted-foreground text-[11px]">{parent}</span>}
                            </button>
                            <button
                                type="button"
                                aria-label={`Close ${name}`}
                                onClick={(event) => close(path, event.detail === 0)}
                                className={cn(
                                    "text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-ring/60 mr-1 grid size-5 place-items-center rounded transition-[opacity,background-color] duration-150 outline-none focus-visible:opacity-100 focus-visible:ring-2",
                                    "pointer-coarse:opacity-100",
                                    active ? "opacity-100" : "opacity-0 group-hover/tab:opacity-100"
                                )}
                            >
                                <XIcon className="size-3" />
                            </button>
                        </li>
                    );
                })}
            </ul>
            <ScrollBar orientation="horizontal" className="h-1.5" />
        </ScrollArea>
    );
}
