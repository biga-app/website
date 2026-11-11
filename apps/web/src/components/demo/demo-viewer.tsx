"use client";

import { ViewerPrefsProvider } from "@biga/viewer/prefs";
import { useCommandContext } from "@biga/viewer/commands/command-provider";
import { MemoryNavigationProvider } from "@biga/viewer/runtime/memory-navigation";
import { RuntimeProvider } from "@biga/viewer/runtime/runtime-provider";
import { FrameSkeleton } from "@biga/viewer/shell/frame-skeleton";
import { ViewerFrame } from "@biga/viewer/shell/viewer-frame";
import { useEffect, type ReactNode } from "react";

import { AppViewerHost } from "@/viewer-host/host-provider";

import { useDemo } from "./demo-provider";

function ControllerBridge() {
    const { publishActions } = useDemo();
    const { actions } = useCommandContext();
    useEffect(() => {
        publishActions(actions);
    });
    useEffect(() => () => publishActions(null), [publishActions]);
    return null;
}

export function DemoViewer({ surface = "inline", children }: { surface?: "page" | "inline"; children?: ReactNode }) {
    const { runtime, prefs } = useDemo();
    if (!runtime) return <FrameSkeleton inline={surface === "inline"} />;
    return (
        <AppViewerHost surface={surface}>
            <ViewerPrefsProvider store={prefs}>
                <RuntimeProvider runtime={runtime}>
                    <MemoryNavigationProvider>
                        <ViewerFrame>
                            <ControllerBridge />
                            {children}
                        </ViewerFrame>
                    </MemoryNavigationProvider>
                </RuntimeProvider>
            </ViewerPrefsProvider>
        </AppViewerHost>
    );
}
