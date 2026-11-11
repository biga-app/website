import { useEffect, useRef } from "react";

import type { EditorHost } from "./use-change-highlight";

export type EditorCursor = { line: number; column: number };

export type EditorMenuAction = {
  id: string;
  label: string;
  run: (line: number) => void;
};

export function useEditorBridge(
  host: EditorHost | null,
  actions: readonly EditorMenuAction[] | undefined,
  onCursor: ((cursor: EditorCursor | null) => void) | undefined,
  onFocus: (() => void) | undefined,
) {
  const latest = useRef({ actions, onCursor, onFocus });

  useEffect(() => {
    latest.current = { actions, onCursor, onFocus };
  });

  useEffect(() => {
    if (!host) return;
    const { editor } = host;
    const report = () => {
      const position = editor.getPosition();
      latest.current.onCursor?.(position ? { line: position.lineNumber, column: position.column } : null);
    };
    report();
    const subscriptions = [
      editor.onDidChangeCursorPosition(report),
      editor.onDidFocusEditorText(() => {
        latest.current.onFocus?.();
        report();
      }),
    ];
    return () => subscriptions.forEach((subscription) => subscription.dispose());
  }, [host]);

  useEffect(() => {
    if (!host || !actions) return;
    const disposables = actions.map((action, index) =>
      host.editor.addAction({
        id: `biga.${action.id}`,
        label: action.label,
        contextMenuGroupId: "biga",
        contextMenuOrder: index + 1,
        run: (editor) => action.run(editor.getPosition()?.lineNumber ?? 1),
      }),
    );
    return () => disposables.forEach((disposable) => disposable.dispose());
  }, [host, actions]);
}
