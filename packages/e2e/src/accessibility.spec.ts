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

test("the session overview has no violations", async ({ page }) => {
    await openSession(page, "/session/demo?overview=1");
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
    expect(await violations(page)).toEqual([]);
});

test("the search panel with results has no violations", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    await page.keyboard.press("ControlOrMeta+Shift+f");
    await page.getByRole("textbox", { name: "Search in files" }).fill("greet");
    await expect(page.getByRole("option").first()).toBeVisible();
    expect(await violations(page)).toEqual([]);
});

test("the menubar open has no violations", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    await page.getByRole("menuitem", { name: "View" }).click();
    await expect(page.getByRole("menuitemcheckbox", { name: /^Toggle Sidebar/ })).toBeVisible();
    expect(await violations(page)).toEqual([]);
});

test("a tab context menu open has no violations", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    await page.getByRole("button", { name: "README.md", exact: true }).click({ button: "right" });
    await expect(page.getByRole("menuitem", { name: /^Close Other Tabs/ })).toBeVisible();
    expect(await violations(page)).toEqual([]);
});

test("the split view and the panel have no violations", async ({ page }) => {
    await openSession(page, "/session/demo?file=src/greet.ts");
    await editorReady(page);
    await page.keyboard.press("ControlOrMeta+\\");
    await expect(page.getByRole("region", { name: "Second editor" })).toBeVisible();
    await page.keyboard.press("ControlOrMeta+j");
    await expect(page.getByRole("region", { name: "Panel" })).toBeVisible();
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

    test("the session overview has no violations", async ({ page }) => {
        await openSession(page, "/session/demo?overview=1");
        await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
        expect(await violations(page)).toEqual([]);
    });

    test("the menubar open has no violations", async ({ page }) => {
        await openSession(page, "/session/demo?file=README.md");
        await page.getByRole("menuitem", { name: "View" }).click();
        await expect(page.getByRole("menuitemcheckbox", { name: /^Toggle Sidebar/ })).toBeVisible();
        expect(await violations(page)).toEqual([]);
    });
});

test("the landing page has no violations", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /Stream your/ })).toBeVisible();
    expect(await violations(page)).toEqual([]);
});

test.describe("the landing page in the dark theme", () => {
    test.use({ colorScheme: "dark" });

    test("has no violations", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(await violations(page)).toEqual([]);
    });
});

test("the landing page holds still when the visitor prefers reduced motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("log", { name: "What the biga command prints" })).toBeVisible();
    const before = await page.getByRole("log", { name: "What the biga command prints" }).innerText();
    await page.waitForTimeout(5000);
    expect(await page.getByRole("log", { name: "What the biga command prints" }).innerText()).toBe(before);
    await context.close();
});

test("the brand page has no violations", async ({ page }) => {
    await page.goto("/brand");
    await expect(page.getByRole("heading", { level: 1, name: /pixel that just got saved/ })).toBeVisible();
    expect(await violations(page)).toEqual([]);
});

for (const path of ["/docs", "/docs/viewer"]) {
    test(`${path} has no violations`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(await violations(page)).toEqual([]);
    });
}
