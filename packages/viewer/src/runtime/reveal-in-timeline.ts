import { toast } from "sonner";

import type { SessionRuntime } from "./runtime";

export async function revealInTimeline(
    runtime: SessionRuntime,
    openCheckpoint: (seq: number, file: string) => void,
    path: string
): Promise<void> {
    try {
        const [latest] = await runtime.api.getFileHistory(runtime.sessionId, path);
        if (!latest) return;
        await runtime.loadCheckpoint(latest.seq);
        openCheckpoint(latest.seq, path);
        runtime.stores.workspace.getState().setSidebarView("timeline");
    } catch {
        toast.error("Unable to find this file's changes", { description: "Check your connection and try again." });
    }
}
