import { expect, test as base } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { IMAGE_TARGETS } from "../src/theme-model.js";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const allowedBrowserDiagnostics = new WeakMap();

function allowBrowserDiagnostic(page, message) {
  const allowlist = allowedBrowserDiagnostics.get(page) ?? new Set();
  allowlist.add(message);
  allowedBrowserDiagnostics.set(page, allowlist);
}

const test = base.extend({
  page: async ({ page }, use) => {
    const diagnostics = [];
    const recordDiagnostic = (kind, message) => {
      if (!allowedBrowserDiagnostics.get(page)?.has(message)) {
        diagnostics.push(`${kind}: ${message}`);
      }
    };

    page.on("console", (message) => {
      if (message.type() === "error") {
        recordDiagnostic("console.error", message.text());
      }
    });
    page.on("pageerror", (error) => recordDiagnostic("pageerror", error.message));

    await use(page);

    expect(diagnostics, "unexpected browser console/page errors").toEqual([]);
  },
});

async function installLiveRegionRecorder(page) {
  await page.evaluate(() => {
    window.__liveRegionMutations = { status: [], alert: [] };
    for (const [key, selector] of [["status", "#status-text"], ["alert", "#error-status"]]) {
      const element = document.querySelector(selector);
      new MutationObserver(() => {
        window.__liveRegionMutations[key].push(element.textContent);
      }).observe(element, { childList: true, characterData: true, subtree: true });
    }
  });
}

async function liveMessageCount(page, channel, message) {
  return page.evaluate(
    ({ channel, message }) => window.__liveRegionMutations[channel].filter((value) => value === message).length,
    { channel, message },
  );
}

async function createPngBuffer(page, width, height) {
  const base64 = await page.evaluate(async ({ width, height }) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#f78da7";
    context.fillRect(0, 0, width, height);
    return canvas.toDataURL("image/png").split(",")[1];
  }, { width, height });

  return Buffer.from(base64, "base64");
}

async function delayImageBitmapForFile(page, fileName) {
  await page.addInitScript((delayedFileName) => {
    const originalCreateImageBitmap = window.createImageBitmap.bind(window);
    const originalClose = window.ImageBitmap.prototype.close;

    window.ImageBitmap.prototype.close = function (...args) {
      if (this === window.__delayedImageBitmap) {
        window.__delayedImageBitmapClosed = true;
      }
      return originalClose.apply(this, args);
    };

    window.createImageBitmap = (source, ...args) => {
      if (!(source instanceof File) || source.name !== delayedFileName) {
        return originalCreateImageBitmap(source, ...args);
      }

      window.__delayedImageBitmapStarted = true;
      return new Promise((resolve, reject) => {
        window.__releaseDelayedImageBitmap = async () => {
          try {
            const image = await originalCreateImageBitmap(source, ...args);
            window.__delayedImageBitmap = image;
            resolve(image);
          } catch (error) {
            reject(error);
          }
        };
      });
    };
  }, fileName);
}

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
  await expect(themeId).toHaveAccessibleDescription("영문자만 입력해 주세요.");
  await expect(themeId).toHaveAttribute("required", "");
  await expect(version).toHaveAccessibleName("버전");
  await expect(version).toHaveAccessibleDescription("숫자.숫자.숫자 형식으로 입력해 주세요.");
  await expect(version).toHaveAttribute("required", "");
  await expect(author).toHaveAccessibleName("제작자");
});

