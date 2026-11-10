import { expect, test } from "@playwright/test";

import { editorReady, openSession } from "./viewer.ts";

test("an unknown session shows the not-found page and asks crawlers to skip it", async ({ page }) => {
    await page.goto("/session/does-not-exist");
    await expect(page.getByRole("heading", { name: "Session not found" })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).not.toHaveCount(0);
});

test("a deep link opens that file", async ({ page }) => {
    await openSession(page, "/session/demo?file=src/greet.ts");
    await editorReady(page);
    await expect(page.getByRole("treeitem", { name: /greet\.ts/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".monaco-editor .view-lines")).toContainText("Hello");
});

test("opening a file from the tree updates the URL and Back returns to the previous file", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    await editorReady(page);
    await page.getByRole("treeitem", { name: "package.json" }).click();
    await expect(page).toHaveURL(/file=package\.json/);
    await page.goBack();
    await expect(page).toHaveURL(/file=README\.md/);
});

test("a checkpoint link opens the timeline on that checkpoint", async ({ page }) => {
    await page.goto("/session/demo?checkpoint=1");
    await expect(page).toHaveURL(/checkpoint=1/);
    await expect(page.getByRole("button", { name: /^Save #1\b/ })).toHaveAttribute("aria-expanded", "true");
});
