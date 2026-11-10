import type { FileNode } from "@biga/types";

import { hash } from "./hash.ts";

type FileExtra = Partial<Extract<FileNode, { type: "file" }>>;

function leafName(path: string): string {
    return path.slice(path.lastIndexOf("/") + 1);
}

export function fileNode(path: string, extra: FileExtra = {}): FileNode {
    return { type: "file", name: leafName(path), path, size: 10, hash: hash("1"), ...extra };
}

export function directoryNode(path: string, children: FileNode[], ignored = false): FileNode {
    return { type: "directory", name: leafName(path), path, children, ...(ignored ? { ignored: true } : {}) };
}

export function rootNode(children: FileNode[]): FileNode {
    return { type: "directory", name: "", path: "", children };
}
