import type { Faker } from "@faker-js/faker";

import { fieldsFor, pascal, sentence, verb, type Field } from "../words.ts";
import type { Stack } from "./types.ts";

const TYPE_OF = { text: "String", count: "u32", flag: "bool" } as const;

function literal(field: Field): string {
    if (field.kind === "text") return `${JSON.stringify(field.text)}.to_string()`;
    return String(field.kind === "count" ? field.count : field.flag);
}

function module(faker: Faker, name: string): string {
    const type = pascal(name);
    const fields = fieldsFor(faker);
    const count = fields.find((field) => field.kind === "count")!;
    const declared = [`    pub id: String,`, ...fields.map((field) => `    pub ${field.name}: ${TYPE_OF[field.kind]},`)];
    const defaults = [`            id: "${name}-${faker.number.int({ min: 10, max: 99 })}".to_string(),`, ...fields.map((field) => `            ${field.name}: ${literal(field)},`)];
    return [
        `#[derive(Debug, Clone)]`,
        `pub struct ${type} {`,
        ...declared,
        `}`,
        ``,
        `impl ${type} {`,
        `    pub fn new() -> Self {`,
        `        Self {`,
        ...defaults,
        `        }`,
        `    }`,
        ``,
        `    pub fn score(&self) -> u32 {`,
        `        self.${count.name} * ${faker.number.int({ min: 2, max: 9 })}`,
        `    }`,
        ``,
        `    pub fn describe(&self) -> String {`,
        `        format!("{}:{}", self.id, self.score())`,
        `    }`,
        `}`,
        ``,
    ].join("\n");
}

function test(_faker: Faker, name: string): string {
    const type = pascal(name);
    return [
        `use crate::${name}::${type};`,
        ``,
        `#[test]`,
        `fn describes_what_it_creates() {`,
        `    assert!(!${type}::new().describe().is_empty());`,
        `}`,
        ``,
        `#[test]`,
        `fn scores_a_positive_number() {`,
        `    assert!(${type}::new().score() > 0);`,
        `}`,
        ``,
    ].join("\n");
}

function addition(faker: Faker, name: string): string {
    const type = pascal(name);
    const action = verb(faker);
    return [``, `impl ${type} {`, `    pub fn ${action}(&self) -> String {`, `        format!("${action}:{}:${faker.number.int({ min: 100, max: 999 })}", self.id)`, `    }`, `}`, ``].join("\n");
}

function config(faker: Faker, project: string, modules: string[]): Record<string, string> {
    return {
        "Cargo.toml": `[package]\nname = "${project}"\nversion = "0.4.2"\nedition = "2021"\ndescription = ${JSON.stringify(sentence(faker))}\n`,
        "src/main.rs": `${modules.map((name) => `mod ${name};`).join("\n")}\n\nfn main() {\n${modules.slice(0, 3).map((name) => `    println!("{}", ${name}::${pascal(name)}::new().describe());`).join("\n")}\n}\n`,
    };
}

export const rustStack: Stack = {
    id: "rust",
    label: "Rust",
    ext: "rs",
    vendorDir: "target/",
    sourcePath: (name) => `src/${name}.rs`,
    testPath: (name) => `tests/${name}.rs`,
    module,
    test,
    addition,
    config,
};