test("@task1 keeps version and author input borders aligned", async ({ page }) => {
  await page.goto("/");

  const versionBox = await page.locator("#version").boundingBox();
  const authorBox = await page.locator(".author-input").boundingBox();

  expect(versionBox).not.toBeNull();
  expect(authorBox).not.toBeNull();
  expect(Math.abs(versionBox.y - authorBox.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(versionBox.height - authorBox.height)).toBeLessThanOrEqual(5);
});

test("@task1 gives download buttons exact platform-specific accessible names", async ({ page }) => {
  await page.goto("/");

  const iosDownload = page.getByRole("button", { name: "iOS 테마 다운로드", exact: true });
  const androidDownload = page.getByRole("button", { name: "Android 소스 다운로드", exact: true });

  await expect(iosDownload).toHaveText("IOS");
  await expect(androidDownload).toHaveText("Android");
});

test("@task3 retains raw invalid theme metadata and exposes field-specific native errors", async ({ page }) => {
  await page.goto("/");

  const themeId = page.locator("#theme-id-segment");
  const version = page.locator("#version");
  const themeIdError = page.locator("#theme-id-error");
  const versionError = page.locator("#version-error");
  const downloadButtons = page.locator("#download-ios, #download-android");

  await themeId.fill(" 테마1 ");
  await expect(themeId).toHaveValue(" 테마1 ");
  expect(await themeId.evaluate((input) => document.activeElement === input)).toBe(true);
  await expect(themeId).toHaveAttribute("aria-invalid", "true");
  await expect(themeId).toHaveAttribute("aria-errormessage", "theme-id-error");
  await expect(themeId).toHaveAttribute("aria-describedby", "theme-id-help");
  await expect(themeIdError).toBeVisible();
  await expect(themeIdError).toHaveText("테마 ID는 영문자만 입력해 주세요.");
  expect(await themeId.evaluate((input) => ({ valid: input.checkValidity(), patternMismatch: input.validity.patternMismatch }))).toEqual({
    valid: false,
    patternMismatch: true,
  });

  await version.fill(" 1.2.3 ");
  await expect(version).toHaveValue(" 1.2.3 ");
  expect(await version.evaluate((input) => document.activeElement === input)).toBe(true);
  await expect(version).toHaveAttribute("aria-invalid", "true");
  await expect(version).toHaveAttribute("aria-errormessage", "version-error");
  await expect(version).toHaveAttribute("aria-describedby", "version-help");
  await expect(versionError).toBeVisible();
  await expect(versionError).toHaveText("버전은 숫자.숫자.숫자 형식으로 입력해 주세요.");
  expect(await version.evaluate((input) => ({ valid: input.checkValidity(), patternMismatch: input.validity.patternMismatch }))).toEqual({
    valid: false,
    patternMismatch: true,
  });
  for (const button of await downloadButtons.all()) {
    await expect(button).toBeDisabled();
  }

  const statusBeforeBlockedDownload = await page.locator("#status-text").textContent();
  await page.locator("#download-ios").evaluate((button) => {
    button.disabled = false;
    button.click();
  });
  await expect(page.locator(".download-actions")).not.toHaveAttribute("aria-busy", "true");
  await expect(page.locator("#status-text")).toHaveText(statusBeforeBlockedDownload);
});

test("@task3 clears field errors after valid recovery and handles empty required values precisely", async ({ page }) => {
  await page.goto("/");

  const themeId = page.locator("#theme-id-segment");
  const version = page.locator("#version");
  const downloadButtons = page.locator("#download-ios, #download-android");

  await themeId.fill("");
  await version.fill("");
  await expect(page.locator("#theme-id-error")).toHaveText("테마 ID를 입력해 주세요.");
  await expect(page.locator("#version-error")).toHaveText("버전을 입력해 주세요.");
  expect(await themeId.evaluate((input) => input.validity.valueMissing)).toBe(true);
  expect(await version.evaluate((input) => input.validity.valueMissing)).toBe(true);
  for (const button of await downloadButtons.all()) {
    await expect(button).toBeDisabled();
  }

  await themeId.fill("Theme");
  await version.fill("2.10.0");
  await expect(themeId).toHaveValue("Theme");
  await expect(version).toHaveValue("2.10.0");
  await expect(themeId).not.toHaveAttribute("aria-invalid");
  await expect(version).not.toHaveAttribute("aria-invalid");
  await expect(themeId).not.toHaveAttribute("aria-errormessage");
  await expect(version).not.toHaveAttribute("aria-errormessage");
  await expect(page.locator("#theme-id-error")).toBeHidden();
  await expect(page.locator("#version-error")).toBeHidden();
  expect(await themeId.evaluate((input) => ({ valid: input.checkValidity(), customError: input.validity.customError }))).toEqual({
    valid: true,
    customError: false,
  });
  expect(await version.evaluate((input) => ({ valid: input.checkValidity(), customError: input.validity.customError }))).toEqual({
    valid: true,
    customError: false,
  });
  for (const button of await downloadButtons.all()) {
    await expect(button).toBeEnabled();
  }
});

test("@task3 preserves invalid HEX drafts through confirmation and rerender, then recovers", async ({ page }) => {
  await page.goto("/");

  const colorRow = () => page.locator(".color-row").filter({ has: page.locator("#color-label-mainBackground") });
  await colorRow().locator(".color-picker-control").click();
  let hexInput = colorRow().locator("#color-hex-mainBackground");
  const originalColor = await colorRow().locator("#color-value-mainBackground").textContent();

  await hexInput.fill("#12GG");
  await expect(hexInput).toHaveValue("#12GG");
  await expect(colorRow().locator("#color-value-mainBackground")).toHaveText(originalColor);
  await hexInput.press("Enter");
  await expect(hexInput).toHaveValue("#12GG");
  expect(await hexInput.evaluate((input) => document.activeElement === input)).toBe(true);
  await expect(hexInput).toHaveAttribute("aria-invalid", "true");
  await expect(hexInput).toHaveAttribute("aria-errormessage", "color-hex-error-mainBackground");
  await expect(colorRow().locator("#color-hex-error-mainBackground")).toBeVisible();
  await expect(colorRow().locator("#color-hex-error-mainBackground")).toHaveText(
    "HEX 색상은 #RRGGBB 또는 #AARRGGBB 형식으로 입력해 주세요.",
  );

  await page.getByRole("tab", { name: "채팅방", exact: true }).click();
  hexInput = colorRow().locator("#color-hex-mainBackground");
  await expect(hexInput).toHaveValue("#12GG");
  await expect(hexInput).toHaveAttribute("aria-invalid", "true");
  await expect(colorRow().locator("#color-hex-error-mainBackground")).toBeVisible();

  await colorRow().locator(".color-picker-control").click();
  await hexInput.fill("not-a-color");
  await page.locator("#theme-id-segment").click();
  await expect(hexInput).toHaveValue("not-a-color");
  await expect(hexInput).toHaveAttribute("aria-invalid", "true");
  await expect(colorRow().locator("#color-hex-error-mainBackground")).toBeVisible();

  await colorRow().locator(".color-picker-control").click();
  await hexInput.fill("#123456");
  await expect(colorRow().locator("#color-value-mainBackground")).toHaveText("#123456");
  await expect(hexInput).not.toHaveAttribute("aria-invalid");
  await expect(hexInput).not.toHaveAttribute("aria-errormessage");
  await expect(colorRow().locator("#color-hex-error-mainBackground")).toBeHidden();
  expect(await hexInput.evaluate((input) => ({ valid: input.checkValidity(), customError: input.validity.customError }))).toEqual({
    valid: true,
    customError: false,
  });
});

test("@task3 reannounces repeated upload success and decode failure without losing state or focus", async ({ page }) => {
  await page.goto("/");
  await installLiveRegionRecorder(page);

  const input = page.locator("#upload-input-mainBackground");
  const description = page.locator("#upload-description-mainBackground");
  const status = page.locator("#status-text");
  const alert = page.locator("#error-status");
  const successMessage = `${IMAGE_TARGETS.mainBackground.label} 반영`;
  const failureMessage = `${IMAGE_TARGETS.mainBackground.label} 이미지를 읽을 수 없습니다. PNG, JPEG 또는 WebP 파일을 다시 선택해 주세요.`;
  const goodFile = { name: "one-pixel.png", mimeType: "image/png", buffer: onePixelPng };
  const badFile = { name: "broken.png", mimeType: "image/png", buffer: Buffer.from("not an image") };

  await expect(status).toHaveAttribute("role", "status");
  await expect(status).toHaveAttribute("aria-live", "polite");
  await expect(status).toHaveAttribute("aria-atomic", "true");
  await expect(alert).toHaveAttribute("role", "alert");
  await expect(alert).toHaveAttribute("aria-atomic", "true");
  await expect(alert).toBeEmpty();

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await input.focus();
    await input.setInputFiles(goodFile);
    await expect.poll(() => liveMessageCount(page, "status", successMessage)).toBe(attempt);
    await expect(description).toContainText("선택한 파일: one-pixel.png");
    expect(await input.evaluate((element) => document.activeElement === element)).toBe(true);
    await expect(alert).toBeEmpty();
  }

  const goodBackground = await page.locator('[data-upload-thumb="mainBackground"]').evaluate(
    (element) => getComputedStyle(element).backgroundImage,
  );
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await input.focus();
    await input.setInputFiles(badFile);
    await expect.poll(() => liveMessageCount(page, "alert", failureMessage)).toBe(attempt);
    await expect(alert).toHaveText(failureMessage);
    await expect(description).toContainText("선택한 파일: one-pixel.png");
    await expect(page.locator('[data-upload-thumb="mainBackground"]')).toHaveCSS("background-image", goodBackground);
    expect(await input.evaluate((element) => document.activeElement === element)).toBe(true);
    expect(await input.evaluate((element) => ({ files: element.files.length, value: element.value }))).toEqual({
      files: 0,
      value: "",
    });
  }

  await page.getByRole("button", { name: "메인 배경 삭제", exact: true }).click();
  await expect(alert).toBeEmpty();
  await expect(status).toHaveText("메인 배경 삭제");
});

