import { shikiToMonaco } from "@shikijs/monaco";
import type * as Monaco from "monaco-editor";
import type { BundledLanguage, BundledTheme } from "shiki";

import { getHighlighter } from "@/lib/shiki";

type Api = typeof Monaco;
type EditorApi = { setTheme: Api["editor"]["setTheme"]; create: Api["editor"]["create"] };

const PLAIN_TEXT = "plaintext";
const registered = new Set<string>();
let originals: EditorApi | null = null;
let queue: Promise<void> = Promise.resolve();

async function load(language: string, theme: string) {
    const highlighter = await getHighlighter();
    await highlighter.loadTheme(theme as BundledTheme);
    if (language !== PLAIN_TEXT) await highlighter.loadLanguage(language as BundledLanguage);
    return highlighter;
}

function wire(monaco: Api, highlighter: Awaited<ReturnType<typeof getHighlighter>>): void {
    const editor = monaco.editor as unknown as EditorApi;
    originals ??= { setTheme: editor.setTheme, create: editor.create };
    editor.setTheme = originals.setTheme;
    editor.create = originals.create;
    shikiToMonaco(highlighter, monaco);
    const shikiSetTheme = editor.setTheme;
    const shikiThemes = new Set(highlighter.getLoadedThemes());
    const builtIn = originals.setTheme;
    editor.setTheme = (name) => (shikiThemes.has(name) ? shikiSetTheme(name) : builtIn(name));
}

export function enableShiki(monaco: Api, language: string, theme: string): Promise<void> {
    const task = queue.then(async () => {
        const highlighter = await load(language, theme);
        if (language !== PLAIN_TEXT && !registered.has(language)) {
            monaco.languages.register({ id: language });
            registered.add(language);
        }
        wire(monaco, highlighter);
        monaco.editor.setTheme(theme);
    });
    queue = task.catch(() => undefined);
    return task;
}
