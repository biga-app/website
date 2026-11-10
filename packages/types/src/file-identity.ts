import { PATTERN_HASH } from "./gen/biga/v1/contract_consts.js";

/** Matches a valid SHA-256 blob hash (64 lowercase or uppercase hex digits). */
export const HASH_RE = new RegExp(PATTERN_HASH);

export function isValidHash(value: string): boolean {
    return HASH_RE.test(value);
}

/**
 * Returns the final path segment of a virtual forward-slash path.
 * Equivalent to POSIX basename — no filesystem access.
 */
export function baseName(path: string): string {
    const parts = path.split("/");
    return parts[parts.length - 1] ?? path;
}

export const ROOT_PATH = "";

/**
 * The directory path containing a virtual path, or ROOT_PATH for a top-level
 * entry.
 */
export function parentPath(path: string): string {
    const slash = path.lastIndexOf("/");
    return slash === -1 ? ROOT_PATH : path.slice(0, slash);
}

/**
 * Every directory above a virtual path, outermost first, excluding the root.
 */
export function ancestorPaths(path: string): string[] {
    const ancestors: string[] = [];
    for (let parent = parentPath(path); parent !== ROOT_PATH; parent = parentPath(parent)) {
        ancestors.unshift(parent);
    }
    return ancestors;
}