for (const downloadCase of [
  {
    platform: "iOS",
    button: "#download-ios",
    manifestKind: "ios",
    startMessage: "iOS 생성 중",
    successMessage: "iOS 다운로드 준비 완료",
    fileName: "나의-테마.ktheme",
  },
  {
    platform: "Android",
    button: "#download-android",
    manifestKind: "android",
    startMessage: "Android 생성 중",
    successMessage: "Android 다운로드 준비 완료",
    fileName: "나의-테마-android-source.zip",
  },
]) {
  test(`@task3 ${downloadCase.platform} download announces busy, start, and success`, async ({ page }) => {
    if (downloadCase.platform === "Android") {
      await page.addInitScript((pngBase64) => {
        const bytes = Uint8Array.from(atob(pngBase64), (character) => character.charCodeAt(0));
        HTMLCanvasElement.prototype.toBlob = function (callback) {
          callback(new Blob([bytes], { type: "image/png" }));
        };
      }, onePixelPng.toString("base64"));
    }

    const heldRoutes = [];
    await page.route("**/assets/template-manifest.json", async (route) => {
      await new Promise((resolve) => heldRoutes.push({ route, resolve }));
    });
    await page.goto("/");

    if (downloadCase.platform === "Android") {
      await page.getByRole("tab", { name: "로딩화면", exact: true }).click();
      await page.getByRole("button", { name: "테마 아이콘 삭제", exact: true }).click();
    }

    await installLiveRegionRecorder(page);
    await page.locator("#error-status").evaluate((element) => {
      element.textContent = "이전 오류";
    });
    const button = page.locator(downloadCase.button);
    const downloadPromise = page.waitForEvent("download");
    await button.focus();
    await button.click();

    await expect.poll(() => heldRoutes.length).toBe(1);
    await expect(page.locator(".download-actions")).toHaveAttribute("aria-busy", "true");
    await expect.poll(() => liveMessageCount(page, "status", downloadCase.startMessage)).toBe(1);
    await expect(page.locator("#status-text")).toHaveText(downloadCase.startMessage);
    await expect(page.locator("#error-status")).toBeEmpty();

    const held = heldRoutes.shift();
    await held.route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ios: [], android: [] }),
    });
    held.resolve();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(downloadCase.fileName);
    await expect.poll(() => liveMessageCount(page, "status", downloadCase.successMessage)).toBe(1);
    await expect(page.locator("#status-text")).toHaveText(downloadCase.successMessage);
    await expect(page.locator(".download-actions")).toHaveAttribute("aria-busy", "false");
    await expect(button).toBeEnabled();
    expect(await button.evaluate((element) => document.activeElement === element)).toBe(true);
  });
}

