"use client";

import { CheckIcon } from "lucide-react";

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { EDITOR_THEMES } from "@/lib/shiki";
import { cn } from "@/lib/utils";

export type ThemeMode = "light" | "dark" | "system";

const LIGHT_THEMES = EDITOR_THEMES.filter((theme) => theme.kind === "light");
const DARK_THEMES = EDITOR_THEMES.filter((theme) => theme.kind === "dark");

function ThemeItem({
    id,
    name,
    mode,
    selected,
    onSelect,
}: {
    id: string;
    name: string;
    mode: ThemeMode;
    selected: boolean;
    onSelect: (id: string, mode: ThemeMode) => void;
}) {
    return (
        <CommandItem value={`${name} ${id}`} onSelect={() => onSelect(id, mode)}>
            <CheckIcon className={cn("size-4", selected ? "opacity-100" : "opacity-0")} />
            {name}
        </CommandItem>
    );
}

export function ThemePickerList({
    editorTheme,
    onSelect,
}: {
    editorTheme: string;
    onSelect: (id: string, mode: ThemeMode) => void;
}) {
    const item = (id: string, name: string, mode: ThemeMode) => (
        <ThemeItem key={id} id={id} name={name} mode={mode} selected={editorTheme === id} onSelect={onSelect} />
    );

    return (
        <Command>
            <CommandInput placeholder="Search themes…" aria-label="Search editor themes" />
            <CommandList>
                <CommandEmpty>No themes match.</CommandEmpty>
                <CommandGroup heading="System">{item("auto", "Match system", "system")}</CommandGroup>
                <CommandGroup heading="Light">
                    {LIGHT_THEMES.map((theme) => item(theme.id, theme.label, "light"))}
                </CommandGroup>
                <CommandGroup heading="Dark">
                    {DARK_THEMES.map((theme) => item(theme.id, theme.label, "dark"))}
                </CommandGroup>
            </CommandList>
        </Command>
    );
}
