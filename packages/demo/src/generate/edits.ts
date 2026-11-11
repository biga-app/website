import type { Faker } from "@faker-js/faker";

import { fakerFor } from "./faker.ts";
import { stackById, type Project } from "./project.ts";
import { word } from "./words.ts";

export type Edit = { changes: Record<string, string | null>; label: string; rename?: { from: string; to: string } };

type Kind = "modify" | "append" | "docs" | "add" | "delete" | "rename";

const KINDS: { weight: number; value: Kind }[] = [
    { weight: 5, value: "modify" },
    { weight: 3, value: "append" },
    { weight: 1, value: "docs" },
    { weight: 0.5, value: "add" },
    { weight: 0.5, value: "delete" },
    { weight: 0.5, value: "rename" },
];

const TEST_PATH = /(\.test\.|_test\.|(^|\/)tests?\/|\/test_)/;
const NUMBER = /\b\d{2,3}\b/;
const FOCUS_SIZE = 4;

type Context = { project: Project; files: ReadonlyMap<string, string>; faker: Faker };

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const stem = (path: string) => baseName(path).replace(/\.[^.]+$/, "");
const directory = (path: string) => path.slice(0, path.lastIndexOf("/") + 1);

function sourcePaths({ project, files }: Context): string[] {
    return [...files.keys()].filter((path) => path.endsWith(`.${project.ext}`) && !TEST_PATH.test(path)).sort();
}

function focusPaths(context: Context): string[] {
    return fakerFor(`${context.project.seed}:focus`).helpers.shuffle(sourcePaths(context)).slice(0, FOCUS_SIZE);
}

function testPaths({ files }: Context): string[] {
    return [...files.keys()].filter((path) => TEST_PATH.test(path)).sort();
}

function freshName(context: Context): string {
    const taken = new Set([...context.files.keys()].map(stem));
    for (let attempt = 0; attempt < 30; attempt++) {
        const candidate = word(context.faker);
        if (!taken.has(candidate)) return candidate;
    }
    return `part${context.files.size}`;
}

function pick(context: Context, paths: string[]): string {
    return context.faker.helpers.arrayElement(paths);
}

function append(context: Context): Edit {
    const path = pick(context, focusPaths(context));
    const addition = stackById(context.project.stack).addition(context.faker, stem(path));
    return { changes: { [path]: `${context.files.get(path)}${addition}` }, label: `Updated ${baseName(path)}` };
}

function modify(context: Context): Edit {
    const candidates = focusPaths(context).filter((path) => NUMBER.test(context.files.get(path) ?? ""));
    if (candidates.length === 0) return append(context);
    const path = pick(context, candidates);
    const lines = context.files.get(path)!.split("\n");
    const numbered = lines.flatMap((line, index) => (NUMBER.test(line) ? [index] : []));
    const target = context.faker.helpers.arrayElement(numbered);
    const step = context.faker.number.int({ min: 1, max: 9 });
    lines[target] = lines[target]!.replace(NUMBER, (found) => String(Number(found) + step));
    return { changes: { [path]: lines.join("\n") }, label: `Updated ${baseName(path)}` };
}

function docs(context: Context): Edit {
    const current = context.files.get("README.md") ?? "";
    return { changes: { "README.md": `${current}- ${context.faker.hacker.phrase()}\n` }, label: "Updated README.md" };
}

function add(context: Context): Edit {
    const stack = stackById(context.project.stack);
    const name = freshName(context);
    const source = stack.sourcePath(name);
    return {
        changes: { [source]: stack.module(context.faker, name, []), [stack.testPath(name)]: stack.test(context.faker, name) },
        label: `Added ${baseName(source)} +1 more`,
    };
}

function remove(context: Context): Edit {
    const tests = testPaths(context);
    if (tests.length < 4) return append(context);
    const path = pick(context, tests);
    return { changes: { [path]: null }, label: `Deleted ${baseName(path)}` };
}

function rename(context: Context): Edit {
    const from = pick(context, sourcePaths(context));
    const to = `${directory(from)}${freshName(context)}.${context.project.ext}`;
    return { changes: { [from]: null, [to]: context.files.get(from)! }, label: `Renamed ${baseName(to)}`, rename: { from, to } };
}

const BUILDERS: Record<Kind, (context: Context) => Edit> = { modify, append, docs, add, delete: remove, rename };

export function editAt(project: Project, files: ReadonlyMap<string, string>, index: number): Edit {
    const faker = fakerFor(`${project.seed}:edit:${index}`);
    const kind = faker.helpers.weightedArrayElement(KINDS);
    return BUILDERS[kind]({ project, files, faker });
}
