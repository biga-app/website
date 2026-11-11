"use client";

import type { GroupIndex } from "@biga/types/viewer-location";

import { ContextMenuSeparator } from "@biga/ui/components/context-menu";

import { CommandMenuItem } from "../commands/menu-items";
import { useCommandContext } from "../commands/command-provider";
import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { OpenTabs } from "./open-tabs";

function TabMenu({ path, group }: { path: string; group: GroupIndex }) {
    const target = { path, group };
    return (
        <>
            <CommandMenuItem id="file.closeTab" kind="context" target={target} label="Close" />
            <CommandMenuItem id="file.closeOthers" kind="context" target={target} />
            <CommandMenuItem id="file.closeToRight" kind="context" target={target} />
            <CommandMenuItem id="file.closeAllInGroup" kind="context" target={target} label="Close All" />
            <ContextMenuSeparator />
            <CommandMenuItem id="go.moveTabLeft" kind="context" target={target} />
            <CommandMenuItem id="go.moveTabRight" kind="context" target={target} />
            <ContextMenuSeparator />
            <CommandMenuItem id="file.copyPath" kind="context" target={target} />
            <CommandMenuItem id="file.copyLink" kind="context" target={target} />
            <CommandMenuItem id="go.revealInFiles" kind="context" target={target} />
            {group === 0 ? <CommandMenuItem id="view.splitRight" kind="context" target={target} /> : null}
        </>
    );
}

export function GroupTabs({
    group,
    activePath,
    overviewActive = false,
}: {
    group: GroupIndex;
    activePath: string | null;
    overviewActive?: boolean;
}) {
    const { workspace } = useRuntime().stores;
    const { actions } = useCommandContext();
    const tabs = useStoreValue(workspace, (state) => state.groups[group]);

    return (
        <OpenTabs
            tabs={tabs}
            activePath={activePath}
            label={group === 0 ? "Open files" : "Open files in the second editor"}
            overview={group === 0 ? { active: overviewActive, onSelect: () => actions.showOverview() } : null}
            onSelect={(path) => actions.openFile(path, { group })}
            onClose={(path) => actions.closeTab(path, group)}
            onMove={(path, index) => workspace.getState().moveTab(path, index, group)}
            menu={(path) => <TabMenu path={path} group={group} />}
        />
    );
}
