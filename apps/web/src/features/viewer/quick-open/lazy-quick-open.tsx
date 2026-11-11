"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import { useMountOnOpen } from "@/hooks/use-mount-on-open";

const QuickOpen = dynamic(() => import("./quick-open").then((module) => module.QuickOpen), { ssr: false });

export function LazyQuickOpen(props: ComponentProps<typeof QuickOpen>) {
    const mounted = useMountOnOpen(props.open);
    return mounted ? <QuickOpen {...props} /> : null;
}
