"use client";

import { baseName } from "@biga/types/file-identity";
import { searchPaths } from "@biga/viewer-core/runtime/file-search";
import { useDeferredValue, useMemo, useState } from "react";

import { FileTypeIcon } from "@biga/viewer/file-icon";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from "@biga/ui/components/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@biga/ui/components/dialog";
import { Kbd } from "@biga/ui/components/kbd";

import { useCommandContext, useCommandList } from "../commands/command-provider";
import { COMMANDS } from "../commands/definitions";
import { useViewerView } from "../runtime/navigation-context";
import { useRuntime } from "../runtime/runtime-provider";
import { useViewerUi, useViewerUiStore, type PaletteMode } from "../shell/ui-state";

const PREFIX: Record<PaletteMode, string> = { files: "", commands: ">", line: ":" };

const COPY: Record<PaletteMode, { title: string; description: string; placeholder: string }> = {
    files: { title: "Go to file", description: "Search the shared files by name.", placeholder: "Go to file…" },
    commands: { title: "Command palette", description: "Search for a command to run.", placeholder: "Type a command…" },
    line: { title: "Go to line", description: "Type a line number to jump to in the open file.", placeholder: "Line number…" },
};

function modeOf(query: string): PaletteMode {
    if (query.startsWith(">")) return "commands";
    if (query.startsWith(":")) return "line";
    return "files";
}

function textOf(query: string): string {
    return modeOf(query) === "files" ? query : query.slice(1);
}

function matchesTitle(title: string, group: string, text: string): boolean {
    const haystack = `${group} ${title}`.toLowerCase();
    return text
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((word) => haystack.includes(word));
}

function folderOf(path: string): string {
    return path.slice(0, path.length - baseName(path).length).replace(/\/$/, "");
}

function PaletteBody({ initial, close }: { initial: PaletteMode; close: () => void }) {
    const { tree } = useRuntime().stores;
    const { actions } = useCommandContext();
    const { view } = useViewerView();
    const list = useCommandList();
    const [query, setQuery] = useState(PREFIX[initial]);
    const [chosen, setChosen] = useState("");
    const deferred = useDeferredValue(query);
    const mode = modeOf(query);
    const text = textOf(deferred);

    const files = useMemo(
        () => (modeOf(deferred) === "files" ? searchPaths(tree.getState().reader.filePaths(), deferred) : []),
        [deferred, tree]
    );
    const commands = useMemo(
        () =>
            list.filter(
                ({ command, bound }) =>
                    command.palette !== false && bound.enabled && matchesTitle(command.title, command.group, textOf(deferred))
            ),
        [list, deferred]
    );
    const line = Number.parseInt(text, 10);
    const lineValid = view.type === "file" && Number.isInteger(line) && line > 0;

    const ids = mode === "files" ? files : mode === "commands" ? commands.map(({ command }) => command.id) : lineValid ? ["line"] : [];
    const highlighted = ids.includes(chosen) ? chosen : (ids[0] ?? "");

    const openFile = (path: string) => {
        close();
        actions.openFile(path);
    };

    const runCommand = (id: string) => {
        const entry = commands.find(({ command }) => command.id === id);
        close();
        entry?.bound.run();
    };

    const goToLine = () => {
        if (view.type !== "file" || !lineValid) return;
        close();
        actions.openFile(view.path, { history: "replace", base: view.base, line, group: 0 });
    };

    const grouped = COMMANDS.map((command) => command.group).filter((group, index, all) => all.indexOf(group) === index);

    return (
        <Command
            shouldFilter={false}
            value={highlighted}
            onValueChange={setChosen}
            className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-input]]:h-12"
        >
            <CommandInput placeholder={COPY[mode].placeholder} aria-label={COPY[mode].title} value={query} onValueChange={setQuery} />
            <CommandList>
                {mode === "files" ? (
                    <>
                        <CommandEmpty>No matching files.</CommandEmpty>
                        {files.map((path) => (
                            <CommandItem key={path} value={path} onSelect={() => openFile(path)} className="gap-2.5 py-2">
                                <FileTypeIcon kind="file" name={baseName(path)} className="size-4" />
                                <span className="truncate">{baseName(path)}</span>
                                <span className="text-muted-foreground ms-2 truncate text-xs">{folderOf(path)}</span>
                            </CommandItem>
                        ))}
                    </>
                ) : null}
                {mode === "commands" ? (
                    <>
                        <CommandEmpty>No matching commands.</CommandEmpty>
                        {grouped.map((group) => {
                            const items = commands.filter(({ command }) => command.group === group);
                            if (items.length === 0) return null;
                            return (
                                <CommandGroup key={group} heading={group}>
                                    {items.map(({ command, bound }) => (
                                        <CommandItem key={command.id} value={command.id} onSelect={() => runCommand(command.id)}>
                                            <span className="truncate">{command.title}</span>
                                            {bound.checked ? <span className="text-muted-foreground text-xs">On</span> : null}
                                            {bound.shortcut ? <CommandShortcut>{bound.shortcut}</CommandShortcut> : null}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            );
                        })}
                    </>
                ) : null}
                {mode === "line" ? (
                    lineValid ? (
                        <CommandItem value="line" onSelect={goToLine}>
                            Go to line {line.toLocaleString()}
                        </CommandItem>
                    ) : (
                        <CommandEmpty>{view.type === "file" ? "Type a line number." : "Open a file to jump to a line."}</CommandEmpty>
                    )
                ) : null}
            </CommandList>
            <p className="text-muted-foreground flex flex-wrap items-center gap-1 border-t px-3 py-2 text-xs">
                {mode === "files" ? (
                    <>
                        Type <Kbd>&gt;</Kbd> for commands or <Kbd>:</Kbd> for a line number.
                    </>
                ) : (
                    <>Delete the leading character to search files again.</>
                )}
            </p>
        </Command>
    );
}

export function CommandPalette() {
    const ui = useViewerUiStore();
    const { open, mode } = useViewerUi((state) => state.palette);

    const close = () => {
        ui.getState().setPaletteOpen(false);
        ui.getState().setDrawerOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={(next) => ui.getState().setPaletteOpen(next)}>
            <DialogContent showCloseButton={false} className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
                <DialogHeader className="sr-only">
                    <DialogTitle>{COPY[mode].title}</DialogTitle>
                    <DialogDescription>{COPY[mode].description}</DialogDescription>
                </DialogHeader>
                <PaletteBody initial={mode} close={close} />
            </DialogContent>
        </Dialog>
    );
}
