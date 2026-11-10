"use client";

import type { SidebarView } from "@biga/types";
import { FilesIcon, GitGraphIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ITEMS: { view: SidebarView; label: string; Icon: typeof FilesIcon }[] = [
    { view: "explorer", label: "Files", Icon: FilesIcon },
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
    return (
        <nav aria-label="Views" className="bg-sidebar flex w-11 shrink-0 flex-col items-center gap-1 border-r py-1.5">
            {ITEMS.map(({ view: itemView, label, Icon }) => {
                const active = sidebarOpen && view === itemView;
                const badge = itemView === "timeline" && unseenTimeline && !active;
                return (
                    <Tooltip key={itemView}>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                aria-label={badge ? `${label}, new checkpoints` : label}
                                aria-pressed={active}
                                onClick={() => onChange(itemView)}
                                className={cn(
                                    "focus-visible:ring-ring/60 relative grid size-9 place-items-center rounded-md transition-colors duration-150 outline-none focus-visible:ring-2",
                                    active
                                        ? "text-foreground"
                                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                                )}
                            >
                                <span
                                    aria-hidden
                                    className={cn(
                                        "bg-foreground absolute top-1/2 -left-1 h-5 w-0.5 -translate-y-1/2 rounded-r transition-opacity duration-150",
                                        active ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <Icon className="size-[18px]" strokeWidth={1.75} />
                                {badge && (
                                    <span
                                        aria-hidden
                                        className="bg-biga ring-sidebar absolute top-1.5 right-1.5 size-2 rounded-full ring-2 motion-safe:animate-in motion-safe:zoom-in-50"
                                    />
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">{label}</TooltipContent>
                    </Tooltip>
                );
            })}
        </nav>
    );
}
