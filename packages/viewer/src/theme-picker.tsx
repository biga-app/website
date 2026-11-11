"use client";

import { useThemeStore } from "@biga/stores/theme-store";
import { PaletteIcon } from "lucide-react";
import { clientLazy } from "@biga/viewer/client-lazy";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@biga/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@biga/ui/components/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@biga/ui/components/popover";
import { EDITOR_THEMES } from "@biga/viewer/lib/shiki";
import type { ThemeMode } from "@biga/viewer/theme-picker-list";

const ThemePickerList = clientLazy(() => import("@biga/viewer/theme-picker-list").then((module) => module.ThemePickerList));

export function ThemePicker() {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { setTheme } = useTheme();
    const editorTheme = useThemeStore((state) => state.editorTheme);
    const setEditorTheme = useThemeStore((state) => state.setEditorTheme);

    useEffect(() => setMounted(true), []);

    const select = (id: string, mode: ThemeMode) => {
        setEditorTheme(id);
        setTheme(mode);
        setOpen(false);
    };

    const current = EDITOR_THEMES.find((theme) => theme.id === editorTheme);
    const label = !mounted
        ? "Editor theme"
        : editorTheme === "auto"
          ? "Editor theme: match system"
          : `Editor theme: ${current?.label ?? editorTheme}`;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger
                    render={
                        <PopoverTrigger
                            render={
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    aria-label={label}
                                />
                            }
                        />
                    }
                >
                    <PaletteIcon className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-60 p-0">
                <ThemePickerList editorTheme={editorTheme} onSelect={select} />
            </PopoverContent>
        </Popover>
    );
}
