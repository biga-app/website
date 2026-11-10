"use client";

import { RotateCwIcon, SearchXIcon, TimerIcon, WifiOffIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";

import { JoinForm } from "@/components/landing/join-form";
import { BigaMark } from "@/components/site/biga-mark";
import { Button } from "@/components/ui/button";
import type { ApiErrorKind } from "@biga/types/api";

const SERVER_COPY = {
    icon: TriangleAlertIcon,
    title: "Unable to load this session",
    body: "The server ran into a problem loading it. This is usually temporary, so try again in a moment.",
} as const;

const COPY = {
    not_found: {
        icon: SearchXIcon,
        title: "Session not found",
        body: "Check the link for typos. Sessions are deleted some time after they end, so an old link may no longer work.",
    },
    rate_limited: {
        icon: TimerIcon,
        title: "Too many requests",
        body: "This session is getting a lot of traffic. Wait a few seconds, then try again.",
    },
    network: {
        icon: WifiOffIcon,
        title: "Unable to reach biga",
        body: "Check your internet connection, then try again.",
    },
    server: SERVER_COPY,
    invalid: SERVER_COPY,
} as const;

/**
 * Replaces the whole viewer when there is nothing to show. A missing session
 * gets a way to open another one instead of a retry button that cannot help;
 * transient failures get the retry.
 */
export function SessionUnavailable({
    sessionId,
    error,
    embed,
    onRetry,
}: {
    sessionId: string;
    error: { kind: ApiErrorKind };
    embed: boolean;
    onRetry: () => void;
}) {
    const copy = COPY[error.kind];
    const Icon = copy.icon;
    const linkTarget = embed ? "_top" : undefined;

    return (
        <div className="flex min-h-svh flex-col">
            <header className="flex h-12 shrink-0 items-center border-b px-3">
                <Link
                    href="/"
                    target={linkTarget}
                    className="hover:bg-accent focus-visible:ring-ring/50 flex items-center gap-2 rounded-md px-2 py-1 transition-colors outline-none focus-visible:ring-[3px]"
                >
                    <BigaMark cell={2} className="text-foreground" />
                    <span className="text-sm font-semibold tracking-tight">biga</span>
                </Link>
            </header>

            <main className="flex flex-1 items-start justify-center px-4 py-16 sm:items-center sm:py-10">
                <div className="w-full max-w-md">
                    <span
                        aria-hidden
                        className={
                            error.kind === "not_found"
                                ? "bg-muted/60 text-muted-foreground grid size-11 place-items-center rounded-xl border"
                                : "border-destructive/25 bg-destructive/8 text-destructive grid size-11 place-items-center rounded-xl border"
                        }
                    >
                        <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <h1 className="mt-5 text-xl font-semibold tracking-[-0.02em]">{copy.title}</h1>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
                        {copy.body}
                    </p>
                    <p className="text-muted-foreground mt-3 text-xs">
                        Session ID <span className="text-foreground font-mono">{sessionId}</span>
                    </p>

                    {error.kind === "not_found" ? (
                        <>
                            <div className="mt-8 border-t pt-6">
                                <h2 className="mb-3 text-sm font-medium">Open another session</h2>
                                <JoinForm tone="default" />
                            </div>
                            <div className="mt-6 flex flex-wrap gap-2">
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/docs#getting-started" target={linkTarget}>
                                        Start your own session
                                    </Link>
                                </Button>
                                <Button asChild variant="ghost" size="sm">
                                    <Link href="/" target={linkTarget}>
                                        Go to the homepage
                                    </Link>
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="mt-6 flex flex-wrap gap-2">
                            <Button size="sm" onClick={onRetry}>
                                <RotateCwIcon />
                                Try again
                            </Button>
                            <Button asChild variant="ghost" size="sm">
                                <Link href="/" target={linkTarget}>
                                    Go to the homepage
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
