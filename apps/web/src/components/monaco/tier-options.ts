import type { TierFeatures } from "@biga/types/content";

export function tierEditorOptions(features: TierFeatures) {
  return {
    folding: features.folding,
    bracketPairColorization: { enabled: features.bracketColorization },
    occurrencesHighlight: features.occurrencesHighlight ? "singleFile" : "off",
    links: features.links,
    stickyScroll: { enabled: features.stickyScroll },
  } as const;
}
