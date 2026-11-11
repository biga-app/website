"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { CodeSkeleton } from "@/components/viewer/code-skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { useCommandContext } from "../commands/command-provider";
import { useViewerView } from "../runtime/navigation-context";
import { CheckpointDiff } from "./checkpoint-diff";
import { FileEditor } from "./file-editor";
import { GroupTabs } from "./group-tabs";

const SessionOverview = dynamic(() => import("../overview/session-overview").then((module) => module.SessionOverview), {
    ssr: false,
    loading: () => <CodeSkeleton />,
});

function OverviewGroup() {
    return (
        <div className="flex h-full min-w-0 flex-col">
            <div className="flex h-10 shrink-0 items-center border-b">
                <GroupTabs group={0} activePath={null} overviewActive />
            </div>
            <div className="min-h-0 flex-1">
                <SessionOverview />
            </div>
        </div>
    );
}

function FocusRegion({ group, split, label, children }: { group: 0 | 1; split: boolean; label: string; children: ReactNode }) {
    const { state, actions } = useCommandContext();
    const focused = split && state.focused === group;
    return (
        <div
            role="region"
            aria-label={label}
            onPointerDownCapture={() => actions.focusGroup(group)}
            className={cn("relative h-full min-w-0", focused && "after:bg-biga after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:z-10 after:h-0.5")}
        >
            {children}
        </div>
    );
}

export function EditorPane() {
    const { view, splitFile } = useViewerView();
    const compact = useIsMobile();

    if (view.type === "checkpoint") return <CheckpointDiff seq={view.seq} file={view.file} />;

    const primary = view.type === "file" ? <FileEditor path={view.path} group={0} /> : <OverviewGroup />;
    const split = splitFile !== null && !compact;

    return (
        <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel id="editor-group-0" minSize="25%">
                <FocusRegion group={0} split={split} label={split ? "First editor" : "Editor"}>
                    {primary}
                </FocusRegion>
            </ResizablePanel>
            {split ? (
                <>
                    <ResizableHandle />
                    <ResizablePanel id="editor-group-1" minSize="25%">
                        <FocusRegion group={1} split label="Second editor">
                            <FileEditor path={splitFile} group={1} />
                        </FocusRegion>
                    </ResizablePanel>
                </>
            ) : null}
        </ResizablePanelGroup>
    );
}
