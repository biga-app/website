import { loader } from "@monaco-editor/react";

import { monaco } from "./monaco-core";

self.MonacoEnvironment = {
    getWorker: () => new Worker(new URL("./editor.worker.ts", import.meta.url), { type: "module" }),
};

loader.config({ monaco });
