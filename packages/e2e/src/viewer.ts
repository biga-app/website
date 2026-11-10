import { expect, type Page } from "@playwright/test";

export async function openSession(page: Page, path: string): Promise<void> {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("treeitem").first()).toBeVisible();
}

export async function editorReady(page: Page): Promise<void> {
    await expect(page.locator(".monaco-editor .view-line").first()).toBeVisible({ timeout: 30_000 });
}
