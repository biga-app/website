"use client";

import type { SidebarView } from "@biga/types/stores";
import { FilesIcon, GitGraphIcon, SearchIcon, PanelLeftIcon } from "lucide-react";

import { useBoundCommand } from "./commands/command-provider";
import { IconAction } from "./viewer/icon-action";

import { Button } from "@biga/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@biga/ui/components/tooltip";
import { cn } from "@biga/ui/lib/utils";

const ITEMS: { view: SidebarView; label: string; Icon: typeof FilesIcon }[] = [
    { view: "explorer", label: "Files", Icon: FilesIcon },
    { view: "search", label: "Search", Icon: SearchIcon },
    { view: "timeline", label: "Timeline", Icon: GitGraphIcon },
];

/**
 * The view rail. Picking the open view again hides the sidebar, as in most
 * editors. A blue dot on Timeline means checkpoints landed since it was last
 * open.
 */
export function ActivityBar({
    view,
    sidebarOpen,
    unseenTimeline,
    onChange,
}: {
    view: SidebarView;
    sidebarOpen: boolean;
    unseenTimeline: boolean;
    onChange: (view: SidebarView) => void;
}) {
    const toggle = useBoundCommand("view.toggleSidebar");
    return (
        <nav aria-label="Views" className="bg-sidebar flex w-11 shrink-0 flex-col items-center gap-1 border-e py-1.5">
            {ITEMS.map(({ view: itemView, label, Icon }) => {
                const active = sidebarOpen && view === itemView;
                const badge = itemView === "timeline" && unseenTimeline && !active;
                return (
                    <Tooltip key={itemView}>
                        <TooltipTrigger
                            render={
                                <Button
                                    variant={active ? "secondary" : "ghost"}
                                    size="icon"
                                    aria-label={badge ? `${label}, new checkpoints` : label}
                                    aria-pressed={active}
                                    onClick={() => onChange(itemView)}
                                    className="relative size-9 shadow-none"
                                />
                            }
                        >
                                <span
                                    aria-hidden
                                    className={cn(
                                        "bg-foreground absolute top-1/2 -start-1 h-5 w-0.5 -translate-y-1/2 rounded-e transition-opacity duration-150",
                                        active ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <Icon className="size-[18px]" strokeWidth={1.75} />
                                {badge && (
                                    <span
                                        aria-hidden
                                        className="bg-biga ring-sidebar absolute top-1.5 end-1.5 size-2 rounded-full ring-2 motion-safe:animate-in motion-safe:zoom-in-50"
                                    />
                                )}
                            </TooltipTrigger>
                        <TooltipContent side="right">{label}</TooltipContent>
                    </Tooltip>
                );
            })}
            <IconAction label={sidebarOpen ? "Hide sidebar" : "Show sidebar"} shortcut={toggle.keys ?? undefined} onClick={toggle.run} variant="ghost" size="icon" className="mt-auto size-9" tooltipSide="right"><PanelLeftIcon className="size-[18px]" /></IconAction>
        </nav>
    );
}
