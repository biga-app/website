"use client";

import dynamic from "next/dynamic";

import { useMountOnOpen } from "@/hooks/use-mount-on-open";

import { useViewerUi } from "../shell/ui-state";

const CommandPalette = dynamic(() => import("./command-palette").then((module) => module.CommandPalette), { ssr: false });

export function LazyCommandPalette() {
    const open = useViewerUi((state) => state.palette.open);
    const mounted = useMountOnOpen(open);
    return mounted ? <CommandPalette /> : null;
}
