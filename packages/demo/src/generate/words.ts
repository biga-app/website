import type { Faker } from "@faker-js/faker";

export type Field = { name: string; kind: "text" | "count" | "flag"; text: string; count: number; flag: boolean };

const FIELD_KINDS = ["text", "count", "flag"] as const;

function letters(text: string): string {
    return text.toLowerCase().replace(/[^a-z]+/g, " ").trim().split(" ")[0] ?? "";
}

export function word(faker: Faker): string {
    const candidate = letters(faker.word.noun());
    return candidate.length > 2 ? candidate : "core";
}

export function verb(faker: Faker): string {
    const candidate = letters(faker.hacker.verb());
    return candidate.length > 2 ? candidate : "sync";
}

export function uniqueWords(faker: Faker, count: number): string[] {
    const found = new Set<string>();
    for (let attempt = 0; found.size < count && attempt < count * 20; attempt++) found.add(word(faker));
    for (let index = 0; found.size < count; index++) found.add(`part${index}`);
    return [...found];
}

export function pascal(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function fieldsFor(faker: Faker): Field[] {
    const names = uniqueWords(faker, faker.number.int({ min: 3, max: 5 }));
    return names.map((name, index) => ({
        name,
        kind: FIELD_KINDS[index % FIELD_KINDS.length]!,
        text: word(faker),
        count: faker.number.int({ min: 1, max: 90 }),
        flag: faker.datatype.boolean(),
    }));
}

export function sentence(faker: Faker): string {
    return faker.company.catchPhrase();
}
