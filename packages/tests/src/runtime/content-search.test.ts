import assert from "node:assert/strict";
import test from "node:test";

import {
    compileMatcher,
    matchContent,
    searchContent,
    type FileMatches,
    type SearchOptions,
} from "@biga/viewer-core/runtime/content-search";

const plain: SearchOptions = { query: "", caseSensitive: false, wholeWord: false, regex: false };

function pattern(options: Partial<SearchOptions>): RegExp {
    const matcher = compileMatcher({ ...plain, ...options });
    assert.ok(matcher?.ok);
    return matcher.pattern;
}

test("an empty query compiles to nothing", () => {
    assert.equal(compileMatcher(plain), null);
});

test("a plain query is matched literally and ignores case by default", () => {
    const lines = matchContent("Hello (world)\nhello\nnothing", pattern({ query: "hello (" }));
    assert.deepEqual(lines.map((match) => match.line), [1]);
    assert.equal(matchContent("Hello\nhello", pattern({ query: "hello" })).length, 2);
});

test("case sensitivity and whole words narrow the matches", () => {
    assert.equal(matchContent("Hello\nhello", pattern({ query: "hello", caseSensitive: true })).length, 1);
    assert.equal(matchContent("cat\ncatalog\nthe cat sat", pattern({ query: "cat", wholeWord: true })).length, 2);
});

test("a regular expression query is used as written", () => {
    const hits = matchContent("a1\nb22\nc", pattern({ query: "\\d+", regex: true }));
    assert.deepEqual(hits.map((match) => match.text), ["a1", "b22"]);
});

test("an invalid or empty-matching regular expression is reported, not thrown", () => {
    const broken = compileMatcher({ ...plain, query: "(", regex: true });
    assert.ok(broken && !broken.ok);
    const empty = compileMatcher({ ...plain, query: "a*", regex: true });
    assert.ok(empty && !empty.ok);
});

test("matches report their line and the span to highlight", () => {
    const [hit] = matchContent("one\ntwo three", pattern({ query: "three" }));
    assert.ok(hit);
    assert.equal(hit.line, 2);
    assert.equal(hit.text.slice(hit.from, hit.to), "three");
});

test("a long line is cut around the match with ellipses", () => {
    const line = `${"x".repeat(400)}needle${"y".repeat(400)}`;
    const [hit] = matchContent(line, pattern({ query: "needle" }));
    assert.ok(hit);
    assert.ok(hit.text.startsWith("…") && hit.text.endsWith("…"));
    assert.equal(hit.text.slice(hit.from, hit.to), "needle");
    assert.ok(hit.text.length < 260);
});

test("windows line endings do not leak into the text", () => {
    const [hit] = matchContent("abc\r\ndef", pattern({ query: "abc" }));
    assert.equal(hit?.text, "abc");
});

test("several matches on one line are all reported and the per-file cap holds", () => {
    assert.equal(matchContent("aa aa aa", pattern({ query: "aa" })).length, 3);
    assert.equal(matchContent("a\n".repeat(500), pattern({ query: "a" }), 10).length, 10);
});

function runner(files: Record<string, string | null>, options: Partial<SearchOptions>, extra: { maxMatches?: number; signal?: AbortSignal } = {}) {
    const results: FileMatches[] = [];
    const progress: number[] = [];
    const done = searchContent({
        paths: Object.keys(files),
        options: { ...plain, ...options },
        load: async (path) => files[path] ?? null,
        onFile: (result) => void results.push(result),
        onProgress: (searched) => void progress.push(searched),
        concurrency: 2,
        ...extra,
    });
    return { done, results, progress };
}

test("a search visits every file, reports the ones that match and counts progress", async () => {
    const { done, results, progress } = runner({ "a.ts": "needle", "b.ts": "nothing", "c.ts": null, "d.ts": "a needle b needle" }, { query: "needle" });
    const summary = await done;
    assert.deepEqual(results.map((result) => result.path).sort(), ["a.ts", "d.ts"]);
    assert.equal(summary.searched, 4);
    assert.equal(summary.total, 4);
    assert.equal(summary.matches, 3);
    assert.equal(summary.files, 2);
    assert.equal(summary.truncated, false);
    assert.equal(Math.max(...progress), 4);
});

test("a search stops early at the match limit and says it was cut short", async () => {
    const files: Record<string, string> = {};
    for (let index = 0; index < 20; index++) files[`f${index}.ts`] = "hit\nhit\nhit";
    const summary = await runner(files, { query: "hit" }, { maxMatches: 10 }).done;
    assert.equal(summary.truncated, true);
    assert.ok(summary.matches <= 12);
    assert.ok(summary.searched < 20);
});

test("an aborted search stops and is marked cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const summary = await runner({ "a.ts": "needle" }, { query: "needle" }, { signal: controller.signal }).done;
    assert.equal(summary.cancelled, true);
    assert.equal(summary.searched, 0);
});

test("a search with an invalid pattern does nothing", async () => {
    const summary = await runner({ "a.ts": "x" }, { query: "(", regex: true }).done;
    assert.equal(summary.searched, 0);
});
