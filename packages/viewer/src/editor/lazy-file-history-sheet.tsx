"use client";

import { clientLazy } from "@biga/viewer/client-lazy";
import type { ComponentProps } from "react";

import { useMountOnOpen } from "@biga/ui/hooks/use-mount-on-open";

const FileHistorySheet = clientLazy(() => import("./file-history-sheet").then((module) => module.FileHistorySheet));

export function LazyFileHistorySheet(props: ComponentProps<typeof FileHistorySheet>) {
    const mounted = useMountOnOpen(props.open);
    return mounted ? <FileHistorySheet {...props} /> : null;
}
