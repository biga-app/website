import type { SseItem } from "@biga/types/stream";

const DEFAULT_EVENT = "message";

function stripLeadingSpace(value: string): string {
    return value.startsWith(" ") ? value.slice(1) : value;
}

function nextLineEnd(buffer: string, from: number): { end: number; length: number } | null {
    for (let index = from; index < buffer.length; index++) {
        const char = buffer[index];
        if (char === "\n") return { end: index, length: 1 };
        if (char !== "\r") continue;
        if (index + 1 === buffer.length) return null;
        return { end: index, length: buffer[index + 1] === "\n" ? 2 : 1 };
    }
    return null;
}

export function createSseParser() {
    let buffer = "";
    let name = "";
    let data: string[] = [];

    function dispatch(items: SseItem[]): void {
        if (data.length > 0) items.push({ type: "frame", name: name || DEFAULT_EVENT, data: data.join("\n") });
        name = "";
        data = [];
    }

    function readLine(line: string, items: SseItem[]): void {
        if (line === "") return dispatch(items);
        if (line.startsWith(":")) {
            items.push({ type: "comment", text: stripLeadingSpace(line.slice(1)) });
            return;
        }
        const colon = line.indexOf(":");
        const field = colon === -1 ? line : line.slice(0, colon);
        const value = colon === -1 ? "" : stripLeadingSpace(line.slice(colon + 1));
        if (field === "event") name = value;
        else if (field === "data") data.push(value);
    }

    return {
        push(chunk: string): SseItem[] {
            buffer += chunk;
            const items: SseItem[] = [];
            let start = 0;
            for (let found = nextLineEnd(buffer, start); found; found = nextLineEnd(buffer, start)) {
                readLine(buffer.slice(start, found.end), items);
                start = found.end + found.length;
            }
            buffer = buffer.slice(start);
            return items;
        },
    };
}
