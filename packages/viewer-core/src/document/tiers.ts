import type { DocumentMeasure, DocumentTier, TierFeatures } from "@biga/types/content";

const REDUCED_BYTES = 256 * 1024;
const PLAIN_BYTES = 2 * 1024 * 1024;
const REDUCED_LINES = 20_000;
const PLAIN_LINE_LENGTH = 20_000;
const CHANGE_HIGHLIGHT_MAX_LINES = 50_000;
const FULL_TOKENIZATION_LENGTH = 20_000;
const REDUCED_TOKENIZATION_LENGTH = 2_000;

export function classifyDocument(measure: DocumentMeasure): DocumentTier {
    if (measure.bytes > PLAIN_BYTES || measure.maxLineLength > PLAIN_LINE_LENGTH) return "plain";
    if (measure.bytes > REDUCED_BYTES || measure.lineCount > REDUCED_LINES) return "reduced";
    return "full";
}

export function featuresFor(tier: DocumentTier, measure: DocumentMeasure): TierFeatures {
    if (tier === "plain") {
        return {
            highlighting: false,
            folding: false,
            bracketColorization: false,
            occurrencesHighlight: false,
            links: false,
            stickyScroll: false,
            changeHighlight: false,
            maxTokenizationLineLength: 0,
        };
    }
    const reduced = tier === "reduced";
    return {
        highlighting: true,
        folding: !reduced,
        bracketColorization: !reduced,
        occurrencesHighlight: !reduced,
        links: !reduced,
        stickyScroll: !reduced,
        changeHighlight: !reduced || measure.lineCount <= CHANGE_HIGHLIGHT_MAX_LINES,
        maxTokenizationLineLength: reduced ? REDUCED_TOKENIZATION_LENGTH : FULL_TOKENIZATION_LENGTH,
    };
}
