import { expect, test } from "@playwright/test";

async function waitForDictionary(page, url = "/") {
  await page.goto(url);
  await expect(page.locator(".result-card")).toHaveCount(6);
}

test("upgrades from a legacy cache-first controller without a second reload", async ({ page, context }) => {
  await page.goto("/__test__/release/legacy-install.html");
  const legacyScriptUrl = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.register("legacy-cache-sw.js", { scope: "./" });
    await navigator.serviceWorker.ready;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return registration.active?.scriptURL;
  });
  expect(legacyScriptUrl).toContain("legacy-cache-sw.js");
  await page.goto("/__test__/release/legacy-install.html?controlled=1");
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? "")).toContain(
    "legacy-cache-sw.js"
  );

  await waitForDictionary(page, "/__test__/release/");
  await expect(page.locator("body")).not.toHaveAttribute("data-legacy-app", "true");
  await expect(page.locator(".category-badge").first()).toHaveAttribute("data-category", /.+/);
  await expect(page.locator(".title-text")).toHaveCSS("font-family", /Noto Serif KR/);
  await expect(page.locator('link[rel="stylesheet"]')).toHaveAttribute("href", /[?&]v=/);
  await expect(page.locator('script[type="module"]')).toHaveAttribute("src", /[?&]v=/);

  await page.waitForFunction(() => {
    const controllerUrl = navigator.serviceWorker.controller?.scriptURL;
    return Boolean(controllerUrl && new URL(controllerUrl).pathname.endsWith("/sw.js") && !controllerUrl.includes("legacy"));
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".result-card")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "검색 결과" })).toBeVisible();
  await context.setOffline(false);
});

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

test("warns but keeps six base cards when an optional dictionary returns 404", async ({ page }) => {
  await page.route(/\/data\/supplemental-words\.json(?:\?.*)?$/, (route) =>
    route.fulfill({
      status: 404,
      contentType: "text/plain; charset=utf-8",
      body: "Not found"
    })
  );

  await page.goto("/");

  await expect(page.locator(".result-card")).toHaveCount(6);
  await expect(page.locator("#data-warning")).toHaveText(
    "일부 확장 자료를 불러오지 못했지만 기본 영단어 검색은 사용할 수 있습니다."
  );
  await expect(page.locator(".load-failure")).toHaveCount(0);
});

test("warns without showing fatal recovery when optional JSON has an invalid shape", async ({ page }) => {
  await page.route(/\/data\/textbook-expressions\.json(?:\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({ stats: {}, words: null })
    })
  );

  await page.goto("/");

  await expect(page.locator(".result-card")).toHaveCount(6);
  await expect(page.locator("#data-warning")).toHaveText(
    "일부 확장 자료를 불러오지 못했지만 기본 영단어 검색은 사용할 수 있습니다."
  );
  await expect(page.locator(".load-failure")).toHaveCount(0);
});

test("moves focus to the first newly revealed card after the final load-more page", async ({ page }) => {
  await waitForDictionary(page);

  const searchInput = page.getByLabel("검색어");
  await searchInput.fill("kn");
  await expect(page.locator(".result-card")).toHaveCount(6);

  const loadMoreButton = page.getByRole("button", { name: "결과 12개 더 보기" });
  await loadMoreButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator(".result-card")).toHaveCount(11);
  await expect(loadMoreButton).toBeHidden();
  await expect(page.locator(".result-card").nth(6)).toBeFocused();
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
