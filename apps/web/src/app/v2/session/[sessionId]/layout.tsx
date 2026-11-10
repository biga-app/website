import { NuqsAdapter } from "nuqs/adapters/next/app";

import { SessionRuntimeProvider } from "@/features/viewer/runtime/runtime-provider";
import { FrameSkeleton } from "@/features/viewer/shell/frame-skeleton";

export default async function ViewerLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ sessionId: string }>;
}) {
    const { sessionId } = await params;
    return (
        <NuqsAdapter>
            <SessionRuntimeProvider sessionId={sessionId} fallback={<FrameSkeleton />}>
                {children}
            </SessionRuntimeProvider>
        </NuqsAdapter>
    );
}
