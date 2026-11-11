"use client";

import type { ComponentType, ReactNode } from "react";

import {
    ContextMenuCheckboxItem,
    ContextMenuItem,
    ContextMenuShortcut,
} from "@biga/ui/components/context-menu";
import {
    DropdownMenuCheckboxItem,
    DropdownMenuItem,
    DropdownMenuShortcut,
} from "@biga/ui/components/dropdown-menu";
import {
    MenubarCheckboxItem,
    MenubarItem,
    MenubarShortcut,
} from "@biga/ui/components/menubar";

import { useBoundCommand } from "./command-provider";
import type { CommandTarget } from "./types";

type ItemComponent = ComponentType<{ disabled?: boolean; onClick?: () => void; children?: ReactNode }>;
type CheckboxComponent = ComponentType<{ checked: boolean; disabled?: boolean; onCheckedChange?: () => void; children?: ReactNode }>;
type ShortcutComponent = ComponentType<{ children?: ReactNode }>;

type MenuSet = { Item: ItemComponent; Checkbox: CheckboxComponent; Shortcut: ShortcutComponent };

const SETS = {
    menubar: { Item: MenubarItem, Checkbox: MenubarCheckboxItem, Shortcut: MenubarShortcut },
    context: { Item: ContextMenuItem, Checkbox: ContextMenuCheckboxItem, Shortcut: ContextMenuShortcut },
    dropdown: { Item: DropdownMenuItem, Checkbox: DropdownMenuCheckboxItem, Shortcut: DropdownMenuShortcut },
} as const satisfies Record<string, MenuSet>;

export type MenuKind = keyof typeof SETS;

export function CommandMenuItem({
    id,
    kind,
    target,
    label,
    icon,
}: {
    id: string;
    kind: MenuKind;
    target?: CommandTarget;
    label?: string;
    icon?: ReactNode;
}) {
    const bound = useBoundCommand(id, target);
    const { Item, Checkbox, Shortcut } = SETS[kind];
    const content = (
        <>
            {icon}
            {label ?? bound.title}
            {bound.shortcut ? <Shortcut>{bound.shortcut}</Shortcut> : null}
        </>
    );
    if (bound.checked === undefined) {
        return (
            <Item disabled={!bound.enabled} onClick={bound.run}>
                {content}
            </Item>
        );
    }
    return (
        <Checkbox checked={bound.checked} disabled={!bound.enabled} onCheckedChange={bound.run}>
            {content}
        </Checkbox>
    );
}
