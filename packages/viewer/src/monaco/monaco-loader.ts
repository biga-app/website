import { loader } from "@monaco-editor/react";

import * as monaco from "monaco-editor/editor/editor.api";

import "./monaco-core";

self.MonacoEnvironment = {
    getWorker: () => new Worker(new URL("./editor.worker.ts", import.meta.url), { type: "module" }),
};

loader.config({ monaco });
