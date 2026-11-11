import { changedLineRanges } from "@biga/viewer-core/document/line-diff";
import type * as Monaco from "monaco-editor";
import { useEffect, useRef } from "react";

const HIGHLIGHT_MS = 2_400;

export type EditorHost = {
  editor: Monaco.editor.IStandaloneCodeEditor;
  monaco: typeof Monaco;
};

export function useChangeHighlight(host: EditorHost | null, path: string, value: string, enabled: boolean) {
  const previous = useRef<{ path: string; value: string } | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = { path, value };
    if (!host || !enabled || !before || before.path !== path || before.value === value) return;
    const ranges = changedLineRanges(before.value, value);
    if (ranges.length === 0) return;
    const collection = host.editor.createDecorationsCollection(
      ranges.map(({ start, end }) => ({
        range: new host.monaco.Range(start, 1, end, 1),
        options: {
          isWholeLine: true,
          className: "biga-line-changed",
          linesDecorationsClassName: "biga-gutter-changed",
          overviewRuler: {
            color: { id: "editorOverviewRuler.modifiedForeground" },
            position: host.monaco.editor.OverviewRulerLane.Right,
          },
        },
      })),
    );
    const timer = setTimeout(() => collection.clear(), HIGHLIGHT_MS);
    return () => {
      clearTimeout(timer);
      collection.clear();
    };
  }, [host, path, value, enabled]);
}
