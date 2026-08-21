import { expect, test } from "@playwright/test";

test("@task0 loads the builder", async ({ page }) => {
  const stylesheetResponse = page.waitForResponse((response) => response.url().endsWith("/styles.css"));

  await page.goto("/");

  await expect(page).toHaveTitle("카톡 테마 만들기 by reha");
  await expect(page.locator("main")).toBeVisible();
  expect((await stylesheetResponse).status()).toBe(200);
});
