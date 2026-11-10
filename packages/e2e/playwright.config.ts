import { defineConfig, devices } from "@playwright/test";

const FIXTURE_PORT = 8080;
const WEB_PORT = 3100;
const FIXTURE_TICK_OFF_MS = 3_600_000;
const ci = process.env.CI !== undefined;

export default defineConfig({
    testDir: "src",
    workers: 1,
    retries: ci ? 1 : 0,
    reporter: ci ? [["github"], ["list"]] : "list",
    use: {
        baseURL: `http://localhost:${WEB_PORT}`,
        trace: "retain-on-failure",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: [
        {
            command: `pnpm --filter @biga/tests fixture --tick ${FIXTURE_TICK_OFF_MS}`,
            port: FIXTURE_PORT,
            reuseExistingServer: !ci,
        },
        {
            command: `pnpm --filter web exec next start -p ${WEB_PORT}`,
            port: WEB_PORT,
            env: { BIGA_SERVER_URL: `http://localhost:${FIXTURE_PORT}` },
            reuseExistingServer: !ci,
        },
    ],
});
