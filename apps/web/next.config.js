import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createMDX } from "fumadocs-mdx/next";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Where the Go API server (github.com/biga-app/server) answers. `/api/sessions`
 * is proxied there, so the viewer and the CLI can keep talking to this origin.
 * In development it defaults to a server on :8080; in production it is only
 * proxied when set, because a reverse proxy in front of both (see
 * github.com/biga-app/docker) or NEXT_PUBLIC_BIGA_API_URL usually covers it.
 */
const serverUrl =
    process.env.BIGA_SERVER_URL ??
    (process.env.NODE_ENV === "development" ? "http://localhost:8080" : undefined);

const dev = process.env.NODE_ENV === "development";

function apiOrigin() {
    const configured = process.env.NEXT_PUBLIC_BIGA_API_URL;
    return configured ? new URL(configured).origin : "";
}

const viewerPolicy = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin()}${dev ? " ws: wss:" : ""}`.trim(),
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ["@biga/viewer-core", "@biga/ui", "@biga/viewer", "@biga/art", "@biga/demo"],
    // The Docker image runs the self-contained server Next emits with this.
    output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
    // Trace dependencies from the monorepo root so workspace packages are
    // included in the standalone output.
    outputFileTracingRoot: path.join(here, "../.."),
    async headers() {
        return ["/session/:path*", "/demo/:path*"].map((source) => ({
            source,
            headers: [
                { key: "Content-Security-Policy", value: viewerPolicy },
                { key: "Referrer-Policy", value: "same-origin" },
            ],
        }));
    },
    async rewrites() {
        if (!serverUrl) {
            return [];
        }
        const target = serverUrl.replace(/\/+$/, "");
        return [{ source: "/api/sessions/:path*", destination: `${target}/api/sessions/:path*` }];
    },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
