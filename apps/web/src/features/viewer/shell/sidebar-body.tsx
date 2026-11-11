"use client";

import dynamic from "next/dynamic";
import { Activity } from "react";

import { useMountOnOpen } from "@/hooks/use-mount-on-open";

import { FileTree } from "../tree/file-tree";
import { Timeline } from "../timeline/timeline";
import { useRuntime, useStoreValue } from "../runtime/runtime-provider";

const SearchPanel = dynamic(() => import("../search/search-panel").then((module) => module.SearchPanel), { ssr: false });

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
    const searchMounted = useMountOnOpen(view === "search");
    return (
        <>
            <Activity mode={view === "explorer" ? "visible" : "hidden"}>
                <div className="h-full">
                    <FileTree comfortable={comfortable} onOpenQuickOpen={onOpenQuickOpen} onFileOpened={onPicked} />
                </div>
            </Activity>
            {searchMounted ? (
                <Activity mode={view === "search" ? "visible" : "hidden"}>
                    <div className="h-full">
                        <SearchPanel />
                    </div>
                </Activity>
            ) : null}
            <Activity mode={view === "timeline" ? "visible" : "hidden"}>
                <div className="h-full">
                    <Timeline onPicked={onPicked} />
                </div>
            </Activity>
        </>
    );
}
