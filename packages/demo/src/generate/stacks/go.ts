import type { Faker } from "@faker-js/faker";

import { fieldsFor, pascal, verb, type Field } from "../words.ts";
import type { Stack } from "./types.ts";

const TYPE_OF = { text: "string", count: "int", flag: "bool" } as const;

function literal(field: Field): string {
    if (field.kind === "text") return JSON.stringify(field.text);
    return String(field.kind === "count" ? field.count : field.flag);
}

function module(faker: Faker, name: string): string {
    const type = pascal(name);
    const fields = fieldsFor(faker);
    const count = fields.find((field) => field.kind === "count")!;
    const declared = [`\tID string`, ...fields.map((field) => `\t${pascal(field.name)} ${TYPE_OF[field.kind]}`)];
    const defaults = [`ID: "${name}-${faker.number.int({ min: 10, max: 99 })}"`, ...fields.map((field) => `${pascal(field.name)}: ${literal(field)}`)];
    return [
        `package ${name}`,
        ``,
        `import "fmt"`,
        ``,
        `type ${type} struct {`,
        ...declared,
        `}`,
        ``,
        `func New${type}() ${type} {`,
        `\treturn ${type}{${defaults.join(", ")}}`,
        `}`,
        ``,
        `func (v ${type}) Score() int {`,
        `\treturn v.${pascal(count.name)} * ${faker.number.int({ min: 2, max: 9 })}`,
        `}`,
        ``,
        `func (v ${type}) Describe() string {`,
        `\treturn fmt.Sprintf("%s:%d", v.ID, v.Score())`,
        `}`,
        ``,
    ].join("\n");
}

function test(_faker: Faker, name: string): string {
    const type = pascal(name);
    return [
        `package ${name}`,
        ``,
        `import "testing"`,
        ``,
        `func Test${type}Describe(t *testing.T) {`,
        `\tif New${type}().Describe() == "" {`,
        `\t\tt.Fatal("expected a description")`,
        `\t}`,
        `}`,
        ``,
        `func Test${type}Score(t *testing.T) {`,
        `\tif New${type}().Score() <= 0 {`,
        `\t\tt.Fatal("expected a positive score")`,
        `\t}`,
        `}`,
        ``,
    ].join("\n");
}

function addition(faker: Faker, name: string): string {
    const type = pascal(name);
    const action = pascal(verb(faker));
    return [``, `func (v ${type}) ${action}() string {`, `\treturn fmt.Sprintf("${action.toLowerCase()}:%s:${faker.number.int({ min: 100, max: 999 })}", v.ID)`, `}`, ``].join("\n");
}

function config(_faker: Faker, project: string, modules: string[]): Record<string, string> {
    const imports = modules.slice(0, 3).map((name) => `\t"example.com/${project}/internal/${name}"`);
    const uses = modules.slice(0, 3).map((name) => `\tfmt.Println(${name}.New${pascal(name)}().Describe())`);
    return {
        "go.mod": `module example.com/${project}\n\ngo 1.24\n`,
        [`cmd/${project}/main.go`]: [`package main`, ``, `import (`, `\t"fmt"`, ``, ...imports, `)`, ``, `func main() {`, ...uses, `}`, ``].join("\n"),
        Makefile: `build:\n\tgo build -o bin/${project} ./cmd/${project}\n\ntest:\n\tgo test ./...\n`,
    };
}

export const goStack: Stack = {
    id: "go",
    label: "Go",
    ext: "go",
    vendorDir: "bin/",
    sourcePath: (name) => `internal/${name}/${name}.go`,
    testPath: (name) => `internal/${name}/${name}_test.go`,
    module,
    test,
    addition,
    config,
};
