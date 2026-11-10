"use client";

import { Button } from "@/components/ui/button";

import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { useViewerView } from "../runtime/use-viewer-view";

export function FollowPausedPill() {
    const { workspace } = useRuntime().stores;
    const paused = useStoreValue(workspace, (state) => state.pausedFollow);
    const { openFile } = useViewerView();
    if (!paused) return null;

    const resume = () => {
        workspace.getState().resumeFollow();
        openFile(paused.target, "replace");
    };

    return (
        <Button variant="outline" size="xs" className="me-2 shrink-0" onClick={resume}>
            {paused.count === 1 ? "1 new change" : `${paused.count} new changes`} · Resume
        </Button>
    );
}
