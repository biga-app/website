import { base, en, Faker } from "@faker-js/faker";

function hash(text: string): number {
    let value = 2166136261;
    for (let index = 0; index < text.length; index++) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
    return value >>> 0;
}

export function fakerFor(seed: string): Faker {
    const faker = new Faker({ locale: [en, base] });
    faker.seed(hash(seed));
    return faker;
}