for (const failureCase of [
  {
    platform: "iOS",
    button: "#download-ios",
    startMessage: "iOS 생성 중",
    statusMessage: "iOS 생성 실패",
    alertMessage: "iOS 테마를 생성하지 못했습니다. 다시 시도해 주세요.",
  },
  {
    platform: "Android",
    button: "#download-android",
    startMessage: "Android 생성 중",
    statusMessage: "Android 생성 실패",
    alertMessage: "Android 소스를 생성하지 못했습니다. 다시 시도해 주세요.",
  },
]) {
  test(`@task3 ${failureCase.platform} download reannounces the same manifest failure twice`, async ({ page }) => {
    const heldRoutes = [];
    await page.route("**/assets/template-manifest.json", async (route) => {
      await new Promise((resolve) => heldRoutes.push({ route, resolve }));
    });
    await page.goto("/");
    await installLiveRegionRecorder(page);

    const button = page.locator(failureCase.button);
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await button.focus();
      await button.click();
      await expect.poll(() => heldRoutes.length).toBe(1);
      await expect(page.locator(".download-actions")).toHaveAttribute("aria-busy", "true");
      await expect.poll(() => liveMessageCount(page, "status", failureCase.startMessage)).toBe(attempt);

      const held = heldRoutes.shift();
      await held.route.fulfill({ status: 200, contentType: "application/json", body: "{" });
      held.resolve();

      await expect.poll(() => liveMessageCount(page, "status", failureCase.statusMessage)).toBe(attempt);
      await expect.poll(() => liveMessageCount(page, "alert", failureCase.alertMessage)).toBe(attempt);
      await expect(page.locator("#error-status")).toHaveText(failureCase.alertMessage);
      await expect(page.locator(".download-actions")).toHaveAttribute("aria-busy", "false");
      await expect(button).toBeEnabled();
      expect(await button.evaluate((element) => document.activeElement === element)).toBe(true);
    }
  });
}

for (const invalidationCase of [
  { platform: "iOS", button: "#download-ios", canceledMessage: "iOS 생성 취소" },
  { platform: "Android", button: "#download-android", canceledMessage: "Android 생성 취소" },
]) {
  test(`@task3 ${invalidationCase.platform} download revalidates metadata after awaited work`, async ({ page }) => {
    const heldRoutes = [];
    let downloadCount = 0;
    page.on("download", () => {
      downloadCount += 1;
    });
    await page.route("**/assets/template-manifest.json", async (route) => {
      await new Promise((resolve) => heldRoutes.push({ route, resolve }));
    });
    await page.goto("/");

    const button = page.locator(invalidationCase.button);
    await button.focus();
    await button.click();
    await expect.poll(() => heldRoutes.length).toBe(1);
    await expect(page.locator(".download-actions")).toHaveAttribute("aria-busy", "true");

    const version = page.locator("#version");
    await version.fill(" 1.2.3 ");
    await expect(version).toHaveValue(" 1.2.3 ");
    await expect(version).toHaveAttribute("aria-invalid", "true");

    const held = heldRoutes.shift();
    await held.route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ios: [], android: [] }),
    });
    held.resolve();

    await expect(page.locator("#status-text")).toHaveText(invalidationCase.canceledMessage);
    await expect(page.locator(".download-actions")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator("#error-status")).toBeEmpty();
    expect(downloadCount).toBe(0);
    expect(await version.evaluate((element) => document.activeElement === element)).toBe(true);
  });
}

