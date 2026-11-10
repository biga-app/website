import type { TreeReader } from "@biga/types/stores";
import { isReadmeName } from "@biga/types/tree-utils";

export function pickInitialFile(reader: TreeReader): string | undefined {
    const paths = reader.filePaths();
    const readme = paths.find((path) => !path.includes("/") && isReadmeName(path) && !reader.entry(path)?.binary);
    if (readme) return readme;
    let first: string | undefined;
    for (const path of paths) {
        if (first === undefined || path < first) first = path;
    }
    return first;
}
