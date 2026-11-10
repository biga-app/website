"use client";

import { searchPaths } from "@biga/viewer-core/runtime/file-search";
import { useDeferredValue, useMemo, useState } from "react";

import { FileTypeIcon } from "@/components/file-icon";
import { CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { baseName } from "@biga/types";

import { useRuntime } from "../runtime/runtime-provider";

export function QuickOpen({ open, onOpenChange, onOpenFile }: { open: boolean; onOpenChange: (open: boolean) => void; onOpenFile: (path: string) => void }) {
    const { tree } = useRuntime().stores;
    const [query, setQuery] = useState("");
    const [chosen, setChosen] = useState("");
    const deferred = useDeferredValue(query);
    const results = useMemo(
        () => (open ? searchPaths(tree.getState().reader.filePaths(), deferred) : []),
        [open, deferred, tree]
    );

    const highlighted = results.includes(chosen) ? chosen : (results[0] ?? "");

    return (
        <CommandDialog
            open={open}
            onOpenChange={(next) => {
                if (!next) setQuery("");
                onOpenChange(next);
            }}
            title="Go to file"
            description="Search the shared files by name."
            commandProps={{ shouldFilter: false, value: highlighted, onValueChange: setChosen }}
        >
            <CommandInput placeholder="Go to file…" value={query} onValueChange={setQuery} />
            <CommandList>
                <CommandEmpty>No matching files.</CommandEmpty>
                {results.map((path) => (
                    <CommandItem
                        key={path}
                        value={path}
                        onSelect={() => {
                            setQuery("");
                            onOpenFile(path);
                        }}
                        className="gap-2.5 py-2"
                    >
                        <FileTypeIcon kind="file" name={baseName(path)} className="size-4" />
                        <span className="truncate">{baseName(path)}</span>
                        <span className="text-muted-foreground ms-2 truncate text-xs">{path.slice(0, path.length - baseName(path).length).replace(/\/$/, "")}</span>
                    </CommandItem>
                ))}
            </CommandList>
        </CommandDialog>
    );
}
