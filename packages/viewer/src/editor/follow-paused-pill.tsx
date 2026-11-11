"use client";

import { Button } from "@biga/ui/components/button";

import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { useViewerView } from "../runtime/navigation-context";

export function FollowPausedPill() {
    const { workspace } = useRuntime().stores;
    const paused = useStoreValue(workspace, (state) => state.pausedFollow);
    const { openFile } = useViewerView();
    if (!paused) return null;

    const resume = () => {
        workspace.getState().resumeFollow();
        openFile(paused.target, { history: "replace" });
    };

    return (
        <Button variant="outline" size="xs" className="me-2 shrink-0" onClick={resume}>
            {paused.count === 1 ? "1 new change" : `${paused.count} new changes`} · Resume
        </Button>
    );
}
