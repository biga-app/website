"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd, useModKey } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";

import { COMMANDS } from "../commands/definitions";
import { shortcutKeys } from "../commands/shortcuts";
import { useViewerUi, useViewerUiStore } from "./ui-state";

const GROUPS = ["File", "View", "Go", "Help"] as const;

export function ShortcutsDialog() {
    const ui = useViewerUiStore();
    const open = useViewerUi((state) => state.shortcutsOpen);
    const mod = useModKey();

    return (
        <Dialog open={open} onOpenChange={(next) => ui.getState().setShortcutsOpen(next)}>
            <DialogContent className="max-h-[80svh] gap-3 sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Keyboard shortcuts</DialogTitle>
                    <DialogDescription>Everything here is also in the menus and the command palette.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="-mx-1 max-h-[60svh] px-1">
                    <div className="flex flex-col gap-5 pb-1">
                        {GROUPS.map((group) => {
                            const rows = COMMANDS.filter((command) => command.group === group && command.shortcuts && command.shortcuts.length > 0);
                            if (rows.length === 0) return null;
                            return (
                                <section key={group} aria-labelledby={`shortcuts-${group}`}>
                                    <h3 id={`shortcuts-${group}`} className="text-muted-foreground mb-1 text-[11px] font-medium tracking-[0.06em] uppercase">
                                        {group}
                                    </h3>
                                    <ul className="divide-y">
                                        {rows.map((command) => (
                                            <li key={command.id} className="flex items-center justify-between gap-4 py-1.5 text-sm">
                                                <span>{command.title}</span>
                                                <span className="flex shrink-0 items-center gap-2">
                                                    {command.shortcuts?.map((shortcut, index) => (
                                                        <span key={index} className="flex items-center gap-0.5">
                                                            {shortcutKeys(shortcut, mod).map((key) => (
                                                                <Kbd key={key}>{key}</Kbd>
                                                            ))}
                                                        </span>
                                                    ))}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            );
                        })}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
