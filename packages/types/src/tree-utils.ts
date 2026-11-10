import type { FileNode } from "./file.js";

/**
 * Builds a flat map of file path → file node for O(1) head-metadata lookups.
 * Directory nodes are excluded; only file nodes are indexed.
 */
export function indexTree(
    node: FileNode,
    into: Map<string, FileNode> = new Map()
): Map<string, FileNode> {
    if (node.type === "file") {
        into.set(node.path, node);
        return into;
    }
    for (const child of node.children) {
        indexTree(child, into);
    }
    return into;
}

/**
 * The lexicographically first file path in the tree.
 */
export function firstFilePath(node: FileNode): string | undefined {
    let first: string | undefined;
    for (const path of indexTree(node).keys()) {
        if (first === undefined || path < first) first = path;
    }
    return first;
}

const README_RE = /^readme(\.(md|mdx|markdown|txt|rst))?$/i;

export function isReadmeName(name: string): boolean {
    return README_RE.test(name);
}

/**
 * The file to open when a session has no recent change to point at: a root
 * README if there is one, since that is where a reader would start, otherwise
 * the first file in the tree.
 */
export function preferredFilePath(node: FileNode): string | undefined {
    if (node.type === "directory") {
        const readme = node.children.find(
            (child) => child.type === "file" && !child.binary && isReadmeName(child.name)
        );
        if (readme) {
            return readme.path;
        }
    }
    return firstFilePath(node);
}

/**
 * The first file in a change list that can be shown in the editor: one that
 * still exists after the change and has text content.
 */
export function firstViewableChange(
    changes: readonly { path: string; changeType: string; binary?: boolean }[]
): string | undefined {
    return changes.find((change) => change.changeType !== "deleted" && !change.binary)?.path;
}
