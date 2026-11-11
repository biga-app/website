import { useEffect } from "react";

import type { EditorHost } from "./use-change-highlight";

const TARGET_MS = 3_000;

export function useLineTarget(host: EditorHost | null, path: string, line: number | null | undefined) {
  useEffect(() => {
    if (!host || !line) return;
    const total = host.editor.getModel()?.getLineCount() ?? 0;
    if (total === 0) return;
    const target = Math.min(line, total);
    host.editor.setPosition({ lineNumber: target, column: 1 });
    host.editor.revealLineInCenter(target);
    const collection = host.editor.createDecorationsCollection([
      {
        range: new host.monaco.Range(target, 1, target, 1),
        options: { isWholeLine: true, className: "biga-line-target" },
      },
    ]);
    const timer = setTimeout(() => collection.clear(), TARGET_MS);
    return () => {
      clearTimeout(timer);
      collection.clear();
    };
  }, [host, path, line]);
}
