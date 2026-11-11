import type { Faker } from "@faker-js/faker";

export type StackId = "typescript" | "go" | "python" | "rust";

export type Stack = {
    id: StackId;
    label: string;
    ext: string;
    vendorDir: string;
    sourcePath: (module: string) => string;
    testPath: (module: string) => string;
    module: (faker: Faker, name: string, deps: string[]) => string;
    test: (faker: Faker, name: string) => string;
    addition: (faker: Faker, name: string) => string;
    config: (faker: Faker, project: string, modules: string[]) => Record<string, string>;
};
