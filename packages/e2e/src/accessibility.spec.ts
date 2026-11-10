import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { editorReady, openSession } from "./viewer.ts";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

function summarize(results: Awaited<ReturnType<AxeBuilder["analyze"]>>) {
    return results.violations.map((violation) => ({
        rule: violation.id,
        impact: violation.impact,
        targets: violation.nodes.map((node) => node.target.join(" ")),
    }));
}

async function violations(page: Page) {
    await page.evaluate(() =>
        Promise.all(
            document
                .getAnimations()
                .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
                .map((animation) => animation.finished)
        )
    );
    const interface_ = await new AxeBuilder({ page }).withTags(WCAG_TAGS).exclude(".monaco-editor").analyze();
    if ((await page.locator(".monaco-editor").count()) === 0) return summarize(interface_);
    const editors = await new AxeBuilder({ page }).include(".monaco-editor").withRules(["aria-input-field-name"]).analyze();
    return [...summarize(interface_), ...summarize(editors)];
}

test("the live viewer with a file open has no violations", async ({ page }) => {
    await openSession(page, "/session/demo?file=src/greet.ts");
    await editorReady(page);
    expect(await violations(page)).toEqual([]);
});

test("an expanded tree has no violations", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    await page.getByRole("treeitem", { name: /^src/ }).click();
    await expect(page.getByRole("treeitem", { name: /^src/ })).toHaveAttribute("aria-expanded", "true");
    expect(await violations(page)).toEqual([]);
});

test("the timeline has no violations", async ({ page }) => {
    await page.goto("/session/demo?checkpoint=1");
    await expect(page.getByRole("button", { name: /^Save #1\b/ })).toHaveAttribute("aria-expanded", "true");
    expect(await violations(page)).toEqual([]);
});

test("quick open has no violations", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    await page.keyboard.press("ControlOrMeta+p");
    await expect(page.getByRole("dialog", { name: "Go to file" })).toBeVisible();
    expect(await violations(page)).toEqual([]);
});

test("a deleted file has no violations", async ({ page }) => {
    await openSession(page, "/session/demo?file=missing.ts");
    await expect(page.getByText("missing.ts was deleted")).toBeVisible();
    expect(await violations(page)).toEqual([]);
});

test("the not-found page has no violations", async ({ page }) => {
    await page.goto("/session/does-not-exist");
    await expect(page.getByRole("heading", { name: "Session not found" })).toBeVisible();
    expect(await violations(page)).toEqual([]);
});

test.describe("in the dark theme", () => {
    test.use({ colorScheme: "dark" });

    test("the live viewer with a file open has no violations", async ({ page }) => {
        await openSession(page, "/session/demo?file=src/greet.ts");
        await editorReady(page);
        await expect(page.locator("html")).toHaveClass(/dark/);
        expect(await violations(page)).toEqual([]);
    });

    test("the timeline has no violations", async ({ page }) => {
        await page.goto("/session/demo?checkpoint=1");
        await expect(page.getByRole("button", { name: /^Save #1\b/ })).toHaveAttribute("aria-expanded", "true");
        expect(await violations(page)).toEqual([]);
    });

    test("quick open has no violations", async ({ page }) => {
        await openSession(page, "/session/demo?file=README.md");
        await page.keyboard.press("ControlOrMeta+p");
        await expect(page.getByRole("dialog", { name: "Go to file" })).toBeVisible();
        expect(await violations(page)).toEqual([]);
    });
});
