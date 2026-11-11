"use client";

import {
    Menubar,
    MenubarContent,
    MenubarMenu,
    MenubarSeparator,
    MenubarSub,
    MenubarSubContent,
    MenubarSubTrigger,
    MenubarTrigger,
} from "@biga/ui/components/menubar";

import { CommandMenuItem } from "../commands/menu-items";

const TRIGGER = "h-7 rounded-md px-2 text-[13px] font-normal";

export function ViewerMenubar() {
    return (
        <Menubar aria-label="Viewer menu" className="h-8 gap-0 border-0 bg-transparent p-0">
            <MenubarMenu>
                <MenubarTrigger className={TRIGGER}>File</MenubarTrigger>
                <MenubarContent className="w-64">
                    <CommandMenuItem id="file.closeTab" kind="menubar" />
                    <CommandMenuItem id="file.closeOthers" kind="menubar" />
                    <CommandMenuItem id="file.closeToRight" kind="menubar" />
                    <CommandMenuItem id="file.closeAll" kind="menubar" />
                    <CommandMenuItem id="file.reopenClosed" kind="menubar" />
                    <MenubarSeparator />
                    <CommandMenuItem id="file.copyPath" kind="menubar" />
                    <CommandMenuItem id="file.copyContents" kind="menubar" />
                    <CommandMenuItem id="file.download" kind="menubar" />
                    <MenubarSeparator />
                    <CommandMenuItem id="file.copyLink" kind="menubar" />
                    <CommandMenuItem id="file.copySessionLink" kind="menubar" />
                </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
                <MenubarTrigger className={TRIGGER}>View</MenubarTrigger>
                <MenubarContent className="w-64">
                    <CommandMenuItem id="view.toggleSidebar" kind="menubar" />
                    <CommandMenuItem id="view.showFiles" kind="menubar" />
                    <CommandMenuItem id="view.showSearch" kind="menubar" />
                    <CommandMenuItem id="view.showTimeline" kind="menubar" />
                    <CommandMenuItem id="view.togglePanel" kind="menubar" />
                    <MenubarSeparator />
                    <CommandMenuItem id="view.splitRight" kind="menubar" />
                    <CommandMenuItem id="view.closeSplit" kind="menubar" />
                    <CommandMenuItem id="view.compare" kind="menubar" />
                    <MenubarSeparator />
                    <CommandMenuItem id="view.wordWrap" kind="menubar" />
                    <CommandMenuItem id="view.follow" kind="menubar" />
                    <MenubarSub>
                        <MenubarSubTrigger>Diff layout</MenubarSubTrigger>
                        <MenubarSubContent>
                            <CommandMenuItem id="view.diffSplit" kind="menubar" label="Side by side" />
                            <CommandMenuItem id="view.diffUnified" kind="menubar" label="Unified" />
                        </MenubarSubContent>
                    </MenubarSub>
                    <MenubarSub>
                        <MenubarSubTrigger>Layout</MenubarSubTrigger>
                        <MenubarSubContent>
                            <CommandMenuItem id="view.layoutDefault" kind="menubar" label="Default" />
                            <CommandMenuItem id="view.layoutReview" kind="menubar" label="Review" />
                            <CommandMenuItem id="view.layoutFocus" kind="menubar" label="Focus" />
                        </MenubarSubContent>
                    </MenubarSub>
                    <MenubarSeparator />
                    <CommandMenuItem id="view.collapseFolders" kind="menubar" />
                </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
                <MenubarTrigger className={TRIGGER}>Go</MenubarTrigger>
                <MenubarContent className="w-64">
                    <CommandMenuItem id="go.file" kind="menubar" />
                    <CommandMenuItem id="go.line" kind="menubar" />
                    <CommandMenuItem id="go.commands" kind="menubar" />
                    <MenubarSeparator />
                    <CommandMenuItem id="go.overview" kind="menubar" />
                    <CommandMenuItem id="go.live" kind="menubar" />
                    <MenubarSeparator />
                    <CommandMenuItem id="go.nextTab" kind="menubar" />
                    <CommandMenuItem id="go.previousTab" kind="menubar" />
                    <MenubarSeparator />
                    <CommandMenuItem id="go.revealInTimeline" kind="menubar" />
                    <CommandMenuItem id="go.revealInFiles" kind="menubar" />
                </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
                <MenubarTrigger className={TRIGGER}>Help</MenubarTrigger>
                <MenubarContent className="w-56">
                    <CommandMenuItem id="help.shortcuts" kind="menubar" />
                    <MenubarSeparator />
                    <CommandMenuItem id="help.docs" kind="menubar" />
                    <CommandMenuItem id="help.source" kind="menubar" />
                    <CommandMenuItem id="help.issue" kind="menubar" />
                </MenubarContent>
            </MenubarMenu>
        </Menubar>
    );
}
