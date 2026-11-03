import type { Metadata } from "next";

import { SessionViewer } from "./session-viewer";

/**
 * Sessions are ephemeral and unguessable, so keep them out of search indexes:
 * indexing leaks nothing useful and pollutes results with dead session URLs.
 */
export async function generateMetadata({
    params,
}: {
    params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
    const { sessionId } = await params;
    return {
        title: `Session ${sessionId}`,
        robots: { index: false, follow: false },
    };
}

export default async function SessionPage({
    params,
    searchParams,
}: {
    params: Promise<{ sessionId: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { sessionId } = await params;
    const { embed, checkpoint } = await searchParams;
    const seq = typeof checkpoint === "string" && /^\d{1,10}$/.test(checkpoint) ? Number(checkpoint) : undefined;

    return (
        <SessionViewer
            sessionId={sessionId}
            embed={embed === "1"}
            initialCheckpointSeq={seq !== undefined && seq <= 2147483647 ? seq : undefined}
        />
    );
}
