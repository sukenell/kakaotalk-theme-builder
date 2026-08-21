import { expect, test } from "@playwright/test";

test("@task0 loads the builder", async ({ page }) => {
  const stylesheetResponse = page.waitForResponse((response) => response.url().endsWith("/styles.css"));

  await page.goto("/");

  await expect(page).toHaveTitle("카톡 테마 만들기 by reha");
  await expect(page.locator("main")).toBeVisible();
  expect((await stylesheetResponse).status()).toBe(200);
});

test("@task1 exposes one page heading and three named regions", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "카톡 테마 만들기 by reha", exact: true })).toHaveCount(1);

  for (const name of ["테마 설정", "이미지 업로드", "테마 미리보기"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toHaveCount(1);
    await expect(page.getByRole("region", { name, exact: true })).toHaveCount(1);
  }
});

test("@task1 labels theme metadata without adding help copy to accessible names", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("group", { name: "테마 정보", exact: true })).toHaveCount(1);

  const themeId = page.getByRole("textbox", { name: "테마 ID", exact: true });
  const version = page.getByRole("textbox", { name: "버전", exact: true });
  const author = page.getByRole("textbox", { name: "제작자", exact: true });

  await expect(themeId).toHaveAccessibleName("테마 ID");
  await expect(themeId).toHaveAccessibleDescription(/영문자/);
  await expect(themeId).toHaveAttribute("required", "");
  await expect(version).toHaveAccessibleName("버전");
  await expect(version).toHaveAccessibleDescription(/숫자\.숫자\.숫자/);
  await expect(version).toHaveAttribute("required", "");
  await expect(author).toHaveAccessibleName("제작자");
});

test("@task1 gives download buttons exact platform-specific accessible names", async ({ page }) => {
  await page.goto("/");

  const iosDownload = page.getByRole("button", { name: "iOS 테마 다운로드", exact: true });
  const androidDownload = page.getByRole("button", { name: "Android 소스 다운로드", exact: true });

  await expect(iosDownload).toHaveText("IOS");
  await expect(androidDownload).toHaveText("Android");
});
