"use client";

import { Activity } from "react";

import { FileTree } from "../tree/file-tree";
import { Timeline } from "../timeline/timeline";
import { useRuntime, useStoreValue } from "../runtime/runtime-provider";

export function SidebarBody({
    comfortable = false,
    onOpenQuickOpen,
    onPicked,
}: {
    comfortable?: boolean;
    onOpenQuickOpen: () => void;
    onPicked?: () => void;
}) {
    const view = useStoreValue(useRuntime().stores.workspace, (state) => state.sidebarView);
    return (
        <>
            <Activity mode={view === "explorer" ? "visible" : "hidden"}>
                <div className="h-full">
                    <FileTree comfortable={comfortable} onOpenQuickOpen={onOpenQuickOpen} onFileOpened={onPicked} />
                </div>
            </Activity>
            <Activity mode={view === "timeline" ? "visible" : "hidden"}>
                <div className="h-full">
                    <Timeline onPicked={onPicked} />
                </div>
            </Activity>
        </>
    );
}
