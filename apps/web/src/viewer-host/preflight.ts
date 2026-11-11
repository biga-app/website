import type { SessionPreflight } from "@biga/types/state";
import { decodeSession, PROTOBUF_TYPE, ROUTE_GET_SESSION_PATH, routePath } from "@biga/types/wire";
import { cache } from "react";

const TIMEOUT_MS = 1500;

function serverOrigin(): string | null {
    const configured = process.env.BIGA_SERVER_URL ?? process.env.NEXT_PUBLIC_BIGA_API_URL;
    if (configured) return configured.replace(/\/+$/, "");
    return process.env.NODE_ENV === "development" ? "http://localhost:8080" : null;
}

async function fetchTitle(origin: string, sessionId: string): Promise<SessionPreflight> {
    const response = await fetch(`${origin}${routePath(ROUTE_GET_SESSION_PATH, { id: sessionId })}`, {
        headers: { Accept: PROTOBUF_TYPE },
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status === 404) return { status: "missing" };
    if (!response.ok) return { status: "unknown" };
    const session = decodeSession(new Uint8Array(await response.arrayBuffer()));
    return { status: "found", title: session.title || `Session ${sessionId}` };
}

export const preflightSession = cache(async (sessionId: string): Promise<SessionPreflight> => {
    const origin = serverOrigin();
    if (!origin) return { status: "unknown" };
    try {
        return await fetchTitle(origin, sessionId);
    } catch {
        return { status: "unknown" };
    }
});
