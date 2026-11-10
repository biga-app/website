import type { LineRange } from "@biga/types/content";

const MAX_COMPARED_LINES = 1_000;

function commonPrefix(before: string[], after: string[]): number {
    let length = 0;
    while (length < before.length && length < after.length && before[length] === after[length]) length++;
    return length;
}

function commonSuffix(before: string[], after: string[], prefix: number): number {
    let length = 0;
    while (
        length < before.length - prefix &&
        length < after.length - prefix &&
        before[before.length - 1 - length] === after[after.length - 1 - length]
    )
        length++;
    return length;
}

function unmatchedLines(before: string[], after: string[]): number[] {
    const columns = after.length + 1;
    const lengths = new Uint16Array((before.length + 1) * columns);
    for (let row = before.length - 1; row >= 0; row--) {
        for (let column = after.length - 1; column >= 0; column--) {
            lengths[row * columns + column] =
                before[row] === after[column]
                    ? (lengths[(row + 1) * columns + column + 1] as number) + 1
                    : Math.max(lengths[(row + 1) * columns + column] as number, lengths[row * columns + column + 1] as number);
        }
    }
    const unmatched: number[] = [];
    let row = 0;
    let column = 0;
    while (column < after.length) {
        if (row < before.length && before[row] === after[column]) {
            row++;
            column++;
        } else if (row < before.length && (lengths[(row + 1) * columns + column] as number) >= (lengths[row * columns + column + 1] as number)) {
            row++;
        } else {
            unmatched.push(column++);
        }
    }
    return unmatched;
}

function toRanges(lines: number[]): LineRange[] {
    const ranges: LineRange[] = [];
    for (const line of lines) {
        const last = ranges[ranges.length - 1];
        if (last && last.end === line - 1) last.end = line;
        else ranges.push({ start: line, end: line });
    }
    return ranges;
}

export function changedLineRanges(before: string, after: string): LineRange[] {
    const oldLines = before.split("\n");
    const newLines = after.split("\n");
    const prefix = commonPrefix(oldLines, newLines);
    const suffix = commonSuffix(oldLines, newLines, prefix);
    const oldMiddle = oldLines.slice(prefix, oldLines.length - suffix);
    const newMiddle = newLines.slice(prefix, newLines.length - suffix);
    if (newMiddle.length === 0) return [];
    if (oldMiddle.length > MAX_COMPARED_LINES || newMiddle.length > MAX_COMPARED_LINES) {
        return [{ start: prefix + 1, end: prefix + newMiddle.length }];
    }
    return toRanges(unmatchedLines(oldMiddle, newMiddle).map((index) => prefix + index + 1));
}
