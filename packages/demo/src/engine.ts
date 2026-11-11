import type { Checkpoint } from "@biga/types/checkpoint";

import { editAt } from "./generate/edits.ts";
import { generateProject, type Project } from "./generate/project.ts";
import { broadcast, commit, createSession, setIgnored, type Session } from "./server/session.ts";

export type Intent = { type: "edit" } | { type: "ignore"; pattern: string; ignored: boolean };

export type Op = Intent & { at: number };

export type Engine = { project: Project; session: Session; edits: number; queue: Promise<unknown> };

export const HISTORY_MS = 12 * 60_000;

const BACKFILL = 8;
const BACKFILL_GAP_MS = 80_000;

async function runEdit(engine: Engine, at: number): Promise<Checkpoint> {
    const edit = editAt(engine.project, engine.session.files, engine.edits++);
    return commit(engine.session, edit.changes, edit.label, at, edit.rename);
}

async function execute(engine: Engine, op: Op): Promise<Checkpoint | null> {
    if (op.type === "ignore") {
        setIgnored(engine.session, op.pattern, op.ignored, op.at);
        return null;
    }
    const checkpoint = await runEdit(engine, op.at);
    broadcast(engine.session, { type: "checkpoint", payload: checkpoint });
    return checkpoint;
}

export function applyOp(engine: Engine, op: Op): Promise<Checkpoint | null> {
    const run = engine.queue.then(() => execute(engine, op));
    engine.queue = run.catch(() => undefined);
    return run;
}

export async function createEngine(seed: string, startedAt: number): Promise<Engine> {
    const project = generateProject(seed);
    const session = createSession({ id: seed, title: project.name, description: `${project.stackLabel} project, generated for this visit`, startedAt, binary: project.binary });
    for (const rule of project.rules) if (rule.locked) session.ignored.add(rule.pattern);
    await commit(session, project.files, "Initial snapshot", startedAt);
    const engine: Engine = { project, session, edits: 0, queue: Promise.resolve() };
    for (let step = 1; step <= BACKFILL; step++) await runEdit(engine, startedAt + step * BACKFILL_GAP_MS);
    return engine;
}
