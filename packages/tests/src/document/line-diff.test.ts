import assert from "node:assert/strict";
import test from "node:test";

import { changedLineRanges } from "@biga/viewer-core/document/line-diff";

const text = (...lines: string[]) => lines.join("\n");

test("identical text has no changed lines", () => {
    assert.deepEqual(changedLineRanges(text("a", "b"), text("a", "b")), []);
});

test("an edited line is reported at its new line number", () => {
    assert.deepEqual(changedLineRanges(text("a", "b", "c"), text("a", "B", "c")), [{ start: 2, end: 2 }]);
});

test("appended lines are reported as one range", () => {
    assert.deepEqual(changedLineRanges(text("a", "b"), text("a", "b", "c", "d")), [{ start: 3, end: 4 }]);
});

test("an inserted line shifts nothing else into the result", () => {
    assert.deepEqual(changedLineRanges(text("a", "c", "d"), text("a", "b", "c", "d")), [{ start: 2, end: 2 }]);
});

test("separate edits produce separate ranges", () => {
    const before = text("1", "2", "3", "4", "5", "6");
    const after = text("1", "two", "3", "4", "five", "6");
    assert.deepEqual(changedLineRanges(before, after), [
        { start: 2, end: 2 },
        { start: 5, end: 5 },
    ]);
});

test("a pure deletion marks nothing because no new line changed", () => {
    assert.deepEqual(changedLineRanges(text("a", "b", "c"), text("a", "c")), []);
});

test("moved text is reported only where it now sits", () => {
    assert.deepEqual(changedLineRanges(text("a", "b", "c", "d"), text("a", "c", "d", "b")), [{ start: 4, end: 4 }]);
});

test("an empty file gaining content marks every line", () => {
    assert.deepEqual(changedLineRanges("", text("a", "b")), [{ start: 1, end: 2 }]);
});

test("a very large changed region is marked whole instead of compared line by line", () => {
    const before = Array.from({ length: 1_500 }, (_, index) => `old ${index}`);
    const after = [text("keep"), ...Array.from({ length: 1_500 }, (_, index) => `new ${index}`), "tail"];
    assert.deepEqual(changedLineRanges(text("keep", ...before, "tail"), after.join("\n")), [{ start: 2, end: 1_501 }]);
});
