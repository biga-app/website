"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import { useMountOnOpen } from "@/hooks/use-mount-on-open";

const FileHistorySheet = dynamic(() => import("./file-history-sheet").then((module) => module.FileHistorySheet), {
    ssr: false,
});

export function LazyFileHistorySheet(props: ComponentProps<typeof FileHistorySheet>) {
    const mounted = useMountOnOpen(props.open);
    return mounted ? <FileHistorySheet {...props} /> : null;
}
