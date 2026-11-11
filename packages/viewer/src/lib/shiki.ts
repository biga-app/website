import { createHighlighter, bundledThemesInfo, type Highlighter } from "shiki";

export type ThemeKind = "light" | "dark";
export type ThemeOption = { id: string; label: string; kind: ThemeKind };

export const EDITOR_THEMES: ThemeOption[] = bundledThemesInfo.map((t) => ({
    id: t.id,
    label: t.displayName,
    kind: t.type,
}));

export const DEFAULT_LIGHT_THEME = "github-light";
export const DEFAULT_DARK_THEME = "github-dark";

let highlighterPromise: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
    highlighterPromise ??= createHighlighter({ themes: [], langs: [] });
    return highlighterPromise;
}

const KNOWN_THEMES = new Set(EDITOR_THEMES.map((theme) => theme.id));

/**
 * Resolve the active Shiki theme id, expanding "auto" via the app's mode. An id
 * that Shiki no longer ships (a stale value in localStorage) is treated as
 * "auto" rather than handed to Monaco, where it would throw.
 */
export function resolveEditorTheme(
    editorTheme: string,
    resolvedMode: string | undefined
): string {
    if (editorTheme !== "auto" && KNOWN_THEMES.has(editorTheme)) {
        return editorTheme;
    }
    return resolvedMode === "dark" ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
}
