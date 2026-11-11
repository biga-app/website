import type { Faker } from "@faker-js/faker";

import { fieldsFor, pascal, sentence, verb, type Field } from "../words.ts";
import type { Stack } from "./types.ts";

const TYPE_OF = { text: "str", count: "int", flag: "bool" } as const;

function literal(field: Field): string {
    if (field.kind === "text") return JSON.stringify(field.text);
    if (field.kind === "count") return String(field.count);
    return field.flag ? "True" : "False";
}

function module(faker: Faker, name: string): string {
    const type = pascal(name);
    const fields = fieldsFor(faker);
    const count = fields.find((field) => field.kind === "count")!;
    const declared = [`    id: str = "${name}-${faker.number.int({ min: 10, max: 99 })}"`, ...fields.map((field) => `    ${field.name}: ${TYPE_OF[field.kind]} = ${literal(field)}`)];
    return [
        `from dataclasses import dataclass`,
        ``,
        ``,
        `@dataclass`,
        `class ${type}:`,
        ...declared,
        ``,
        ``,
        `def create_${name}(**overrides) -> ${type}:`,
        `    return ${type}(**overrides)`,
        ``,
        ``,
        `def score_${name}(value: ${type}) -> int:`,
        `    return value.${count.name} * ${faker.number.int({ min: 2, max: 9 })}`,
        ``,
        ``,
        `def describe_${name}(value: ${type}) -> str:`,
        `    return f"{value.id}:{score_${name}(value)}"`,
        ``,
    ].join("\n");
}

function test(_faker: Faker, name: string): string {
    return [
        `from ${name} import create_${name}, describe_${name}, score_${name}`,
        ``,
        ``,
        `def test_describe_names_the_id():`,
        `    assert "fixed" in describe_${name}(create_${name}(id="fixed"))`,
        ``,
        ``,
        `def test_score_is_positive():`,
        `    assert score_${name}(create_${name}()) > 0`,
        ``,
    ].join("\n");
}

function addition(faker: Faker, name: string): string {
    const action = verb(faker);
    return [``, ``, `def ${action}_${name}(value) -> str:`, `    return f"${action}:{value.id}:${faker.number.int({ min: 100, max: 999 })}"`, ``].join("\n");
}

function config(faker: Faker, project: string, modules: string[]): Record<string, string> {
    return {
        "pyproject.toml": `[project]\nname = "${project}"\nversion = "0.4.2"\ndescription = ${JSON.stringify(sentence(faker))}\nrequires-python = ">=3.11"\n\n[tool.pytest.ini_options]\npythonpath = ["src"]\n`,
        "src/__init__.py": "",
        "src/main.py": `${modules.slice(0, 3).map((name) => `from ${name} import create_${name}, describe_${name}`).join("\n")}\n\n\ndef main() -> None:\n${modules.slice(0, 3).map((name) => `    print(describe_${name}(create_${name}()))`).join("\n")}\n\n\nif __name__ == "__main__":\n    main()\n`,
    };
}

export const pythonStack: Stack = {
    id: "python",
    label: "Python",
    ext: "py",
    vendorDir: ".venv/",
    sourcePath: (name) => `src/${name}.py`,
    testPath: (name) => `tests/test_${name}.py`,
    module,
    test,
    addition,
    config,
};
