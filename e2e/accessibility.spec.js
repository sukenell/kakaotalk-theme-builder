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

    for (const { key, title, hasClear, hasDetail, hasTint } of uploadRows) {
      const row = uploadControls.locator(`:scope > .upload-item[aria-labelledby="upload-title-${key}"]`);
      await expect(uploadControls.getByRole("group", { name: title, exact: true })).toHaveCount(1);
      await expect(row.getByRole("button", { name: `${title} 업로드`, exact: true })).toHaveCount(1);
      if (hasDetail) {
        await expect(row.getByRole("button", { name: `${title} 상세`, exact: true })).toHaveCount(1);
      }
      if (hasClear) {
        await expect(row.getByRole("button", { name: `${title} 삭제`, exact: true })).toHaveCount(1);
      }
      if (hasTint) {
        const tintCheckbox = row.getByRole("checkbox", { name: `${title} 색상 적용`, exact: true });
        await expect(tintCheckbox).toHaveCount(1);
        await expect(row.locator('.upload-tint-control input[type="color"]')).toHaveAccessibleName(`${title} 색상`);
        expect(await tintCheckbox.evaluate((element) => element.closest("label") === null)).toBe(true);
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
    buffer: Buffer.from([137, 80, 78, 71]),
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
    buffer: Buffer.from([137, 80, 78, 71]),
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
    buffer: Buffer.from([137, 80, 78, 71]),
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
