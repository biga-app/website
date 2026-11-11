import { expect, test, type Page } from "@playwright/test";

import { editorReady, openSession } from "./viewer.ts";

function tabList(page: Page, label = "Open files") {
    return page.getByRole("list", { name: label, exact: true });
}

async function openFiles(page: Page, names: string[]) {
    for (const name of names) {
        await page.getByRole("treeitem", { name: new RegExp(`^${name.replace(".", "\\.")}`) }).click();
        await expect(tabList(page).getByRole("button", { name, exact: true })).toBeVisible();
    }
}

test("a tab's context menu closes the others, the ones to its right, or all of them", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    await openFiles(page, ["package.json"]);
    await page.getByRole("treeitem", { name: /^src/ }).click();
    await openFiles(page, ["greet.ts"]);
    const tabs = tabList(page).getByRole("button", { name: /^(README\.md|package\.json|greet\.ts)$/ });
    await expect(tabs).toHaveCount(3);

    await tabList(page).getByRole("button", { name: "package.json", exact: true }).click({ button: "right" });
    await page.getByRole("menuitem", { name: /^Close Tabs to the Right/ }).click();
    await expect(tabs).toHaveCount(2);

    await tabList(page).getByRole("button", { name: "README.md", exact: true }).click({ button: "right" });
    await page.getByRole("menuitem", { name: /^Close Other Tabs/ }).click();
    await expect(tabs).toHaveCount(1);
    await expect(page).toHaveURL(/file=README\.md/);
});

test("Alt+Shift+W closes every tab and shows the session overview, Alt+Shift+T brings one back", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    await openFiles(page, ["package.json"]);
    await page.keyboard.press("Alt+Shift+W");
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
    await expect(page).not.toHaveURL(/file=/);
    await page.keyboard.press("Alt+Shift+T");
    await expect(page).toHaveURL(/file=/);
});

test("the overview shows the session's facts, activity and files", async ({ page }) => {
    await openSession(page, "/session/demo?overview=1");
    for (const label of ["Status", "Started", "Files", "Checkpoints", "Privacy"]) {
        await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Languages" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Most changed files" })).toBeVisible();
    await expect(page.getByRole("img", { name: /^Saves over time/ })).toBeVisible();
});

test("Mod+K opens the command palette and a command runs from it", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    await editorReady(page);
    await page.keyboard.press("ControlOrMeta+k");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox").fill(">wrap");
    await dialog.getByRole("option", { name: /Wrap Long Lines/ }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: /Wrap/ }).last()).toHaveAttribute("aria-pressed", "true");
});

test("typing a colon in the palette jumps to a line", async ({ page }) => {
    await openSession(page, "/session/demo?file=src/greet.ts");
    await editorReady(page);
    await page.keyboard.press("ControlOrMeta+p");
    const dialog = page.getByRole("dialog", { name: "Go to file" });
    await dialog.getByRole("combobox").fill(":2");
    await dialog.getByRole("option", { name: "Go to line 2" }).click();
    await expect(page).toHaveURL(/line=2/);
    await expect(page.getByRole("button", { name: /^Ln 2, Col 1$/ })).toBeVisible();
});

test("search in files lists matches and opens one at its line", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    await page.keyboard.press("ControlOrMeta+Shift+f");
    const input = page.getByRole("textbox", { name: "Search in files" });
    await expect(input).toBeFocused();
    await input.fill("greet");
    await expect(page.getByText(/\d+ results? in \d+ files?/)).toBeVisible();
    const results = page.getByRole("listbox", { name: "Search results" });
    await results.getByRole("option").first().click();
    await expect(page).toHaveURL(/file=src%2Fgreet\.ts|file=src\/greet\.ts/);
    await expect(page).toHaveURL(/line=\d+/);
});

test("Mod+\\ splits the editor and the second group keeps its own tabs", async ({ page }) => {
    await openSession(page, "/session/demo?file=src/greet.ts");
    await editorReady(page);
    await page.keyboard.press("ControlOrMeta+\\");
    await expect(page.getByRole("region", { name: "Second editor" })).toBeVisible();
    await expect(page).toHaveURL(/split=/);
    await expect(tabList(page, "Open files in the second editor")).toBeVisible();
    await page.keyboard.press("ControlOrMeta+k");
    await page.getByRole("dialog").getByRole("combobox").fill(">close split");
    await page.getByRole("option", { name: "Close Split View" }).click();
    await expect(page.getByRole("region", { name: "Second editor" })).toBeHidden();
    await expect(page).not.toHaveURL(/split=/);
});

test("the menubar opens with the keyboard and moves between menus with the arrow keys", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    const menubar = page.getByRole("menubar", { name: "Viewer menu" });
    const file = menubar.getByRole("menuitem", { name: "File" });
    await file.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem", { name: /^Close Other Tabs/ })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("menuitemcheckbox", { name: /^Toggle Sidebar/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menuitemcheckbox", { name: /^Toggle Sidebar/ })).toBeHidden();
});

test("the open tabs come back after a reload", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    await openFiles(page, ["package.json"]);
    await page.waitForTimeout(600);
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible();
    await expect(tabList(page).getByRole("button", { name: "README.md", exact: true })).toBeVisible();
    await expect(tabList(page).getByRole("button", { name: "package.json", exact: true })).toBeVisible();
});

test("the panel opens from the status bar and the layout presets change the sidebar", async ({ page }) => {
    await openSession(page, "/session/demo?file=README.md");
    await page.getByRole("button", { name: "Toggle Panel" }).click();
    await expect(page.getByRole("region", { name: "Panel" })).toBeVisible();
    await page.keyboard.press("ControlOrMeta+k");
    await page.getByRole("dialog").getByRole("combobox").fill(">layout focus");
    await page.getByRole("option", { name: "Layout: Focus" }).click();
    await expect(page.getByRole("region", { name: "Panel" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Files" })).toHaveAttribute("aria-pressed", "false");
});