test("@task2 gives every active preview upload and color row one contextual name", async ({ page }) => {
  await page.goto("/");

  const uploadControls = page.locator("#upload-controls");
  const mainBackgroundRow = uploadControls.getByRole("group", { name: "메인 배경", exact: true });
  await expect(mainBackgroundRow).toHaveCount(1);
  await expect(mainBackgroundRow).toHaveAttribute("aria-labelledby", "upload-title-mainBackground");
  await expect(mainBackgroundRow.locator("#upload-title-mainBackground")).toHaveText("메인 배경");
  await expect(mainBackgroundRow.locator(".upload-thumb")).toHaveAttribute("aria-hidden", "true");

  const uploadInput = mainBackgroundRow.getByRole("button", { name: "메인 배경 업로드", exact: true });
  await expect(uploadInput).toHaveCount(1);
  await expect(uploadInput).toHaveAttribute("id", "upload-input-mainBackground");
  await expect(uploadInput).toHaveAttribute("aria-describedby", "upload-description-mainBackground");
  await expect(uploadInput).toHaveAccessibleDescription(
    "IOS 1125x2250px Android 1440x2880px iOS / Android 적용 이미지 삭제됨",
  );
  await expect(mainBackgroundRow.locator('label[for="upload-input-mainBackground"]')).toHaveText("업로드");
  await expect(mainBackgroundRow.getByRole("button", { name: "메인 배경 삭제", exact: true })).toHaveCount(1);

  const previewTabs = page.locator('#preview-tabs > button[role="tab"]');
  const previewPageCount = await previewTabs.count();
  const checkedColorInputKeys = new Set();
  expect(previewPageCount).toBeGreaterThan(0);

  for (let pageIndex = 0; pageIndex < previewPageCount; pageIndex += 1) {
    await previewTabs.nth(pageIndex).click();

    const uploadRows = await uploadControls.locator(":scope > .upload-item").evaluateAll((rows) =>
      rows.map((row) => {
        const title = row.querySelector('[id^="upload-title-"]');
        return {
          key: title.id.replace("upload-title-", ""),
          title: title.textContent.trim(),
          accessibleTitle: title.getAttribute("aria-label") || title.textContent.trim(),
          hasClear: Boolean(row.querySelector("[data-upload-clear]")),
          hasDetail: Boolean(row.querySelector("[data-bubble-detail]")),
          hasTint: Boolean(row.querySelector(".upload-tint-control")),
        };
      }),
    );
    expect(new Set(uploadRows.map(({ key }) => key)).size).toBe(uploadRows.length);
    expect(new Set(uploadRows.map(({ title }) => title)).size).toBe(uploadRows.length);
    await expect(uploadControls.getByRole("group")).toHaveCount(uploadRows.length);
    await expect(uploadControls.getByRole("button", { name: "업로드", exact: true })).toHaveCount(0);
    await expect(uploadControls.getByRole("button", { name: "상세", exact: true })).toHaveCount(0);
    await expect(uploadControls.getByRole("button", { name: "삭제", exact: true })).toHaveCount(0);

    for (const { key, title, accessibleTitle, hasClear, hasDetail, hasTint } of uploadRows) {
      const row = uploadControls.locator(`:scope > .upload-item[aria-labelledby="upload-title-${key}"]`);
      expect(accessibleTitle).toBe(IMAGE_TARGETS[key].label);
      await expect(uploadControls.getByRole("group", { name: accessibleTitle, exact: true })).toHaveCount(1);
      await expect(row.getByRole("button", { name: `${accessibleTitle} 업로드`, exact: true })).toHaveCount(1);
      if (hasDetail) {
        await expect(row.getByRole("button", { name: `${accessibleTitle} 상세`, exact: true })).toHaveCount(1);
      }
      if (hasClear) {
        await expect(row.getByRole("button", { name: `${accessibleTitle} 삭제`, exact: true })).toHaveCount(1);
      }
      if (hasTint) {
        const tintCheckbox = row.getByRole("checkbox", { name: `${accessibleTitle} 색상 적용`, exact: true });
        await expect(tintCheckbox).toHaveCount(1);
        await expect(row.locator('.upload-tint-control input[type="color"]')).toHaveAccessibleName(`${accessibleTitle} 색상`);
        expect(await tintCheckbox.evaluate((element) => Boolean(element.closest("label")?.querySelector('input[type="color"]')))).toBe(false);
      }
    }

    const colorControlRoot = page.locator("#color-controls");
    const colorRows = await colorControlRoot.locator(":scope > .color-row").evaluateAll((rows) =>
      rows.map((row) => {
        const label = row.querySelector('[id^="color-label-"]');
        const key = label.id.replace("color-label-", "");
        return {
          key,
          label: label.textContent.trim(),
          value: row.querySelector(`#color-value-${key}`).textContent.trim(),
        };
      }),
    );
    expect(new Set(colorRows.map(({ key }) => key)).size).toBe(colorRows.length);

    for (const { key, label, value } of colorRows) {
      const row = colorControlRoot.locator(":scope > .color-row").filter({ has: page.locator(`#color-label-${key}`) });
      const picker = row.getByRole("button", { name: `${label} ${value}`, exact: true });
      await expect(picker).toHaveCount(1);
      await expect(row.getByRole("button", { name: `${label} 초기화`, exact: true })).toHaveCount(1);
      if (!checkedColorInputKeys.has(key)) {
        const hexInput = row.locator(`#color-hex-${key}`);
        const nativeColorInput = row.locator(`#color-${key}`);
        await picker.click();
        await expect(hexInput).toBeVisible();
        await expect(hexInput).toHaveAccessibleName(`${label} HEX 컬러 코드`);
        await expect(nativeColorInput).toHaveAccessibleName(`${label} 색상 선택`);
        expect(await hexInput.evaluate((element) => element.closest("label") === null)).toBe(true);
        expect(await nativeColorInput.evaluate((element) => element.closest("label") === null)).toBe(true);
        await page.keyboard.press("Escape");
        checkedColorInputKeys.add(key);
      }
    }
  }
});

test("@task2 uses valid full-text naming nodes for compact tab icon rows", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page })
    .include("#upload-controls")
    .withRules(["aria-prohibited-attr"])
    .analyze();
  expect(results.violations).toEqual([]);
  await expect(page.locator("#upload-controls strong[aria-label]")).toHaveCount(0);

  for (const [key, visibleTitle] of [
    ["tabFriendIcon", "친구1"],
    ["tabFriendIconSelected", "친구2"],
  ]) {
    const semanticTitle = IMAGE_TARGETS[key].label;
    const row = page.locator(`#upload-controls > .upload-item[aria-labelledby="upload-title-${key}"]`);
    const namingNode = row.locator(`#upload-title-${key}`);
    const visibleNode = row.locator(".upload-visible-title");

    await expect(visibleNode).toHaveText(visibleTitle);
    await expect(visibleNode).toHaveAttribute("aria-hidden", "true");
    await expect(namingNode).toHaveText(semanticTitle);
    await expect(namingNode).not.toHaveAttribute("aria-label");
    await expect(row).toHaveAccessibleName(semanticTitle);
    await expect(row.locator(`#upload-input-${key}`)).toHaveAccessibleName(`${semanticTitle} 업로드`);
    await expect(row.getByRole("checkbox", { name: `${semanticTitle} 색상 적용`, exact: true })).toHaveCount(1);
    await expect(row.locator('input[type="color"]')).toHaveAccessibleName(`${semanticTitle} 색상`);
  }

});

test("@task2 keeps color control names independent and updates the picker HEX name", async ({ page }) => {
  await page.goto("/");

  const row = page.locator(".color-row").filter({ has: page.locator("#color-label-mainBackground") });
  const picker = row.getByRole("button", { name: "배경 색 #FFDEDE", exact: true });
  const pickerControl = row.locator(".color-picker-control");
  await expect(picker).toHaveCount(1);
  await expect(picker).toHaveAttribute("aria-labelledby", "color-label-mainBackground color-value-mainBackground");
  await expect(row.getByRole("button", { name: "배경 색 초기화", exact: true })).toHaveCount(1);

  await picker.click();
  const hexInput = row.getByRole("textbox", { name: "배경 색 HEX 컬러 코드", exact: true });
  const nativeColorInput = row.locator("#color-mainBackground");
  await expect(hexInput).toHaveCount(1);
  await expect(nativeColorInput).toHaveAccessibleName("배경 색 색상 선택");
  expect(await hexInput.evaluate((element) => element.closest("label") === null)).toBe(true);
  expect(await nativeColorInput.evaluate((element) => element.closest("label") === null)).toBe(true);

  await hexInput.fill("#123456");
  await expect(pickerControl).toHaveAccessibleName("배경 색 #123456");
  await expect(row.locator("#color-value-mainBackground")).toHaveText("#123456");
});

