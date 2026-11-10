"use client";

import type { StreamStatus } from "@biga/types";
import { InfoIcon, RotateCwIcon, WifiOffIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/viewer/icon-action";

/**
 * One slim line under the header for the two states that change how the
 * files should be read: the broadcast ended (they're final), or the
 * connection is gone (they may be stale). Reconnecting attempts stay in the
 * header status; they usually resolve before anyone needs to act.
 */
export function SessionNotice({
    status,
    embed,
    onReconnect,
}: {
    status: StreamStatus;
    embed: boolean;
    onReconnect: () => void;
}) {
    const [dismissedEnded, setDismissedEnded] = useState(false);

    if (status === "offline") {
        return (
            <div
                role="alert"
                className="border-destructive/20 bg-destructive/6 flex min-h-9 shrink-0 items-center gap-2.5 border-b px-3 py-1.5 text-xs"
            >
                <WifiOffIcon className="text-destructive size-3.5 shrink-0" aria-hidden />
                <p className="min-w-0 flex-1">
                    <span className="font-medium">Lost connection to the broadcast.</span>{" "}
                    <span className="text-muted-foreground">The files may be out of date.</span>
                </p>
                <Button variant="outline" size="xs" className="h-6" onClick={onReconnect}>
                    <RotateCwIcon />
                    Reconnect
                </Button>
            </div>
        );
    }

    if (status === "ended" && !embed && !dismissedEnded) {
        return (
            <div className="bg-muted/40 flex min-h-9 shrink-0 items-center gap-2.5 border-b px-3 py-1 text-xs">
                <InfoIcon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                <p className="min-w-0 flex-1">
                    <span className="font-medium">This broadcast has ended.</span>{" "}
                    <span className="text-muted-foreground">You&apos;re viewing the final state of its files.</span>
                </p>
                <Link
                    href="/docs#getting-started"
                    className="text-foreground hover:text-biga focus-visible:ring-ring/50 hidden shrink-0 rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 sm:inline"
                >
                    Start your own session
                </Link>
                <IconAction label="Dismiss" className="size-6" onClick={() => setDismissedEnded(true)}>
                    <XIcon />
                </IconAction>
            </div>
        );
    }

    return null;
}
