import type { Intent, Op } from "./engine.ts";

export type Message =
    | { type: "hello"; from: string }
    | { type: "state"; to: string; startedAt: number; log: Op[] }
    | { type: "op"; op: Op; n: number }
    | { type: "request"; intent: Intent }
    | { type: "beat" };

export type Link = {
    post: (message: Message) => void;
    listen: (handler: (message: Message) => void) => () => void;
    close: () => void;
};

const SILENT: Link = { post: () => undefined, listen: () => () => undefined, close: () => undefined };

export function openLink(seed: string, enabled: boolean): Link {
    if (!enabled || typeof BroadcastChannel === "undefined") return SILENT;
    const channel = new BroadcastChannel(`biga-demo:${seed}`);
    return {
        post: (message) => channel.postMessage(message),
        listen(handler) {
            const receive = (event: MessageEvent<Message>) => handler(event.data);
            channel.addEventListener("message", receive);
            return () => channel.removeEventListener("message", receive);
        },
        close: () => channel.close(),
    };
}

export type Peer = { startedAt: number; log: Op[] };

export function discover(link: Link, id: string, waitMs: number): Promise<Peer | null> {
    return new Promise((resolve) => {
        const stop = link.listen((message) => {
            if (message.type !== "state" || message.to !== id) return;
            clearTimeout(timer);
            stop();
            resolve({ startedAt: message.startedAt, log: message.log });
        });
        const timer = setTimeout(() => {
            stop();
            resolve(null);
        }, waitMs);
        link.post({ type: "hello", from: id });
    });
}
