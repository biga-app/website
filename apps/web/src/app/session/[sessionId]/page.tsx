import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { preflightSession } from "@/features/viewer/server/preflight";
import { SIDEBAR_COOKIE, parseSidebarSize } from "@/features/viewer/shell/sidebar-size";
import { ViewerFrame } from "@/features/viewer/shell/viewer-frame";

type Params = { params: Promise<{ sessionId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { sessionId } = await params;
    const preflight = await preflightSession(sessionId);
    return {
        title: preflight.status === "found" ? preflight.title : `Session ${sessionId}`,
        robots: { index: false, follow: false },
    };
}

export default async function ViewerPage({ params }: Params) {
    const { sessionId } = await params;
    const preflight = await preflightSession(sessionId);
    if (preflight.status === "missing") notFound();
    const jar = await cookies();
    return <ViewerFrame defaultSidebarSize={parseSidebarSize(jar.get(SIDEBAR_COOKIE)?.value)} />;
}
