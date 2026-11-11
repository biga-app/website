import type { Checkpoint } from "@biga/types/checkpoint";

import { applyOp, createEngine, HISTORY_MS, type Intent, type Op } from "./engine.ts";
import type { IgnoreRule, Project } from "./generate/project.ts";
import { createDemoFetch } from "./server/fetch.ts";
import type { Session } from "./server/session.ts";
import { discover, openLink } from "./sync.ts";

export type Role = "broadcaster" | "follower";

export type DemoBackend = {
    seed: string;
    sessionId: string;
    project: Project;
    session: Session;
    startedAt: number;
    fetch: typeof fetch;
    role: () => Role;
    paused: () => boolean;
    save: () => void;
    setIgnored: (pattern: string, ignored: boolean) => void;
    isIgnored: (pattern: string) => boolean;
    rules: () => IgnoreRule[];
    pause: () => void;
    resume: () => void;
    onCheckpoint: (listener: (checkpoint: Checkpoint) => void) => () => void;
    dispose: () => void;
};

export type DemoOptions = { seed: string; now?: number; tickMs?: number; link?: boolean; peerWaitMs?: number };

const TICK_MS = 9000;
const BEAT_MS = 2000;
const BEAT_TIMEOUT_MS = 6500;

export async function createDemoBackend(options: DemoOptions): Promise<DemoBackend> {
    const { seed, tickMs = TICK_MS, peerWaitMs = 350 } = options;
    const id = crypto.randomUUID();
    const link = openLink(seed, options.link !== false);
    const peer = await discover(link, id, peerWaitMs);
    const startedAt = peer?.startedAt ?? (options.now ?? Date.now()) - HISTORY_MS;
    const engine = await createEngine(seed, startedAt);
    const log: Op[] = [];
    const listeners = new Set<(checkpoint: Checkpoint) => void>();
    let role: Role = peer ? "follower" : "broadcaster";
    let paused = false;
    let lastBeat = Date.now();
    let tick: ReturnType<typeof setTimeout> | undefined;
    let beat: ReturnType<typeof setInterval> | undefined;
    let watchdog: ReturnType<typeof setInterval> | undefined;

    async function apply(op: Op, announce: boolean): Promise<void> {
        const checkpoint = await applyOp(engine, op);
        if (checkpoint && announce) listeners.forEach((listener) => listener(checkpoint));
    }

    function record(intent: Intent): void {
        const op: Op = { ...intent, at: Date.now() };
        log.push(op);
        link.post({ type: "op", op, n: log.length - 1 });
        void apply(op, true);
    }

    function submit(intent: Intent): void {
        if (role === "broadcaster") record(intent);
        else link.post({ type: "request", intent });
    }

    function schedule(): void {
        clearTimeout(tick);
        if (paused || role !== "broadcaster") return;
        tick = setTimeout(() => {
            record({ type: "edit" });
            schedule();
        }, tickMs * (0.7 + Math.random() * 0.6));
    }

    function promote(): void {
        role = "broadcaster";
        clearInterval(watchdog);
        beat = setInterval(() => link.post({ type: "beat" }), BEAT_MS);
        schedule();
    }

    function watch(): void {
        lastBeat = Date.now();
        watchdog = setInterval(() => {
            if (Date.now() - lastBeat > BEAT_TIMEOUT_MS) promote();
        }, BEAT_MS);
    }

    const stopListening = link.listen((message) => {
        if (message.type === "hello" && role === "broadcaster") link.post({ type: "state", to: message.from, startedAt, log });
        else if (message.type === "request" && role === "broadcaster") record(message.intent);
        else if (message.type === "beat") lastBeat = Date.now();
        else if (message.type === "op" && role === "follower" && message.n === log.length) {
            log.push(message.op);
            void apply(message.op, true);
        }
    });

    for (const op of peer?.log ?? []) {
        log.push(op);
        await apply(op, false);
    }
    if (role === "broadcaster") promote();
    else watch();

    return {
        seed,
        sessionId: seed,
        project: engine.project,
        session: engine.session,
        startedAt,
        fetch: createDemoFetch(engine.session),
        role: () => role,
        paused: () => paused,
        save: () => submit({ type: "edit" }),
        setIgnored: (pattern, ignored) => submit({ type: "ignore", pattern, ignored }),
        isIgnored: (pattern) => engine.session.ignored.has(pattern),
        rules: () => engine.project.rules,
        pause() {
            paused = true;
            clearTimeout(tick);
        },
        resume() {
            paused = false;
            schedule();
        },
        onCheckpoint(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        dispose() {
            clearTimeout(tick);
            clearInterval(beat);
            clearInterval(watchdog);
            stopListening();
            link.close();
            listeners.clear();
        },
    };
}
