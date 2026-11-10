"use client";

import { useParams } from "next/navigation";

import { SessionUnavailable } from "@/features/viewer/shell/session-unavailable";

export default function ViewerNotFound() {
    const { sessionId } = useParams<{ sessionId: string }>();
    return <SessionUnavailable sessionId={sessionId} error={{ kind: "not_found" }} embed={false} onRetry={() => undefined} />;
}
