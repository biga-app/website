import { ancestorPaths, baseName, parentPath, ROOT_PATH } from "@biga/types/file-identity";
import { KIND_DIRECTORY, KIND_FILE, type TreeEntry, type TreeLoad, type TreePatch, type TreePosition, type TreeTable } from "@biga/types/tree-table";

import { compareSiblings } from "./tree-table.ts";

function newEntry(path: string, kind: number, parent: TreeEntry): TreeEntry {
    return {
        path,
        name: baseName(path),
        kind,
        depth: parent.depth + 1,
        parent: parent.path,
        hash: "",
        size: 0,
        binary: false,
        children: [],
    };
}

function createEntries(): Map<string, TreeEntry> {
    return new Map([
        [ROOT_PATH, { path: ROOT_PATH, name: "", kind: KIND_DIRECTORY, depth: -1, parent: ROOT_PATH, hash: "", size: 0, binary: false, children: [] }],
    ]);
}

export function createTreeModel() {
    let entries = createEntries();
    const expanded = new Set<string>();
    let rows: string[] = [];
    let rowsDirty = true;
    let revision = 0;
    let fileCount = 0;

    function lowerBound(siblings: string[], probe: TreeEntry): number {
        let low = 0;
        let high = siblings.length;
        while (low < high) {
            const middle = (low + high) >>> 1;
            const sibling = entries.get(siblings[middle] as string) as TreeEntry;
            if (compareSiblings(sibling, probe) < 0) low = middle + 1;
            else high = middle;
        }
        return low;
    }

    function attach(entry: TreeEntry): void {
        const parent = entries.get(entry.parent) as TreeEntry;
        parent.children.splice(lowerBound(parent.children, entry), 0, entry.path);
        entries.set(entry.path, entry);
        if (entry.kind === KIND_FILE) fileCount++;
    }

    function detach(entry: TreeEntry): void {
        const parent = entries.get(entry.parent) as TreeEntry;
        const index = lowerBound(parent.children, entry);
        if (parent.children[index] === entry.path) parent.children.splice(index, 1);
        entries.delete(entry.path);
        if (entry.kind === KIND_FILE) fileCount--;
    }

    function ensureDirectory(path: string): TreeEntry | null {
        const existing = entries.get(path);
        if (existing) return existing.kind === KIND_DIRECTORY ? existing : null;
        const parent = ensureDirectory(parentPath(path));
        if (!parent) return null;
        const directory = newEntry(path, KIND_DIRECTORY, parent);
        attach(directory);
        return directory;
    }

    function upsert(patch: Extract<TreePatch, { op: "upsert" }>): boolean {
        const existing = entries.get(patch.path);
        if (existing) {
            if (existing.kind !== KIND_FILE) return false;
            existing.hash = patch.hash;
            existing.binary = patch.binary;
            if (patch.size !== undefined) existing.size = patch.size;
            return true;
        }
        const parent = ensureDirectory(parentPath(patch.path));
        if (!parent) return false;
        const file = newEntry(patch.path, KIND_FILE, parent);
        file.hash = patch.hash;
        file.binary = patch.binary;
        file.size = patch.size ?? 0;
        attach(file);
        return true;
    }

    function remove(path: string): boolean {
        const entry = entries.get(path);
        if (!entry || entry.kind !== KIND_FILE) return false;
        detach(entry);
        return true;
    }

    function collect(directory: string, into: string[]): void {
        for (const child of (entries.get(directory) as TreeEntry).children) {
            into.push(child);
            const entry = entries.get(child) as TreeEntry;
            if (entry.kind === KIND_DIRECTORY && expanded.has(child)) collect(child, into);
        }
    }

    function refreshRows(): string[] {
        if (rowsDirty) {
            rows = [];
            collect(ROOT_PATH, rows);
            rowsDirty = false;
        }
        return rows;
    }

    function spliceExpansion(path: string, open: boolean): void {
        if (rowsDirty) return;
        const index = rows.indexOf(path);
        if (index === -1) return;
        if (open) {
            const visible: string[] = [];
            collect(path, visible);
            rows.splice(index + 1, 0, ...visible);
            return;
        }
        const depth = (entries.get(path) as TreeEntry).depth;
        let end = index + 1;
        while (end < rows.length && (entries.get(rows[end] as string) as TreeEntry).depth > depth) end++;
        rows.splice(index + 1, end - index - 1);
    }

    function startLoad(table: TreeTable): TreeLoad {
            const staged = createEntries();
            let next = 0;
            let files = 0;
            return {
                get done() {
                    return next >= table.paths.length;
                },
                step(count: number): void {
                    const end = Math.min(next + count, table.paths.length);
                    for (; next < end; next++) {
                        const path = table.paths[next] as string;
                        const parentIndex = table.parents[next] as number;
                        const parent = staged.get(parentIndex === -1 ? ROOT_PATH : (table.paths[parentIndex] as string)) as TreeEntry;
                        const entry = newEntry(path, table.kinds[next] as number, parent);
                        entry.hash = table.hashes[next] as string;
                        entry.size = table.sizes[next] as number;
                        entry.binary = table.binary[next] === 1;
                        parent.children.push(path);
                        staged.set(path, entry);
                        if (entry.kind === KIND_FILE) files++;
                    }
                },
                commit(): void {
                    entries = staged;
                    fileCount = files;
                    rowsDirty = true;
                    revision++;
                },
            };
        }

    return {
        get revision() {
            return revision;
        },
        get fileCount() {
            return fileCount;
        },
        entry: (path: string) => entries.get(path),
        expandedPaths: () => expanded,
        filePaths(): string[] {
            const paths: string[] = [];
            for (const entry of entries.values()) if (entry.kind === KIND_FILE) paths.push(entry.path);
            return paths;
        },
        rows: (): readonly string[] => refreshRows(),
        startLoad,
        load(table: TreeTable): void {
            const load = startLoad(table);
            load.step(table.paths.length);
            load.commit();
        },
        apply(patches: readonly TreePatch[]): void {
            let changed = false;
            for (const patch of patches) {
                const touched = patch.op === "upsert" ? upsert(patch) : remove(patch.path);
                changed = changed || touched;
            }
            if (!changed) return;
            rowsDirty = true;
            revision++;
        },
        setExpanded(path: string, open: boolean): void {
            const entry = entries.get(path);
            if (!entry || entry.kind !== KIND_DIRECTORY || expanded.has(path) === open) return;
            if (open) expanded.add(path);
            else expanded.delete(path);
            spliceExpansion(path, open);
            revision++;
        },
        expandAncestors(path: string): void {
            for (const ancestor of ancestorPaths(path)) {
                if (!expanded.has(ancestor) && entries.get(ancestor)?.kind === KIND_DIRECTORY) {
                    expanded.add(ancestor);
                    spliceExpansion(ancestor, true);
                }
            }
            revision++;
        },
        collapseAll(): void {
            expanded.clear();
            rowsDirty = true;
            revision++;
        },
        position(path: string): TreePosition | null {
            const entry = entries.get(path);
            if (!entry) return null;
            const siblings = (entries.get(entry.parent) as TreeEntry).children;
            return { setSize: siblings.length, posInSet: lowerBound(siblings, entry) + 1 };
        },
    };
}
