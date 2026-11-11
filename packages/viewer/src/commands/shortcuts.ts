export type Shortcut = {
    code: string;
    mod?: boolean;
    shift?: boolean;
    alt?: boolean;
};

const EDITABLE = "input, textarea, select, [contenteditable='true'], .monaco-editor";

const CODE_LABELS: Record<string, string> = {
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Slash: "/",
    Comma: ",",
    Period: ".",
    Escape: "Esc",
};

export function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
    return (
        event.code === shortcut.code &&
        (event.metaKey || event.ctrlKey) === Boolean(shortcut.mod) &&
        event.shiftKey === Boolean(shortcut.shift) &&
        event.altKey === Boolean(shortcut.alt)
    );
}

export function isTypingTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(EDITABLE) !== null;
}

export function isPlainShortcut(shortcut: Shortcut): boolean {
    return !shortcut.mod && !shortcut.alt;
}

function keyLabel(code: string): string {
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Digit")) return code.slice(5);
    return CODE_LABELS[code] ?? code;
}

export function shortcutKeys(shortcut: Shortcut, mod: string): string[] {
    const keys: string[] = [];
    if (shortcut.mod) keys.push(mod);
    if (shortcut.alt) keys.push(mod === "⌘" ? "⌥" : "Alt");
    if (shortcut.shift && shortcut.code === "Slash") return [...keys, "?"];
    if (shortcut.shift) keys.push(mod === "⌘" ? "⇧" : "Shift");
    keys.push(keyLabel(shortcut.code));
    return keys;
}
