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

/** @type {import('next').NextConfig} */
const nextConfig = {
    // The Docker image runs the self-contained server Next emits with this.
    output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
    // Trace dependencies from the monorepo root so workspace packages are
    // included in the standalone output.
    outputFileTracingRoot: path.join(here, "../.."),
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
