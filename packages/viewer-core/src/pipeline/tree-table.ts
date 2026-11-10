import { KIND_DIRECTORY, KIND_FILE, KIND_IGNORED, type CheckpointChange, type FileNode, type TreePatch, type TreeTable } from "@biga/types";

const collator = new Intl.Collator();

function kindOf(node: FileNode): number {
    if (node.type === "file") return KIND_FILE;
    return node.ignored ? KIND_IGNORED : KIND_DIRECTORY;
}

export function compareSiblings(a: { kind: number; name: string }, b: { kind: number; name: string }): number {
    const aDirectory = a.kind !== KIND_FILE;
    const bDirectory = b.kind !== KIND_FILE;
    if (aDirectory !== bDirectory) return aDirectory ? -1 : 1;
    return collator.compare(a.name, b.name);
}

function sortedChildren(node: FileNode): FileNode[] {
    if (node.type !== "directory") return [];
    return [...node.children].sort((a, b) =>
        compareSiblings({ kind: kindOf(a), name: a.name }, { kind: kindOf(b), name: b.name })
    );
}

function countNodes(root: FileNode): number {
    if (root.type !== "directory") return 1;
    let total = 0;
    for (const child of root.children) total += countNodes(child);
    return total + 1;
}

function trimTo(table: TreeTable, rows: number): TreeTable {
    if (table.parents.length === rows) return table;
    return {
        ...table,
        parents: table.parents.slice(0, rows),
        kinds: table.kinds.slice(0, rows),
        sizes: table.sizes.slice(0, rows),
        binary: table.binary.slice(0, rows),
    };
}

export function buildTreeTable(root: FileNode): TreeTable {
    const capacity = Math.max(0, countNodes(root) - 1);
    const table: TreeTable = {
        paths: [],
        hashes: [],
        parents: new Int32Array(capacity),
        kinds: new Uint8Array(capacity),
        sizes: new Float64Array(capacity),
        binary: new Uint8Array(capacity),
    };
    const visit = (node: FileNode, parent: number): void => {
        const index = table.paths.length;
        table.paths.push(node.path);
        table.parents[index] = parent;
        table.kinds[index] = kindOf(node);
        if (node.type === "file") {
            table.hashes.push(node.hash);
            table.sizes[index] = node.size;
            table.binary[index] = node.binary ? 1 : 0;
        } else {
            table.hashes.push("");
        }
        if (node.type === "directory" && !node.ignored) {
            for (const child of sortedChildren(node)) visit(child, index);
        }
    };
    for (const child of sortedChildren(root)) visit(child, -1);
    return trimTo(table, table.paths.length);
}

export function patchesFromChanges(changes: readonly CheckpointChange[]): TreePatch[] {
    const patches: TreePatch[] = [];
    for (const change of changes) {
        if (change.changeType === "deleted") {
            patches.push({ op: "remove", path: change.path });
            continue;
        }
        if (change.changeType === "renamed" && change.oldPath) {
            patches.push({ op: "remove", path: change.oldPath });
        }
        if (change.afterHash) {
            patches.push({ op: "upsert", path: change.path, hash: change.afterHash, binary: Boolean(change.binary) });
        }
    }
    return patches;
}
