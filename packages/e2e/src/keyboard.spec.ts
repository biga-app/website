import { expect, test } from "@playwright/test";

import { openSession } from "./viewer.ts";

test("the tree is a single tab stop and the arrow keys walk, expand and collapse it", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    const tree = page.getByRole("tree");
    await expect(tree).toHaveAttribute("aria-labelledby", "files-heading");

    const tabStops = tree.locator('[role="treeitem"][tabindex="0"]');
    await expect(tabStops).toHaveCount(1);

    await page.getByRole("treeitem", { name: /^src/ }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("treeitem", { name: /^src/ })).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator('[role="treeitem"]:focus')).toHaveAttribute("aria-level", "2");
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("treeitem", { name: /^src/ })).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("treeitem", { name: /^src/ })).toHaveAttribute("aria-expanded", "false");
    await expect(tabStops).toHaveCount(1);
});

test("every row declares its level, set size and position", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    for (const row of await page.getByRole("treeitem").all()) {
        await expect(row).toHaveAttribute("aria-level", /^\d+$/);
        await expect(row).toHaveAttribute("aria-setsize", /^\d+$/);
        await expect(row).toHaveAttribute("aria-posinset", /^\d+$/);
    }
});

test("Home and End jump to the first and last row and Enter opens a file", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    await page.getByRole("treeitem").first().focus();
    await page.keyboard.press("End");
    await expect(page.getByRole("treeitem", { name: /^README\.md/ })).toBeFocused();
    await page.keyboard.press("Home");
    await expect(page.getByRole("treeitem").first()).toBeFocused();
    await page.keyboard.press("End");
    await expect(page.getByRole("treeitem", { name: /^README\.md/ })).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(page.getByRole("treeitem", { name: /^package\.json/ })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/file=package\.json/);
});

test("Mod+P opens quick open and Escape closes it", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    await page.keyboard.press("ControlOrMeta+p");
    await expect(page.getByRole("dialog", { name: "Go to file" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Go to file" })).toBeHidden();
});
