import { AppViewerHost } from "@/viewer-host/host-provider";

import { NuqsAdapter } from "nuqs/adapters/next/app";

import { SessionRuntimeProvider } from "@/viewer-host/session-runtime-provider";
import { UrlNavigationProvider } from "@/viewer-host/url-navigation";
import { FrameSkeleton } from "@biga/viewer/shell/frame-skeleton";

export default async function ViewerLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ sessionId: string }>;
}) {
    const { sessionId } = await params;
    return (
        <AppViewerHost><NuqsAdapter>
            <UrlNavigationProvider>
                <SessionRuntimeProvider sessionId={sessionId} fallback={<FrameSkeleton />}>
                    {children}
                </SessionRuntimeProvider>
            </UrlNavigationProvider>
        </NuqsAdapter></AppViewerHost>
    );
}
