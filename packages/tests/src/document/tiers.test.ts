import assert from "node:assert/strict";
import test from "node:test";

import { classifyDocument, featuresFor } from "@biga/viewer-core/document/tiers";

const measure = (bytes: number, lineCount: number, maxLineLength = 80) => ({ bytes, lineCount, maxLineLength });

test("small ordinary files get every feature", () => {
    const m = measure(10_000, 300);
    assert.equal(classifyDocument(m), "full");
    const features = featuresFor("full", m);
    assert.equal(features.highlighting, true);
    assert.equal(features.folding, true);
    assert.equal(features.changeHighlight, true);
});

test("tier boundaries are exclusive of the limit", () => {
    assert.equal(classifyDocument(measure(256 * 1024, 100)), "full");
    assert.equal(classifyDocument(measure(256 * 1024 + 1, 100)), "reduced");
    assert.equal(classifyDocument(measure(1000, 20_000)), "full");
    assert.equal(classifyDocument(measure(1000, 20_001)), "reduced");
    assert.equal(classifyDocument(measure(2 * 1024 * 1024, 100)), "reduced");
    assert.equal(classifyDocument(measure(2 * 1024 * 1024 + 1, 100)), "plain");
});

test("a minified single-line file is plain whatever its byte size", () => {
    assert.equal(classifyDocument(measure(30_000, 1, 20_001)), "plain");
    assert.equal(classifyDocument(measure(30_000, 1, 20_000)), "full");
});

test("the reduced tier turns off the expensive editor features", () => {
    const features = featuresFor("reduced", measure(500_000, 10_000));
    assert.equal(features.highlighting, true);
    assert.equal(features.folding, false);
    assert.equal(features.bracketColorization, false);
    assert.equal(features.stickyScroll, false);
    assert.equal(features.links, false);
    assert.equal(features.occurrencesHighlight, false);
    assert.equal(features.changeHighlight, true);
    assert.ok(features.maxTokenizationLineLength < featuresFor("full", measure(1, 1)).maxTokenizationLineLength);
});

test("change highlight is dropped above 50,000 lines in the reduced tier", () => {
    assert.equal(featuresFor("reduced", measure(1_000_000, 50_000)).changeHighlight, true);
    assert.equal(featuresFor("reduced", measure(1_000_000, 50_001)).changeHighlight, false);
});

test("the plain tier disables highlighting and change marks", () => {
    const features = featuresFor("plain", measure(3_000_000, 10));
    assert.equal(features.highlighting, false);
    assert.equal(features.changeHighlight, false);
    assert.equal(features.maxTokenizationLineLength, 0);
});
