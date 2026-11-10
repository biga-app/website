import { baseName } from "@biga/types";
import { toast } from "sonner";

import { copyWithToast, downloadText } from "@/lib/file-actions";

import type { SessionRuntime } from "./runtime";

async function currentContent(runtime: SessionRuntime, path: string): Promise<string | null> {
    const entry = runtime.stores.tree.getState().reader.entry(path);
    try {
        if (entry?.hash) return (await runtime.loadBlob(entry.hash, path)).content;
        return (await runtime.api.getFile(runtime.sessionId, path, "latest")).content;
    } catch {
        toast.error(`Unable to load ${baseName(path)}`, {
            description: "It may have been deleted since the tree last updated.",
        });
        return null;
    }
}

export async function copyFileContent(runtime: SessionRuntime, path: string): Promise<void> {
    const content = await currentContent(runtime, path);
    if (content !== null) await copyWithToast(content, `contents of ${baseName(path)}`);
}

export async function downloadFile(runtime: SessionRuntime, path: string): Promise<void> {
    const content = await currentContent(runtime, path);
    if (content !== null) downloadText(path, content);
}
