import { expect, test, type Page } from "@playwright/test";

const BOOT = { timeout: 30_000 };

test.describe.configure({ timeout: 90_000 });

function strip(page: Page) {
    return page.getByRole("group", { name: "The broadcast" });
}

async function projectName(page: Page): Promise<string> {
    await expect(strip(page)).toContainText("Broadcasting ./", BOOT);
    return (await strip(page).innerText()).match(/Broadcasting \.\/([\w-]+)/)![1]!;
}

async function latestSeq(page: Page): Promise<number> {
    const log = page.getByRole("log", { name: "Latest checkpoint" });
    await expect(log).toContainText("checkpoint #", BOOT);
    return Number((await log.innerText()).match(/#(\d+)/)![1]);
}

async function statusSeq(page: Page): Promise<number> {
    return Number((await page.locator('footer[aria-label="Status"]').innerText()).match(/#(\d+)/)?.[1] ?? 0);
}

test("the landing page runs the real viewer on a generated project", async ({ page }) => {
    await page.goto("/?seed=boot1234");
    await expect(page.getByRole("treeitem").first()).toBeVisible(BOOT);
    expect(await projectName(page)).toMatch(/^[a-z]+-[a-z]+$/);
});

test("the same seed makes the same project and another seed makes another", async ({ browser }) => {
    const names: string[] = [];
    for (const seed of ["same1234", "same1234", "other567"]) {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(`/?seed=${seed}`);
        names.push(await projectName(page));
        await context.close();
    }
    expect(names[0]).toBe(names[1]);
    expect(names[2]).not.toBe(names[0]);
});

test("Save a change lands as a new checkpoint", async ({ page }) => {
    await page.goto("/?seed=save1234");
    const before = await latestSeq(page);
    await page.getByRole("button", { name: "Save a change" }).click();
    await expect.poll(() => latestSeq(page), { timeout: 10_000 }).toBeGreaterThan(before);
});

test("a second tab follows the broadcast, checkpoint for checkpoint", async ({ context }) => {
    const first = await context.newPage();
    await first.goto("/?seed=sync7777");
    const name = await projectName(first);
    const second = await context.newPage();
    await second.goto("/demo?seed=sync7777");
    await expect(second).toHaveTitle(new RegExp(name), BOOT);
    await expect(second.getByRole("treeitem").first()).toBeVisible(BOOT);
    const before = await latestSeq(first);
    await first.getByRole("button", { name: "Save a change" }).click();
    await expect.poll(() => statusSeq(second), { timeout: 15_000 }).toBeGreaterThan(before);
});

test("the sidebar toggle lives on the activity rail, not in the header", async ({ page }) => {
    await page.goto("/demo?seed=rail1234");
    const rail = page.getByRole("navigation", { name: "Views" });
    await expect(rail.getByRole("button", { name: "Hide sidebar" })).toBeVisible(BOOT);
    await expect(page.getByRole("banner").getByRole("button", { name: /sidebar/i })).toHaveCount(0);
    await rail.getByRole("button", { name: "Hide sidebar" }).click();
    await expect(page.getByRole("complementary", { name: "Files" })).toBeHidden();
    await rail.getByRole("button", { name: "Show sidebar" }).click();
    await expect(page.getByRole("complementary", { name: "Files" })).toBeVisible();
});

test("viewer shortcuts only act while the visitor is inside the embedded viewer", async ({ page }) => {
    await page.goto("/?seed=keys1234");
    await expect(page.getByRole("treeitem").first()).toBeVisible(BOOT);
    await page.mouse.move(2, 2);
    await page.keyboard.press("ControlOrMeta+p");
    await expect(page.getByRole("dialog", { name: "Go to file" })).toHaveCount(0);
    await page.getByRole("treeitem").first().click();
    await page.keyboard.press("ControlOrMeta+p");
    await expect(page.getByRole("dialog", { name: "Go to file" })).toBeVisible();
});

test("hiding a folder removes it from what viewers can open", async ({ page }) => {
    await page.goto("/?seed=priv1234");
    await expect(page.getByRole("treeitem").first()).toBeVisible(BOOT);
    await page.getByRole("group", { name: "Tour" }).getByRole("button", { name: "Privacy", exact: true }).click();
    const count = page.getByRole("status").filter({ hasText: "Viewers can open" });
    await expect(count).toBeVisible(BOOT);
    const read = async () => Number((await count.innerText()).match(/open ([\d,]+) files/)![1]!.replace(",", ""));
    const before = await read();
    await page.getByRole("button", { name: "Hide docs/ from viewers" }).click();
    await expect.poll(read, { timeout: 10_000 }).toBeLessThan(before);
    await page.getByRole("button", { name: "Share docs/ with viewers" }).click();
    await expect.poll(read, { timeout: 10_000 }).toBe(before);
});
