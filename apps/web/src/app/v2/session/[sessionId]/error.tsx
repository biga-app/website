"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

import { SessionUnavailable } from "@/app/session/[sessionId]/session-unavailable";

export default function ViewerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const { sessionId } = useParams<{ sessionId: string }>();

    useEffect(() => {
        console.error(error);
    }, [error]);

    return <SessionUnavailable sessionId={sessionId} error={{ kind: "server" }} embed={false} onRetry={reset} />;
}
