"use client";

import dynamic from "next/dynamic";

import { useMountOnOpen } from "@/hooks/use-mount-on-open";

import { useViewerUi } from "./ui-state";

const ShortcutsDialog = dynamic(() => import("./shortcuts-dialog").then((module) => module.ShortcutsDialog), { ssr: false });

export function LazyShortcutsDialog() {
    const open = useViewerUi((state) => state.shortcutsOpen);
    const mounted = useMountOnOpen(open);
    return mounted ? <ShortcutsDialog /> : null;
}