test("@task2 keeps uploaded filename state through upload-panel rerenders", async ({ page }) => {
  await page.goto("/");

  const uploadInput = page.locator("#upload-input-mainBackground");
  await uploadInput.setInputFiles({
    name: "pink-background.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });
  await expect(page.locator("#upload-description-mainBackground")).toContainText("선택한 파일: pink-background.png");

  await page.getByRole("tab", { name: "채팅방", exact: true }).click();
  await expect(page.locator("#upload-input-mainBackground")).toHaveCount(0);
  await page.getByRole("tab", { name: "대화 목록", exact: true }).click();
  await expect(page.locator("#upload-description-mainBackground")).toContainText("선택한 파일: pink-background.png");

  await page.getByRole("button", { name: "메인 배경 삭제", exact: true }).click();
  await expect(page.locator("#upload-description-mainBackground")).toContainText("이미지 삭제됨");
  await expect(page.locator("#upload-description-mainBackground")).not.toContainText("pink-background.png");
});

test("@task2 ignores a delayed replacement upload after the row is deleted", async ({ page }) => {
  await page.addInitScript(() => {
    const originalArrayBuffer = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function (...args) {
      if (this.name !== "delayed-replacement.png") {
        return originalArrayBuffer.apply(this, args);
      }

      const file = this;
      window.__delayedUploadStarted = true;
      return new Promise((resolve) => {
        window.__releaseDelayedUpload = async () => {
          resolve(await originalArrayBuffer.call(file));
          await new Promise((nextFrame) => requestAnimationFrame(() => requestAnimationFrame(nextFrame)));
        };
      });
    };
  });
  await page.goto("/");

  const uploadInput = page.locator("#upload-input-mainBackground");
  const file = {
    name: "pink-background.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  };
  await uploadInput.setInputFiles(file);
  await expect(page.locator("#upload-description-mainBackground")).toContainText(file.name);

  await uploadInput.setInputFiles({ ...file, name: "delayed-replacement.png" });
  await expect.poll(() => page.evaluate(() => window.__delayedUploadStarted)).toBe(true);
  await page.getByRole("button", { name: "메인 배경 삭제", exact: true }).click();
  await expect(page.locator("#upload-description-mainBackground")).toContainText("이미지 삭제됨");

  await page.evaluate(() => window.__releaseDelayedUpload());
  await expect(page.locator("#upload-description-mainBackground")).toContainText("이미지 삭제됨");
  await expect(page.locator("#upload-description-mainBackground")).not.toContainText("delayed-replacement.png");
  await expect(page.getByRole("button", { name: "메인 배경 삭제", exact: true })).toBeDisabled();
});

test("@task2 clears the live native file selection and accepts the same file again", async ({ page }) => {
  await page.goto("/");

  const uploadInput = page.locator("#upload-input-mainBackground");
  const file = {
    name: "same-background.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  };
  await uploadInput.setInputFiles(file);
  await expect(page.locator("#upload-description-mainBackground")).toContainText(file.name);

  const clearButton = page.getByRole("button", { name: "메인 배경 삭제", exact: true });
  await clearButton.click();
  expect(await uploadInput.evaluate((element) => document.activeElement === element)).toBe(true);
  await expect(page.locator("#upload-description-mainBackground")).toContainText("이미지 삭제됨");
  expect(await uploadInput.evaluate((input) => ({ files: input.files.length, value: input.value }))).toEqual({
    files: 0,
    value: "",
  });

  await uploadInput.setInputFiles(file);
  await expect(page.locator("#upload-description-mainBackground")).toContainText(file.name);
  await expect(clearButton).toBeEnabled();
});

test("@task2 reaches the clipped file input by Tab and keeps a visible focus path after cancel", async ({ page }) => {
  await page.goto("/");

  const guideLink = page.getByRole("link", { name: "공식 가이드 파일 다운로드", exact: true });
  for (let tabCount = 0; tabCount < 40; tabCount += 1) {
    await page.keyboard.press("Tab");
    if (await guideLink.evaluate((element) => document.activeElement === element)) {
      break;
    }
  }
  expect(await guideLink.evaluate((element) => document.activeElement === element)).toBe(true);

  await page.keyboard.press("Tab");
  const uploadInput = page.locator("#upload-input-mainBackground");
  expect(await uploadInput.evaluate((element) => document.activeElement === element)).toBe(true);

  const fileButton = page.locator('label.file-button[for="upload-input-mainBackground"]');
  const focusAppearance = await fileButton.evaluate((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    const inputBounds = element.querySelector("input").getBoundingClientRect();
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      width: bounds.width,
      height: bounds.height,
      inputWidth: inputBounds.width,
      inputHeight: inputBounds.height,
    };
  });
  expect(focusAppearance).toMatchObject({
    outlineStyle: "solid",
    outlineWidth: "3px",
    outlineColor: "rgb(7, 92, 82)",
  });
  expect(focusAppearance.width).toBeGreaterThan(40);
  expect(focusAppearance.height).toBeGreaterThanOrEqual(34);
  expect(focusAppearance.inputWidth).toBeLessThanOrEqual(1);
  expect(focusAppearance.inputHeight).toBeLessThanOrEqual(1);

  await page.keyboard.press("Tab");
  const nextUploadInput = page.getByRole("button", { name: "탭 배경 업로드", exact: true });
  expect(await nextUploadInput.evaluate((element) => document.activeElement === element)).toBe(true);

  await page.keyboard.press("Shift+Tab");
  const chooserPromise = page.waitForEvent("filechooser");
  await page.keyboard.press("Space");
  const chooser = await chooserPromise;
  await chooser.setFiles([]);
  expect(await uploadInput.evaluate((element) => document.activeElement === element)).toBe(true);

  await page.keyboard.press("Tab");
  expect(await nextUploadInput.evaluate((element) => document.activeElement === element)).toBe(true);

  const pointerChooserPromise = page.waitForEvent("filechooser");
  await fileButton.click();
  const pointerChooser = await pointerChooserPromise;
  await pointerChooser.setFiles([]);
  expect(await uploadInput.evaluate((element) => document.activeElement === element)).toBe(true);
  await expect(fileButton).toHaveCSS("outline-width", "3px");
  await expect(fileButton).toHaveCSS("outline-color", "rgb(7, 92, 82)");

  await page.keyboard.press("Tab");
  expect(await nextUploadInput.evaluate((element) => document.activeElement === element)).toBe(true);
});

test("@task2 commits a delayed tab icon selection after a tint refresh", async ({ page }) => {
  const fileName = "custom-friend.png";
  await delayImageBitmapForFile(page, fileName);
  await page.goto("/");

  const input = page.locator("#upload-input-tabFriendIcon");
  await input.setInputFiles({
    name: fileName,
    mimeType: "image/png",
    buffer: await createPngBuffer(page, 114, 114),
  });
  await expect.poll(() => page.evaluate(() => window.__delayedImageBitmapStarted)).toBe(true);

  await page.locator('[aria-labelledby="upload-title-tabFriendIcon"] input[type="checkbox"]').check();
  await expect(page.locator('[data-upload-thumb="tabFriendIcon"]')).toHaveCSS("background-image", /blob:/);

  await page.evaluate(() => window.__releaseDelayedImageBitmap());
  await expect.poll(() => page.evaluate(() => window.__delayedImageBitmapClosed)).toBe(true);
  await expect(page.locator("#upload-description-tabFriendIcon")).toContainText(`선택한 파일: ${fileName}`);
  expect(await input.evaluate((element) => element.files?.[0]?.name)).toBe(fileName);
});

test("@task2 invalidates a pending default tint render when tint is disabled", async ({ page }) => {
  await page.addInitScript(() => {
    const originalCreateImageBitmap = window.createImageBitmap.bind(window);
    const originalClose = window.ImageBitmap.prototype.close;

    window.ImageBitmap.prototype.close = function (...args) {
      if (this === window.__delayedDefaultTintBitmap) {
        window.__delayedDefaultTintBitmapClosed = true;
      }
      return originalClose.apply(this, args);
    };

    window.createImageBitmap = (source, ...args) => {
      if (
        !window.__holdNextDefaultTintBitmap ||
        window.__delayedDefaultTintBitmapStarted ||
        !(source instanceof Blob) ||
        source instanceof File
      ) {
        return originalCreateImageBitmap(source, ...args);
      }

      window.__delayedDefaultTintBitmapStarted = true;
      return new Promise((resolve, reject) => {
        window.__releaseDelayedDefaultTintBitmap = async () => {
          try {
            const image = await originalCreateImageBitmap(source, ...args);
            window.__delayedDefaultTintBitmap = image;
            resolve(image);
          } catch (error) {
            reject(error);
          }
        };
      });
    };
  });
  await page.goto("/");

  const row = page.locator('[aria-labelledby="upload-title-tabFriendIcon"]');
  const checkbox = row.getByRole("checkbox", { name: "친구 탭 아이콘 - 기본 색상 적용", exact: true });
  const tintColor = row.locator('input[type="color"]');
  const thumb = row.locator('[data-upload-thumb="tabFriendIcon"]');
  const initialBackgroundImage = await thumb.evaluate((element) => getComputedStyle(element).backgroundImage);

  await page.evaluate(() => {
    window.__holdNextDefaultTintBitmap = true;
  });
  await checkbox.check();
  await expect.poll(
    () => page.evaluate(() => window.__delayedDefaultTintBitmapStarted),
    { timeout: 5_000 },
  ).toBe(true);

  await checkbox.uncheck();
  await expect(checkbox).not.toBeChecked();
  await expect(tintColor).toBeDisabled();

  await page.evaluate(() => window.__releaseDelayedDefaultTintBitmap());
  await expect.poll(
    () => page.evaluate(() => window.__delayedDefaultTintBitmapClosed),
    { timeout: 5_000 },
  ).toBe(true);
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));

  await expect(checkbox).not.toBeChecked();
  await expect(tintColor).toBeDisabled();
  await expect(page.locator("#upload-description-tabFriendIcon")).toContainText("기본 이미지");
  await expect(thumb).toHaveCSS("background-image", initialBackgroundImage);
});

test("@task2 ignores stale bubble layout changes from an older decoded upload", async ({ page }) => {
  const olderFileName = "older-360.png";
  const newerFileName = "newer-120x105.png";
  await delayImageBitmapForFile(page, olderFileName);
  await page.goto("/");
  await page.getByRole("tab", { name: "채팅방", exact: true }).click();

  const input = page.locator("#upload-input-sendBubbleNormal");
  await input.setInputFiles({
    name: olderFileName,
    mimeType: "image/png",
    buffer: await createPngBuffer(page, 360, 360),
  });
  await expect.poll(() => page.evaluate(() => window.__delayedImageBitmapStarted)).toBe(true);

  await input.setInputFiles({
    name: newerFileName,
    mimeType: "image/png",
    buffer: await createPngBuffer(page, 120, 105),
  });
  await expect(page.locator("#upload-description-sendBubbleNormal")).toContainText(newerFileName);

  const detailButton = page.getByRole("button", { name: "나의 말풍선 - 기본 상세", exact: true });
  await detailButton.click();
  const stretchStart = page.locator('input[data-nine-patch-field="stretchX"][data-nine-patch-index="0"]');
  await expect(stretchStart).toHaveAttribute("max", "41");

  await page.evaluate(() => window.__releaseDelayedImageBitmap());
  await expect.poll(() => page.evaluate(() => window.__delayedImageBitmapClosed)).toBe(true);
  await detailButton.click();
  await expect(page.locator("#upload-description-sendBubbleNormal")).toContainText(newerFileName);
  await expect(stretchStart).toHaveAttribute("max", "41");
});

test("@task2 preserves a nine-patch edit made while a bubble upload is rendering", async ({ page }) => {
  await page.addInitScript(() => {
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      if (!window.__holdNextCanvasBlob || window.__delayedCanvasBlobStarted) {
        return originalToBlob.call(this, callback, ...args);
      }

      const canvas = this;
      window.__delayedCanvasBlobStarted = true;
      window.__releaseDelayedCanvasBlob = () => originalToBlob.call(canvas, callback, ...args);
      return undefined;
    };
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "채팅방", exact: true }).click();
  await page.evaluate(() => {
    window.__holdNextCanvasBlob = true;
  });

  const fileName = "pending-bubble.png";
  await page.locator("#upload-input-sendBubbleNormal").setInputFiles({
    name: fileName,
    mimeType: "image/png",
    buffer: await createPngBuffer(page, 120, 105),
  });
  await expect.poll(() => page.evaluate(() => window.__delayedCanvasBlobStarted)).toBe(true);

  const detailButton = page.getByRole("button", { name: "나의 말풍선 - 기본 상세", exact: true });
  await detailButton.click();
  const stretchStart = page.locator('input[data-nine-patch-field="stretchX"][data-nine-patch-index="0"]');
  await stretchStart.evaluate((input) => {
    input.value = "10";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(stretchStart).toHaveValue("10");

  await page.evaluate(() => window.__releaseDelayedCanvasBlob());
  await expect(page.locator("#upload-description-sendBubbleNormal")).toContainText(fileName);
  await detailButton.click();
  await expect(stretchStart).toHaveValue("10");
});

test("@task2 gives the tint checkbox a separate full-height pointer target", async ({ page }) => {
  await page.goto("/");

  const row = page.locator('[aria-labelledby="upload-title-tabFriendIcon"]');
  const checkbox = row.getByRole("checkbox", { name: "친구 탭 아이콘 - 기본 색상 적용", exact: true });
  const checkboxLabel = row.locator("label.upload-tint-checkbox-label");
  await expect(checkboxLabel).toHaveCount(1);
  expect(await checkboxLabel.locator('input[type="checkbox"]').count()).toBe(1);
  expect(await checkboxLabel.locator('input[type="color"]').count()).toBe(0);

  const labelBox = await checkboxLabel.boundingBox();
  const checkboxBox = await checkbox.boundingBox();
  expect(labelBox.height).toBeGreaterThanOrEqual(34);
  expect(labelBox.width).toBeGreaterThan(checkboxBox.width + 6);
  const clickPosition = { x: 2, y: labelBox.height / 2 };
  expect(labelBox.x + clickPosition.x).toBeLessThan(checkboxBox.x);
  await checkboxLabel.click({ position: clickPosition });
  await expect(checkbox).toBeChecked();
});

test("@task2 keeps a long valid upload filename inside its row", async ({ page }) => {
  await page.goto("/");

  const fileName = `${"a".repeat(220)}.png`;
  await page.locator("#upload-input-mainBackground").setInputFiles({
    name: fileName,
    mimeType: "image/png",
    buffer: await createPngBuffer(page, 16, 16),
  });
  const row = page.getByRole("group", { name: "메인 배경", exact: true });
  const state = row.locator('[data-upload-state="mainBackground"]');
  await expect(state).toContainText(fileName);

  const geometry = await row.evaluate((element) => {
    const state = element.querySelector('[data-upload-state="mainBackground"]');
    const actions = element.querySelector(".upload-actions");
    const stateBounds = state.getBoundingClientRect();
    const actionsBounds = actions.getBoundingClientRect();
    const rowBounds = element.getBoundingClientRect();
    const panelBounds = element.closest(".upload-controls").getBoundingClientRect();
    const style = getComputedStyle(state);
    return {
      stateRight: stateBounds.right,
      actionsLeft: actionsBounds.left,
      rowRight: rowBounds.right,
      panelRight: panelBounds.right,
      overflowX: style.overflowX,
      whiteSpace: style.whiteSpace,
      textOverflow: style.textOverflow,
      clientWidth: state.clientWidth,
      scrollWidth: state.scrollWidth,
    };
  });
  expect(geometry.stateRight).toBeLessThanOrEqual(geometry.actionsLeft + 1);
  expect(geometry.rowRight).toBeLessThanOrEqual(geometry.panelRight + 1);
  expect(geometry).toMatchObject({
    overflowX: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  });
  expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
});
