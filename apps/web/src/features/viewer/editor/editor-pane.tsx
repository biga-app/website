"use client";

import { FileCodeIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd, useModKey } from "@/components/ui/kbd";
import { EmptyState } from "@/components/viewer/empty-state";

import { useViewerView } from "../runtime/navigation-context";
import { CheckpointDiff } from "./checkpoint-diff";
import { FileEditor } from "./file-editor";

function NoFileOpen({ onOpenQuickOpen }: { onOpenQuickOpen: () => void }) {
    const mod = useModKey();
    return (
        <EmptyState icon={FileCodeIcon} title="No file open" description="Pick a file from the tree, or search for one by name.">
            <Button variant="outline" size="sm" onClick={onOpenQuickOpen}>
                Go to file
                <span className="ms-1 flex gap-0.5">
                    <Kbd>{mod}</Kbd>
                    <Kbd>P</Kbd>
                </span>
            </Button>
        </EmptyState>
    );
}

export function EditorPane({ onOpenQuickOpen }: { onOpenQuickOpen: () => void }) {
    const { view, activeFile } = useViewerView();
    if (view.type === "checkpoint") return <CheckpointDiff seq={view.seq} file={view.file} />;
    if (!activeFile) return <NoFileOpen onOpenQuickOpen={onOpenQuickOpen} />;
    return <FileEditor path={activeFile} />;
}
