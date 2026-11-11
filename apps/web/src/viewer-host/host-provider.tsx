"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ViewerHostProvider } from "@biga/viewer/host";
import { JoinForm } from "@/components/landing/join-form";
import { CLI_REPO_URL, ISSUES_URL } from "@/components/site/links";

function ViewerLink(props: ComponentProps<"a"> & { href: string }) {
    return <Link prefetch={false} {...props} />;
}

export function AppViewerHost({ children, surface = "page" }: { children: ReactNode; surface?: "page" | "inline" }) {
    return <ViewerHostProvider value={{ Link: ViewerLink, surface, homeHref: "/", links: { docs: "/docs", source: CLI_REPO_URL, issues: ISSUES_URL }, renderJoin: () => <JoinForm /> }}>{children}</ViewerHostProvider>;
}
