import { measureContent } from "@biga/viewer-core/content/blob-store";
import { classifyDocument, featuresFor } from "@biga/viewer-core/document/tiers";
import { useCallback, useMemo, useState } from "react";

import { languageForPath } from "@biga/viewer/lib/languages";

import { tierEditorOptions } from "./tier-options";

const PLAIN_TEXT = "plaintext";

export function useDocumentTier(path: string, value: string) {
  const [enabledPath, setEnabledPath] = useState<string | null>(null);
  const measure = useMemo(() => {
    const { lineCount, maxLineLength } = measureContent(value);
    return { bytes: value.length, lineCount, maxLineLength };
  }, [value]);
  const tier = classifyDocument(measure);
  const plain = tier === "plain" && enabledPath !== path;
  const features = featuresFor(tier === "plain" && !plain ? "reduced" : tier, measure);
  const enableHighlighting = useCallback(() => setEnabledPath(path), [path]);

  return {
    plain,
    language: plain ? PLAIN_TEXT : languageForPath(path),
    options: tierEditorOptions(features),
    changeHighlight: features.changeHighlight,
    enableHighlighting,
  };
}
