import { config } from "@biga/eslint-config/base";

const frameworkImports = [
  "react",
  "react/*",
  "react-dom",
  "react-dom/*",
  "next",
  "next/*",
  "monaco-editor",
  "monaco-editor/*",
  "@monaco-editor/*",
  "shiki",
  "@shikijs/*",
  "zustand",
  "zustand/*",
  "@biga/stores",
  "@biga/stores/*",
];

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: frameworkImports,
              message: "viewer-core is framework-free: it has to run in a worker and under Node.",
            },
          ],
        },
      ],
    },
  },
];
