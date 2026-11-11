"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { parseShareKey, type ShareKey } from "@biga/viewer-core/crypto/content-crypto";
import { viewerParsers } from "@biga/viewer-core/location/search-params";
import { useQueryState } from "nuqs";
import { createSessionRuntime, type SessionRuntime } from "@biga/viewer/runtime/runtime";
import { RuntimeProvider } from "@biga/viewer/runtime/runtime-provider";
import { apiUrl } from "@/lib/api-url";

export function SessionRuntimeProvider({
    sessionId,
    fallback,
    children,
}: {
    sessionId: string;
    fallback: ReactNode;
    children: ReactNode;
}) {
    const [runtime, setRuntime] = useState<SessionRuntime | null>(null);
    const [checkpoint] = useQueryState("checkpoint", viewerParsers.checkpoint);
    const initialSeq = useRef(checkpoint ?? undefined);
    const keys = useRef(new Map<string, ShareKey | null>());

    useEffect(() => {
        // The key is read from the link once, as the page opens: the address bar
        // may lose its fragment later, and the server never sees it.
        if (!keys.current.has(sessionId)) keys.current.set(sessionId, parseShareKey(window.location.hash));
        const created = createSessionRuntime({ baseUrl: apiUrl(""), sessionId, initialCheckpointSeq: initialSeq.current, key: keys.current.get(sessionId) });
        const onVisibility = () => created.setHidden(document.hidden);
        const onOnline = () => created.notifyOnline();
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("online", onOnline);
        created.start();
        setRuntime(created);
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("online", onOnline);
            created.stop();
            setRuntime(null);
        };
    }, [sessionId]);

    if (!runtime) return <>{fallback}</>;
    return <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>;
}

