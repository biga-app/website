"use client";

import { clientLazy } from "@biga/viewer/client-lazy";

import { useMountOnOpen } from "@biga/ui/hooks/use-mount-on-open";

import { useViewerUi } from "../shell/ui-state";

const CommandPalette = clientLazy(() => import("./command-palette").then((module) => module.CommandPalette));

export function LazyCommandPalette() {
    const open = useViewerUi((state) => state.palette.open);
    const mounted = useMountOnOpen(open);
    return mounted ? <CommandPalette /> : null;
}
