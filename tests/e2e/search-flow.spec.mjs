import { expect, test } from "@playwright/test";

async function waitForDictionary(page) {
  await page.goto("/");
  await expect(page.locator(".result-card")).toHaveCount(6);
}

test("keeps the search-first dictionary flow accessible", async ({ page }) => {
  await waitForDictionary(page);
  await expect(page.getByRole("heading", { name: "단어 검색" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "검색 결과" })).toBeVisible();

  const searchInput = page.getByLabel("검색어");
  await searchInput.fill("유산");
  await expect(page.locator(".word-title").first()).toHaveText("asset");

  await searchInput.fill("a");
  await expect(page.getByRole("status").filter({ hasText: "총" })).toContainText("1,596");
  await page.getByRole("button", { name: "결과 12개 더 보기" }).click();
  await expect(page.locator(".result-card")).toHaveCount(18);

  await searchInput.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(searchInput).toBeFocused();
  await expect(searchInput).toHaveCSS("outline-style", "solid");
});

test("keeps the mobile first screen compact without horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only layout contract");

  await waitForDictionary(page);
  const layout = await page.evaluate(() => ({
    documentHeight: document.documentElement.scrollHeight,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    searchTop: document.querySelector(".search-panel").getBoundingClientRect().top
  }));

  expect(layout.horizontalOverflow).toBe(false);
  expect(layout.searchTop).toBeLessThanOrEqual(320);
  expect(layout.documentHeight).toBeLessThan(5000);
});
