"use client";

import type { StreamStatus } from "@biga/types/stream";
import { InfoIcon, RotateCwIcon, WifiOffIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/viewer/icon-action";

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
            <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
                <WifiOffIcon aria-hidden />
                <AlertTitle>Lost connection to the broadcast.</AlertTitle>
                <AlertDescription>The files may be out of date.</AlertDescription>
                <AlertAction>
                    <Button variant="outline" size="xs" onClick={onReconnect}>
                        <RotateCwIcon />
                        Reconnect
                    </Button>
                </AlertAction>
            </Alert>
        );
    }

    if (status === "ended" && !embed && !dismissedEnded) {
        return (
            <Alert className="rounded-none border-x-0 border-t-0">
                <InfoIcon aria-hidden />
                <AlertTitle>This broadcast has ended.</AlertTitle>
                <AlertDescription>You&apos;re viewing the final state of its files.</AlertDescription>
                <AlertAction className="flex items-center gap-1">
                    <Button variant="link" size="xs" nativeButton={false} render={<Link href="/docs#getting-started" prefetch={false} />} className="hidden sm:inline-flex">
                        Start your own session
                    </Button>
                    <IconAction label="Dismiss" onClick={() => setDismissedEnded(true)}>
                        <XIcon />
                    </IconAction>
                </AlertAction>
            </Alert>
        );
    }

    return null;
}
