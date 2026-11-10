import { expect, test } from "@playwright/test";
import { gzipSync } from "node:zlib";

import { BUDGETS } from "./budgets.ts";
import { openSession } from "./viewer.ts";

type LongTaskWindow = Window & { longTasks: number[] };

test("hydrating and expanding a 50,000 file tree stays within the DOM, long task and interaction budgets", async ({ page }) => {
    await page.addInitScript(() => {
        const tasks: number[] = [];
        (window as unknown as LongTaskWindow).longTasks = tasks;
        new PerformanceObserver((list) => list.getEntries().forEach((entry) => tasks.push(entry.duration))).observe({
            type: "longtask",
            buffered: true,
        });
    });
    await openSession(page, "/session/big?file=missing.ts");
    await expect(page.getByText("missing.ts was deleted")).toBeVisible();
    await page.waitForTimeout(1_500);

    const nodes = await page.evaluate(() => [...document.querySelectorAll("*")].filter((element) => !element.closest(".monaco-editor")).length);
    expect(nodes).toBeLessThanOrEqual(BUDGETS.domNodesWithLargeTree);

    const longTasks = await page.evaluate(() => (window as unknown as LongTaskWindow).longTasks);
    expect(Math.max(0, ...longTasks)).toBeLessThanOrEqual(BUDGETS.longTaskMs);

    const expandMs = await page.evaluate(async () => {
        const row = document.querySelector<HTMLElement>('[role="treeitem"][data-path="packages"]');
        const start = performance.now();
        row?.click();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return performance.now() - start;
    });
    await expect(page.getByRole("treeitem", { name: "packages" })).toHaveAttribute("aria-expanded", "true");
    expect(expandMs).toBeLessThanOrEqual(BUDGETS.expandDirectoryMs);
});

test("the scripts needed before the editor loads stay within the first load budget", async ({ page }) => {
    const sizes: number[] = [];
    const pending: Promise<void>[] = [];
    page.on("response", (response) => {
        if (response.request().resourceType() !== "script") return;
        pending.push(
            response
                .body()
                .then((body) => void sizes.push(gzipSync(body).length))
                .catch(() => undefined)
        );
    });
    await openSession(page, "/session/demo?file=missing.ts");
    await expect(page.getByText("missing.ts was deleted")).toBeVisible();
    await page.waitForTimeout(1_500);
    await Promise.all(pending);
    const kib = sizes.reduce((sum, size) => sum + size, 0) / 1024;
    expect(kib).toBeLessThanOrEqual(BUDGETS.firstLoadScriptKiB);
});

test("the viewer loads only the two interface fonts and none of the marketing faces", async ({ page }) => {
    const fonts: { name: string; bytes: number }[] = [];
    const pending: Promise<void>[] = [];
    page.on("response", (response) => {
        if (!/\.woff2?$/.test(response.url())) return;
        pending.push(
            response
                .body()
                .then((body) => void fonts.push({ name: response.url().split("/").pop() ?? "", bytes: body.length }))
                .catch(() => undefined)
        );
    });
    await openSession(page, "/session/demo?file=missing.ts");
    await expect(page.getByText("missing.ts was deleted")).toBeVisible();
    await page.waitForTimeout(1_500);
    await Promise.all(pending);
    expect(fonts.filter(({ name }) => /pixel/i.test(name))).toEqual([]);
    expect(fonts.reduce((sum, { bytes }) => sum + bytes, 0) / 1024).toBeLessThanOrEqual(BUDGETS.fontKiB);
});
