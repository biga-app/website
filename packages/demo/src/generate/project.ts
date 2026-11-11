import type { Faker } from "@faker-js/faker";

import { fakerFor } from "./faker.ts";
import { goStack } from "./stacks/go.ts";
import { pythonStack } from "./stacks/python.ts";
import { rustStack } from "./stacks/rust.ts";
import type { Stack, StackId } from "./stacks/types.ts";
import { typescriptStack } from "./stacks/typescript.ts";
import { pascal, sentence, uniqueWords, word } from "./words.ts";

export type IgnoreRule = { pattern: string; locked: boolean; reason: string };

export type Project = {
    seed: string;
    name: string;
    stack: StackId;
    stackLabel: string;
    ext: string;
    modules: string[];
    files: Record<string, string>;
    binary: string[];
    rules: IgnoreRule[];
};

export const STACKS: Stack[] = [typescriptStack, goStack, pythonStack, rustStack];

const LOGO = "\u0089PNG\r\n\u001a\n";

function projectName(faker: Faker): string {
    return `${word(faker)}-${word(faker)}`;
}

function dependenciesOf(modules: string[], index: number, faker: Faker): string[] {
    if (index === 0 || !faker.datatype.boolean({ probability: 0.4 })) return [];
    return [modules[faker.number.int({ min: 0, max: index - 1 })]!];
}

function sources(stack: Stack, faker: Faker, modules: string[]): Record<string, string> {
    const files: Record<string, string> = {};
    modules.forEach((name, index) => {
        files[stack.sourcePath(name)] = stack.module(faker, name, dependenciesOf(modules, index, faker));
        files[stack.testPath(name)] = stack.test(faker, name);
    });
    return files;
}

function readme(faker: Faker, name: string, stack: Stack): string {
    const bullets = Array.from({ length: 4 }, () => `- ${pascal(faker.hacker.phrase())}`);
    return `# ${name}\n\n${sentence(faker)}.\n\nA ${stack.label} project.\n\n## What it does\n\n${bullets.join("\n")}\n`;
}

function docs(faker: Faker): Record<string, string> {
    const titles = uniqueWords(faker, 4);
    return Object.fromEntries(titles.map((title) => [`docs/${title}.md`, `# ${pascal(title)}\n\n${faker.lorem.paragraphs(2, "\n\n")}\n`]));
}

function fixtures(faker: Faker): Record<string, string> {
    const names = uniqueWords(faker, 4);
    const rows = (): string => JSON.stringify(Array.from({ length: 4 }, () => ({ id: faker.string.alphanumeric(6), label: word(faker), weight: faker.number.int({ min: 1, max: 99 }) })), null, 2);
    return Object.fromEntries(names.map((name) => [`fixtures/${name}.json`, `${rows()}\n`]));
}

function scripts(faker: Faker, name: string): Record<string, string> {
    return {
        "scripts/release.sh": `#!/usr/bin/env sh\nset -eu\n\necho "releasing ${name}"\necho "${sentence(faker)}"\n`,
        "scripts/check.sh": `#!/usr/bin/env sh\nset -eu\n\necho "checking ${name}"\n`,
    };
}

function rulesFor(stack: Stack): IgnoreRule[] {
    return [
        { pattern: ".env", locked: true, reason: "Secrets stay on your machine" },
        { pattern: stack.vendorDir, locked: true, reason: "Dependencies are never shared" },
        { pattern: "docs/", locked: false, reason: "Notes you may not want public" },
        { pattern: "fixtures/", locked: false, reason: "Test data can be large" },
        { pattern: "scripts/", locked: false, reason: "Internal tooling" },
    ];
}

export function generateProject(seed: string): Project {
    const faker = fakerFor(`${seed}:project`);
    const stack = faker.helpers.arrayElement(STACKS);
    const name = projectName(faker);
    const modules = uniqueWords(faker, faker.number.int({ min: 10, max: 22 }));
    const files: Record<string, string> = {
        "README.md": readme(faker, name, stack),
        ".gitignore": `${stack.vendorDir}\n.env\n`,
        "assets/logo.png": LOGO,
        ...stack.config(faker, name, modules),
        ...sources(stack, faker, modules),
        ...docs(faker),
        ...fixtures(faker),
        ...scripts(faker, name),
    };
    return { seed, name, stack: stack.id, stackLabel: stack.label, ext: stack.ext, modules, files, binary: ["assets/logo.png"], rules: rulesFor(stack) };
}

export function stackById(id: StackId): Stack {
    return STACKS.find((stack) => stack.id === id)!;
}
