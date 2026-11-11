import assert from "node:assert/strict";
import test from "node:test";

import { deriveView, serializeViewerUrl, viewerParsers, viewerSearchParamsCache } from "@biga/viewer-core/location/search-params";

test("checkpoint accepts non-negative 32-bit integers only", () => {
    assert.equal(viewerParsers.checkpoint.parse("0"), 0);
    assert.equal(viewerParsers.checkpoint.parse("2147483647"), 2147483647);
    for (const bad of ["2147483648", "-1", "1.5", "abc", "", "99999999999"]) {
        assert.equal(viewerParsers.checkpoint.parse(bad), null, bad);
    }
});

test("base parses start and checkpoint numbers and rejects anything else", () => {
    assert.deepEqual(viewerParsers.base.parse("start"), { kind: "start" });
    assert.deepEqual(viewerParsers.base.parse("12"), { kind: "checkpoint", seq: 12 });
    assert.equal(viewerParsers.base.parse("nope"), null);
});

test("base serializes back to what it parsed from", () => {
    for (const raw of ["start", "0", "41"]) {
        const parsed = viewerParsers.base.parse(raw);
        assert.ok(parsed);
        assert.equal(viewerParsers.base.serialize(parsed), raw);
    }
});

test("embed is true only for the literal 1 and defaults to false", () => {
    assert.equal(viewerParsers.embed.parse("1"), true);
    assert.equal(viewerParsers.embed.parse("true"), null);
    assert.equal(viewerParsers.embed.defaultValue, false);
});

test("line accepts positive integers only", () => {
    assert.equal(viewerParsers.line.parse("1"), 1);
    assert.equal(viewerParsers.line.parse("120"), 120);
    for (const bad of ["0", "-3", "1.5", "abc", "", "123456789"]) {
        assert.equal(viewerParsers.line.parse(bad), null, bad);
    }
});

test("overview is true only for the literal 1 and split is a plain path", () => {
    assert.equal(viewerParsers.overview.parse("1"), true);
    assert.equal(viewerParsers.overview.parse("yes"), null);
    assert.equal(viewerParsers.split.parse("src/a.ts"), "src/a.ts");
});

test("deriveView picks checkpoint over file over overview over live", () => {
    assert.deepEqual(deriveView({ file: null, checkpoint: null, base: null }), { type: "live" });
    assert.deepEqual(deriveView({ file: null, checkpoint: null, base: null, overview: true }), { type: "overview" });
    assert.deepEqual(deriveView({ file: "a.ts", checkpoint: null, base: null, overview: true }), {
        type: "file",
        path: "a.ts",
        base: null,
        line: null,
    });
    assert.deepEqual(deriveView({ file: "a.ts", checkpoint: null, base: { kind: "start" }, line: 7 }), {
        type: "file",
        path: "a.ts",
        base: { kind: "start" },
        line: 7,
    });
    assert.deepEqual(deriveView({ file: "a.ts", checkpoint: 3, base: { kind: "start" } }), {
        type: "checkpoint",
        seq: 3,
        file: "a.ts",
    });
    assert.deepEqual(deriveView({ file: null, checkpoint: 3, base: null }), { type: "checkpoint", seq: 3, file: null });
});

test("serializer builds links and omits defaults and nulls", () => {
    assert.equal(serializeViewerUrl("/session/abc", {}), "/session/abc");
    assert.equal(serializeViewerUrl("/session/abc", { embed: false }), "/session/abc");
    assert.equal(serializeViewerUrl("/session/abc", { checkpoint: 12 }), "/session/abc?checkpoint=12");
    assert.equal(
        serializeViewerUrl("/session/abc", { file: "docs/a b#c.md", base: { kind: "start" }, embed: true }),
        "/session/abc?file=docs/a+b%23c.md&base=start&embed=1"
    );
    assert.equal(
        serializeViewerUrl("/session/abc", { file: "a.ts", line: 12, split: "b.ts" }),
        "/session/abc?file=a.ts&line=12&split=b.ts"
    );
    assert.equal(serializeViewerUrl("/session/abc", { overview: true }), "/session/abc?overview=1");
});

test("a file path with awkward characters survives serialize and parse", () => {
    const path = "weird dir/a#b?c%d&e=f/file name.ts";
    const href = serializeViewerUrl("/session/abc", { file: path });
    const params = new URL(href, "http://x").searchParams;
    assert.equal(viewerParsers.file.parse(params.get("file") ?? ""), path);
});

test("the server-side cache parses a request's search params with the same rules", () => {
    const parsed = viewerSearchParamsCache.parse({ file: "src/a.ts", checkpoint: "3", base: "start", embed: "1" });
    assert.equal(parsed.file, "src/a.ts");
    assert.equal(parsed.checkpoint, 3);
    assert.deepEqual(parsed.base, { kind: "start" });
    assert.equal(parsed.embed, true);
});

test("the server-side cache falls back to empty values for missing or invalid params", () => {
    const parsed = viewerSearchParamsCache.parse({ checkpoint: "nope", embed: "yes" });
    assert.equal(parsed.file, null);
    assert.equal(parsed.checkpoint, null);
    assert.equal(parsed.base, null);
    assert.equal(parsed.embed, false);
});
