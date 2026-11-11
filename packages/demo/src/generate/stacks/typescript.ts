import type { Faker } from "@faker-js/faker";

import { fieldsFor, pascal, sentence, verb, type Field } from "../words.ts";
import type { Stack } from "./types.ts";

const TYPE_OF = { text: "string", count: "number", flag: "boolean" } as const;

function literal(field: Field): string {
    if (field.kind === "text") return JSON.stringify(field.text);
    return String(field.kind === "count" ? field.count : field.flag);
}

function importLine(dep: string): string {
    return `import { create${pascal(dep)} } from "./${dep}.ts";`;
}

function module(faker: Faker, name: string, deps: string[]): string {
    const type = pascal(name);
    const fields = fieldsFor(faker);
    const count = fields.find((field) => field.kind === "count")!;
    const upstream = deps[0];
    const imports = deps.map(importLine);
    const head = imports.length ? [...imports, ""] : [];
    const declared = [`  id: string;`, ...fields.map((field) => `  ${field.name}: ${TYPE_OF[field.kind]};`)];
    const defaults = [`    id: input.id ?? "${name}-${faker.number.int({ min: 10, max: 99 })}",`, ...fields.map((field) => `    ${field.name}: input.${field.name} ?? ${literal(field)},`)];
    const describe = upstream ? `${name}:\${value.id}:\${create${pascal(upstream)}().id}` : `${name}:\${value.id}`;
    return [
        ...head,
        `export interface ${type} {`,
        ...declared,
        `}`,
        ``,
        `export function create${type}(input: Partial<${type}> = {}): ${type} {`,
        `  return {`,
        ...defaults,
        `  };`,
        `}`,
        ``,
        `export function score${type}(value: ${type}): number {`,
        `  return value.${count.name} * ${faker.number.int({ min: 2, max: 9 })};`,
        `}`,
        ``,
        `export function describe${type}(value: ${type}): string {`,
        `  return \`${describe}\`;`,
        `}`,
        ``,
    ].join("\n");
}

function test(_faker: Faker, name: string): string {
    const type = pascal(name);
    return [
        `import { describe, expect, it } from "vitest";`,
        ``,
        `import { create${type}, describe${type}, score${type} } from "./${name}.ts";`,
        ``,
        `describe("${name}", () => {`,
        `  it("describes what it creates", () => {`,
        `    expect(describe${type}(create${type}({ id: "fixed" }))).toContain("fixed");`,
        `  });`,
        ``,
        `  it("scores a positive number", () => {`,
        `    expect(score${type}(create${type}())).toBeGreaterThan(0);`,
        `  });`,
        `});`,
        ``,
    ].join("\n");
}

function addition(faker: Faker, name: string): string {
    const type = pascal(name);
    const action = verb(faker);
    return [``, `export function ${action}${type}(value: { id: string }): string {`, `  return \`${action}:\${value.id}:${faker.number.int({ min: 100, max: 999 })}\`;`, `}`, ``].join("\n");
}

function config(faker: Faker, project: string, modules: string[]): Record<string, string> {
    const manifest = { name: project, version: "0.4.2", type: "module", description: sentence(faker), scripts: { build: "tsc -p .", test: "vitest run", lint: "eslint ." } };
    return {
        "package.json": `${JSON.stringify(manifest, null, 2)}\n`,
        "tsconfig.json": `${JSON.stringify({ compilerOptions: { target: "es2022", module: "esnext", strict: true, outDir: "dist" }, include: ["src"] }, null, 2)}\n`,
        "src/index.ts": `${modules.map((name) => `export * from "./${name}.ts";`).join("\n")}\n`,
    };
}

export const typescriptStack: Stack = {
    id: "typescript",
    label: "TypeScript",
    ext: "ts",
    vendorDir: "node_modules/",
    sourcePath: (name) => `src/${name}.ts`,
    testPath: (name) => `src/${name}.test.ts`,
    module,
    test,
    addition,
    config,
};
