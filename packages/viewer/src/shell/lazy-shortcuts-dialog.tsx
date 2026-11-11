"use client";

import { clientLazy } from "@biga/viewer/client-lazy";

import { useMountOnOpen } from "@biga/ui/hooks/use-mount-on-open";

import { useViewerUi } from "./ui-state";

const ShortcutsDialog = clientLazy(() => import("./shortcuts-dialog").then((module) => module.ShortcutsDialog));

export function LazyShortcutsDialog() {
    const open = useViewerUi((state) => state.shortcutsOpen);
    const mounted = useMountOnOpen(open);
    return mounted ? <ShortcutsDialog /> : null;
}
