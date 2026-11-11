import { createServer } from "node:http";
import { Readable } from "node:stream";
import { parseArgs } from "node:util";
import { createDemoFetch } from "@biga/demo/server/fetch";
import { broadcast, commit, createSession, type Session } from "@biga/demo/server/session";

const { values: flags } = parseArgs({ options: { port: { type: "string", default: "8080" }, tick: { type: "string", default: "4000" } } });
const NOW = Date.parse("2026-01-01T09:00:00.000Z");

const DEMO_FILES: Record<string, string> = {
    "README.md": "# Demo session\n\nThis session is served by the fixture server.\nEdit anything and watch the viewer follow along.\n",
    "package.json": '{\n  "name": "demo",\n  "version": "1.0.0",\n  "scripts": { "dev": "vite" }\n}\n',
    "src/index.ts": 'import { greet } from "./greet";\n\nconsole.log(greet("biga"));\n',
    "src/greet.ts": "export function greet(name: string): string {\n    return `Hello, ${name}!`;\n}\n",
    "src/utils/math.ts": "export const add = (a: number, b: number) => a + b;\nexport const mul = (a: number, b: number) => a * b;\n",
    "src/utils/strings.ts": "export const shout = (text: string) => text.toUpperCase();\n",
    "src/styles/app.css": ":root {\n  --accent: #63e197;\n}\n\nbody {\n  margin: 0;\n}\n",
    "cmd/server/main.go": 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("hello")\n}\n',
    "docs/guide.md": "# Guide\n\n1. Install\n2. Run\n3. Share the link\n",
    "docs/notes/todo.md": "- [ ] write tests\n- [ ] ship\n",
    "dist/bundle.min.js": `${"var a=function(b){return b+1};".repeat(1_000)}\n`,
    "data/rows.json": `[\n${Array.from({ length: 25_000 }, (_, index) => `  { "id": ${index} },`).join("\n")}\n  null\n]\n`,
};

function bigFiles(): Record<string, string> {
    const files: Record<string, string> = { "README.md": "# Big session\n\n50,000 files.\n" };
    for (let dir = 0; dir < 500; dir++) {
        for (let file = 0; file < 100; file++) {
            files[`packages/pkg-${String(dir).padStart(3, "0")}/src/file-${String(file).padStart(3, "0")}.ts`] =
                `export const value${dir}_${file} = ${dir * 100 + file};\n`;
        }
    }
    return files;
}

async function fixture(id: string) {
    const session = createSession({ id, title: `${id} fixture`, description: "Served by the fixture server", startedAt: NOW });
    await commit(session, id === "big" ? bigFiles() : DEMO_FILES);
    if (id !== "big") {
        await commit(session, { "src/greet.ts": "export function greet(name: string): string {\n    return `Hello, ${name}! Welcome.`;\n}\n" });
        await commit(session, { "src/utils/math.ts": `${DEMO_FILES["src/utils/math.ts"]}export const sub = (a: number, b: number) => a - b;\n`, "docs/notes/todo.md": null });
        await commit(session, { "README.md": `${DEMO_FILES["README.md"]}\nSecond paragraph.\n` });
    }
    if (id === "ended") session.status = "ended";
    return session;
}

const sessions = new Map(await Promise.all(["demo", "big", "ended"].map(async (id) => [id, await fixture(id)] as const)));

async function tick(session: Session) {
    const seq = session.checkpoints.length;
    const checkpoint = await commit(session, { [`src/generated/file-${seq}.ts`]: `export const n = ${seq};\n` });
    broadcast(session, { type: "checkpoint", payload: checkpoint });
}

setInterval(() => {
    const demo = sessions.get("demo")!;
    if (demo.subscribers.size > 0) void tick(demo);
}, Number(flags.tick));

createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
    const url = new URL(req.url ?? "/", "http://fixture");
    const id = url.pathname.split("/")[3];
    const session = id ? sessions.get(id) : undefined;
    if (!session) { res.writeHead(404).end(); return; }
    const abort = new AbortController();
    res.on("close", () => abort.abort());
    try {
        const response = await createDemoFetch(session)(url, { signal: abort.signal });
        res.writeHead(response.status, Object.fromEntries(response.headers));
        if (response.body) Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]).on("error", () => res.end()).pipe(res);
        else res.end();
    } catch {
        if (!res.headersSent) res.writeHead(500);
        res.end();
    }
}).listen(Number(flags.port), () => console.log(`fixture server on http://localhost:${flags.port} (sessions: demo, big, ended)`));
