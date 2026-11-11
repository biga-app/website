"use client";

import { DiffEditor, Editor, useMonaco } from "@monaco-editor/react";
import "./monaco/monaco-loader";
import { PlainTextNotice } from "./monaco/plain-text-notice";
import { enableShiki } from "./monaco/shiki-monaco";
import { type EditorHost, useChangeHighlight } from "./monaco/use-change-highlight";
import { useEditorBridge, type EditorCursor, type EditorMenuAction } from "./monaco/use-editor-bridge";
import { useLineTarget } from "./monaco/use-line-target";
import { useDocumentTier } from "./monaco/use-document-tier";
import { useThemeStore } from "@biga/stores/theme-store";
import type * as Monaco from "monaco-editor";
import { useTheme } from "next-themes";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { resolveEditorTheme } from "@/lib/shiki";

export const MONACO_OPTIONS = {
  readOnly: true,
  domReadOnly: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  fontSize: 13,
  fontFamily: "var(--font-geist-mono), monospace",
  smoothScrolling: true,
  renderWhitespace: "selection",
  scrollbar: { alwaysConsumeMouseWheel: false },
  padding: { top: 12, bottom: 12 },
} as const;

/**
 * Monaco's built-in themes, shown until Shiki's grammars and themes have
 * loaded. They are not Shiki theme ids, so they must never reach Shiki.
 */
const FALLBACK_LIGHT_THEME = "vs";
const FALLBACK_DARK_THEME = "vs-dark";

/**
 * Monaco measures glyph widths once, when the editor is created. On a cold load
 * the monospace web font (`--font-geist-mono`) usually has not arrived yet, so
 * Monaco caches metrics for the fallback font — or zero-width metrics — and
 * paints an empty view. The text only appeared after the first interaction,
 * because that forced a re-render with the (by then loaded) real font. Waiting
 * on `document.fonts.ready` and calling `remeasureFonts()` fixes it at the
 * source: re-measure the moment the real font is available, then relayout.
 */
function remeasureOnFontLoad(
  editor: { layout: () => void },
  monaco: typeof Monaco,
) {
  const apply = () => {
    monaco.editor.remeasureFonts();
    editor.layout();
  };
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  if (!fonts || fonts.status === "loaded") {
    apply();
    return;
  }
  void fonts.ready.then(apply);
}

function isMonacoCancelation(reason: unknown): boolean {
  return (
    reason !== null &&
    typeof reason === "object" &&
    (reason as Record<string, unknown>).type === "cancelation"
  );
}

/** Subscribe a monaco instance to Shiki highlighting for one language and theme; ready once the theme exists. */
export function useShikiMonaco(language: string, theme: string) {
  const monaco = useMonaco();
  const [readyTheme, setReadyTheme] = useState<string | null>(null);

  // Monaco's language-service workers reject with a plain {type:'cancelation'}
  // object (not an Error) when operations are preempted. React 19 intercepts
  // unhandledrejection in the bubble phase; we use capture to run first and
  // stop propagation so the dev overlay never sees these rejections.
  useEffect(() => {
    const suppress = (event: PromiseRejectionEvent) => {
      if (isMonacoCancelation(event.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("unhandledrejection", suppress, { capture: true });
    return () => window.removeEventListener("unhandledrejection", suppress, { capture: true });
  }, []);

  useEffect(() => {
    if (!monaco) {
      return;
    }
    let cancelled = false;
    enableShiki(monaco, language, theme)
      .then(() => {
        if (!cancelled) {
          setReadyTheme(theme);
        }
      })
      .catch((err: unknown) => {
        if (!isMonacoCancelation(err)) console.error(err);
      });
    return () => {
      cancelled = true;
    };
  }, [monaco, language, theme]);

  return { monaco, ready: readyTheme === theme };
}

/** Current Shiki theme id, plus a built-in fallback used until Shiki is ready. */
export function useEditorTheme() {
  const editorTheme = useThemeStore((state) => state.editorTheme);
  const { resolvedTheme } = useTheme();
  const shikiTheme = resolveEditorTheme(editorTheme, resolvedTheme);
  const fallback = resolvedTheme === "dark" ? FALLBACK_DARK_THEME : FALLBACK_LIGHT_THEME;
  return { shikiTheme, fallback };
}

export function MonacoViewer({
  path,
  value,
  wordWrap = "off",
  line,
  actions,
  onCursor,
  onFocus,
}: {
  path: string;
  value: string;
  wordWrap?: "on" | "off";
  line?: number | null;
  actions?: readonly EditorMenuAction[];
  onCursor?: (cursor: EditorCursor | null) => void;
  onFocus?: () => void;
}) {
  const { shikiTheme, fallback } = useEditorTheme();
  const tier = useDocumentTier(path, value);
  const { ready } = useShikiMonaco(tier.language, shikiTheme);
  const theme = ready ? shikiTheme : fallback;
  const [host, setHost] = useState<EditorHost | null>(null);
  useChangeHighlight(host, path, value, tier.changeHighlight);
  useLineTarget(host, path, line);
  useEditorBridge(host, actions, onCursor, onFocus);

  return (
    <div className="flex h-full flex-col">
      {tier.plain && <PlainTextNotice onEnable={tier.enableHighlighting} />}
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          path={path}
          keepCurrentModel
          language={tier.language}
          value={value}
          theme={theme}
          loading={<Skeleton className="size-full rounded-none" />}
          options={{ ...MONACO_OPTIONS, ...tier.options, ariaLabel: `${path}, read-only`, wordWrap }}
          onMount={(editor, monacoInstance) => {
            setHost({ editor, monaco: monacoInstance });
            remeasureOnFontLoad(editor, monacoInstance);
          }}
        />
      </div>
    </div>
  );
}

export function MonacoDiffViewer({
  path,
  original,
  modified,
  sideBySide = true,
  wordWrap = "off",
}: {
  path: string;
  original: string;
  modified: string;
  sideBySide?: boolean;
  wordWrap?: "on" | "off";
}) {
  const { shikiTheme, fallback } = useEditorTheme();
  const tier = useDocumentTier(path, modified);
  const { ready } = useShikiMonaco(tier.language, shikiTheme);
  const theme = ready ? shikiTheme : fallback;
  const editorRef = useRef<Monaco.editor.IStandaloneDiffEditor | null>(null);

  // Monaco 0.55 throws "TextModel got disposed before DiffEditorWidget model
  // got reset" when @monaco-editor/react's passive-effect cleanup disposes
  // models while the DiffEditorWidget still holds references. Layout-effect
  // cleanups run before passive-effect cleanups, so we can null out the model
  // while the editor is still in a valid state.
  useLayoutEffect(() => {
    return () => {
      editorRef.current?.setModel(null);
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      {tier.plain && <PlainTextNotice onEnable={tier.enableHighlighting} />}
      <div className="min-h-0 flex-1">
        <DiffEditor
          height="100%"
          language={tier.language}
          original={original}
          modified={modified}
          theme={theme}
          loading={<Skeleton className="size-full rounded-none" />}
          options={{
            ...MONACO_OPTIONS,
            ...tier.options,
            ariaLabel: `${path}, read-only`,
            originalAriaLabel: `${path}, before`,
            modifiedAriaLabel: `${path}, after`,
            renderSideBySide: sideBySide,
            originalEditable: false,
            wordWrap,
          }}
          onMount={(editor, monacoInstance) => {
            editorRef.current = editor;
            remeasureOnFontLoad(editor, monacoInstance);
          }}
        />
      </div>
    </div>
  );
}
