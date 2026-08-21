import { expect, test as base } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import {
  CONTRAST_CONTEXTS,
  compositeColors,
  contrastRatio,
  evaluateContrastContext,
  evaluateThemeContrast,
  parseCssHex,
  parseThemeArgb,
} from "../src/color-contrast.js";
import { defaultThemeState, IMAGE_TARGETS } from "../src/theme-model.js";
import { PREVIEW_PAGES } from "../src/preview-pages.js";

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

async function nonEmptyLiveMessages(page, channel) {
  return page.evaluate(
    (selectedChannel) => window.__liveRegionMutations[selectedChannel].filter(Boolean),
    channel,
  );
}

async function installContrastLiveRegionRecorder(page) {
  await page.evaluate(() => {
    const element = document.querySelector("#contrast-status");
    window.__contrastAnnouncements = [];
    new MutationObserver(() => {
      if (element.textContent) {
        window.__contrastAnnouncements.push(element.textContent);
      }
    }).observe(element, { childList: true, characterData: true, subtree: true });
  });
}

async function contrastAnnouncements(page) {
  return page.evaluate(() => window.__contrastAnnouncements);
}

async function installAllLiveRegionRecorder(page) {
  await page.evaluate(() => {
    window.__allLiveAnnouncements = [];
    const liveRegions = new Set(document.querySelectorAll('[aria-live], [role="status"], [role="alert"]'));
    for (const element of liveRegions) {
      new MutationObserver(() => {
        if (element.textContent) {
          window.__allLiveAnnouncements.push({ id: element.id, text: element.textContent });
        }
      }).observe(element, { childList: true, characterData: true, subtree: true });
    }
  });
}

async function allLiveAnnouncements(page) {
  return page.evaluate(() => window.__allLiveAnnouncements);
}

async function fillThemeHexColor(page, key, value) {
  const row = page.locator(".color-row").filter({ has: page.locator(`#color-label-${key}`) });
  const popover = row.locator(`#color-popover-${key}`);
  if (await popover.isHidden()) {
    await row.locator(".color-picker-control").click();
  }
  const input = row.locator(`#color-hex-${key}`);
  await input.fill(value);
  return { input, row };
}

function parseComputedColor(value) {
  const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
  if (channels.length < 3) {
    return null;
  }

  return {
    r: channels[0],
    g: channels[1],
    b: channels[2],
    a: channels[3] ?? 1,
  };
}

function computedContrast(foreground, background) {
  const parsedForeground = parseComputedColor(foreground);
  const parsedBackground = parseComputedColor(background);
  const resolvedForeground = compositeColors(parsedForeground, parsedBackground);
  return contrastRatio(resolvedForeground, parsedBackground);
}

async function tabTo(page, locator, maximumTabs = 200) {
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (await locator.evaluate((element) => document.activeElement === element)) {
      return;
    }
  }

  expect(await locator.evaluate((element) => document.activeElement === element), "target is reachable by Tab").toBe(true);
}

async function focusGeometry(locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    const outlineWidth = Number.parseFloat(style.outlineWidth) || 0;
    const outlineOffset = Number.parseFloat(style.outlineOffset) || 0;
    const expansion = Math.max(0, outlineWidth + outlineOffset);
    const focusBounds = {
      left: bounds.left - expansion,
      right: bounds.right + expansion,
      top: bounds.top - expansion,
      bottom: bounds.bottom + expansion,
    };
    const clippedBy = [];

    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const ancestorStyle = getComputedStyle(ancestor);
      const clipsX = /(?:auto|clip|hidden|scroll)/.test(ancestorStyle.overflowX);
      const clipsY = /(?:auto|clip|hidden|scroll)/.test(ancestorStyle.overflowY);
      if (!clipsX && !clipsY) {
        continue;
      }

      const ancestorBounds = ancestor.getBoundingClientRect();
      if (
        (clipsX && (focusBounds.left < ancestorBounds.left - 1 || focusBounds.right > ancestorBounds.right + 1)) ||
        (clipsY && (focusBounds.top < ancestorBounds.top - 1 || focusBounds.bottom > ancestorBounds.bottom + 1))
      ) {
        clippedBy.push(ancestor.id || ancestor.className || ancestor.tagName);
      }
    }

    return {
      backgroundColor: style.backgroundColor,
      boxShadow: style.boxShadow,
      clippedBy,
      focusBounds,
      outlineColor: style.outlineColor,
      outlineOffset,
      outlineStyle: style.outlineStyle,
      outlineWidth,
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

function decodeScreenshotPng(buffer) {
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (bitDepth !== 8 || channels === 0) {
    throw new Error(`unsupported screenshot PNG format: depth ${bitDepth}, color type ${colorType}`);
  }

  const chunks = [];
  for (let offset = 8; offset < buffer.length;) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") {
      chunks.push(buffer.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }

  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const decoded = Buffer.alloc(height * stride);
  const paeth = (left, up, upperLeft) => {
    const estimate = left + up - upperLeft;
    const leftDistance = Math.abs(estimate - left);
    const upDistance = Math.abs(estimate - up);
    const upperLeftDistance = Math.abs(estimate - upperLeft);
    return leftDistance <= upDistance && leftDistance <= upperLeftDistance
      ? left
      : upDistance <= upperLeftDistance
        ? up
        : upperLeft;
  };

  for (let y = 0; y < height; y += 1) {
    const rawRow = y * (stride + 1);
    const decodedRow = y * stride;
    const filter = raw[rawRow];
    for (let x = 0; x < stride; x += 1) {
      const source = raw[rawRow + 1 + x];
      const left = x >= channels ? decoded[decodedRow + x - channels] : 0;
      const up = y > 0 ? decoded[decodedRow - stride + x] : 0;
      const upperLeft = y > 0 && x >= channels ? decoded[decodedRow - stride + x - channels] : 0;
      const prediction = filter === 0
        ? 0
        : filter === 1
          ? left
          : filter === 2
            ? up
            : filter === 3
              ? Math.floor((left + up) / 2)
              : filter === 4
                ? paeth(left, up, upperLeft)
                : Number.NaN;
      if (!Number.isFinite(prediction)) {
        throw new Error(`unsupported screenshot PNG filter: ${filter}`);
      }
      decoded[decodedRow + x] = (source + prediction) & 0xff;
    }
  }

  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    pixels[index * 4] = decoded[index * channels];
    pixels[index * 4 + 1] = decoded[index * channels + 1];
    pixels[index * 4 + 2] = decoded[index * channels + 2];
    pixels[index * 4 + 3] = channels === 4 ? decoded[index * channels + 3] : 255;
  }

  return { height, pixels, width };
}

function countScreenshotPixels(image, color, predicate = () => true) {
  let count = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (!predicate(x, y, image.width, image.height)) {
        continue;
      }
      const offset = (y * image.width + x) * 4;
      if (
        image.pixels[offset] === color[0] &&
        image.pixels[offset + 1] === color[1] &&
        image.pixels[offset + 2] === color[2] &&
        image.pixels[offset + 3] === (color[3] ?? 255)
      ) {
        count += 1;
      }
    }
  }
  return count;
}

function changedScreenshotPixelCount(first, second, predicate = () => true) {
  expect({ height: first.height, width: first.width }).toEqual({ height: second.height, width: second.width });
  let count = 0;
  for (let y = 0; y < first.height; y += 1) {
    for (let x = 0; x < first.width; x += 1) {
      if (!predicate(x, y, first.width, first.height)) {
        continue;
      }
      const offset = (y * first.width + x) * 4;
      if (!first.pixels.subarray(offset, offset + 4).equals(second.pixels.subarray(offset, offset + 4))) {
        count += 1;
      }
    }
  }
  return count;
}

async function expectPreviewInvariant(page, expectedIndex) {
  const expectedPageIds = PREVIEW_PAGES.map((previewPage) => previewPage.id);
  const state = await page.evaluate((pageIds) => {
    const tabs = [...document.querySelectorAll('#preview-tabs > button[role="tab"]')];
    const panels = pageIds.map((pageId) => document.querySelector(`#preview-panel-${pageId}`));

    return {
      tabs: tabs.map((tab) => ({
        controls: tab.getAttribute("aria-controls"),
        id: tab.id,
        selected: tab.getAttribute("aria-selected"),
        tabIndex: tab.tabIndex,
      })),
      panels: panels.map((panel) =>
        panel
          ? {
              ariaHidden: panel.getAttribute("aria-hidden"),
              hasInertAttribute: panel.hasAttribute("inert"),
              inert: panel.inert,
              labelledBy: panel.getAttribute("aria-labelledby"),
              role: panel.getAttribute("role"),
            }
          : null,
      ),
    };
  }, expectedPageIds);

  expect(state.tabs).toHaveLength(PREVIEW_PAGES.length);
  expect(state.panels).toHaveLength(PREVIEW_PAGES.length);
  expect(state.tabs.filter((tab) => tab.selected === "true")).toHaveLength(1);
  expect(state.tabs.filter((tab) => tab.tabIndex === 0)).toHaveLength(1);

  for (const [index, pageDefinition] of PREVIEW_PAGES.entries()) {
    const tab = state.tabs[index];
    const panel = state.panels[index];
    const isActive = index === expectedIndex;
    const tabId = `preview-tab-${pageDefinition.id}`;
    const panelId = `preview-panel-${pageDefinition.id}`;

    expect(tab).toEqual({
      controls: panelId,
      id: tabId,
      selected: String(isActive),
      tabIndex: isActive ? 0 : -1,
    });
    expect(panel).toEqual({
      ariaHidden: isActive ? null : "true",
      hasInertAttribute: !isActive,
      inert: !isActive,
      labelledBy: tabId,
      role: "tabpanel",
    });
  }
}

async function createPngBuffer(page, width, height, color = "#f78da7") {
  const base64 = await page.evaluate(async ({ width, height, color }) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = color;
    context.fillRect(0, 0, width, height);
    return canvas.toDataURL("image/png").split(",")[1];
  }, { width, height, color });

  return Buffer.from(base64, "base64");
}

async function readStoredZipEntries(download) {
  const path = await download.path();
  const bytes = new Uint8Array(await readFile(path));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = new Map();
  let offset = 0;

  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    expect(view.getUint16(offset + 8, true), "download entries use stored ZIP data").toBe(0);
    const dataLength = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength));
    entries.set(name, bytes.slice(dataStart, dataStart + dataLength));
    offset = dataStart + dataLength;
  }

  return entries;
}

function decodeEntry(entries, name) {
  const data = entries.get(name);
  expect(data, `download contains ${name}`).toBeDefined();
  return new TextDecoder().decode(data);
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

test("@task3 fallback image decode failure always revokes its object URL", async ({ page }) => {
  await page.addInitScript(() => {
    delete window.createImageBitmap;
    const originalCreateObjectUrl = URL.createObjectURL.bind(URL);
    const originalRevokeObjectUrl = URL.revokeObjectURL.bind(URL);
    window.__fallbackObjectUrls = { created: [], revoked: [] };
    URL.createObjectURL = (value) => {
      const url = originalCreateObjectUrl(value);
      window.__fallbackObjectUrls.created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      window.__fallbackObjectUrls.revoked.push(url);
      originalRevokeObjectUrl(url);
    };
    HTMLImageElement.prototype.decode = () => Promise.reject(new Error("forced fallback decode failure"));
  });
  await page.goto("/");
  expect(await page.evaluate(() => "createImageBitmap" in window)).toBe(false);

  const input = page.locator("#upload-input-mainBackground");
  await input.focus();
  await input.setInputFiles({ name: "fallback.png", mimeType: "image/png", buffer: onePixelPng });

  await expect(page.locator("#error-status")).toHaveText(
    `${IMAGE_TARGETS.mainBackground.label} 이미지를 읽을 수 없습니다. PNG, JPEG 또는 WebP 파일을 다시 선택해 주세요.`,
  );
  await expect.poll(() => page.evaluate(() => window.__fallbackObjectUrls.created.length)).toBe(1);
  expect(await page.evaluate(() => window.__fallbackObjectUrls)).toEqual({
    created: [expect.any(String)],
    revoked: [expect.any(String)],
  });
  const objectUrls = await page.evaluate(() => window.__fallbackObjectUrls);
  expect(objectUrls.revoked).toEqual(objectUrls.created);
  expect(await input.evaluate((element) => document.activeElement === element)).toBe(true);
});

for (const refreshFailureCase of [
  { fault: "fetch", caller: "tint", label: IMAGE_TARGETS.tabFriendIcon.label },
  { fault: "decode", caller: "detail", label: IMAGE_TARGETS.sendBubbleNormal.label },
  { fault: "canvas", caller: "nine-patch", label: IMAGE_TARGETS.sendBubbleNormal.label },
  { fault: "conversion", caller: "reset", label: IMAGE_TARGETS.sendBubbleNormal.label },
]) {
  test(`@task3 guarded ${refreshFailureCase.caller} refresh reports ${refreshFailureCase.fault} failure without losing state or focus`, async ({ page }) => {
    await page.goto("/");

    let description;
    let thumb;
    let trigger;
    let focusedAfterFailure;
    if (refreshFailureCase.caller === "tint") {
      const row = page.locator('[aria-labelledby="upload-title-tabFriendIcon"]');
      description = page.locator("#upload-description-tabFriendIcon");
      thumb = row.locator('[data-upload-thumb="tabFriendIcon"]');
      const checkbox = row.getByRole("checkbox", { name: "친구 탭 아이콘 - 기본 색상 적용", exact: true });
      trigger = async () => {
        await checkbox.focus();
        await checkbox.check();
      };
      focusedAfterFailure = checkbox;
    } else {
      await page.getByRole("tab", { name: "채팅방", exact: true }).click();
      const input = page.locator("#upload-input-sendBubbleNormal");
      await input.setInputFiles({
        name: "good-bubble.png",
        mimeType: "image/png",
        buffer: await createPngBuffer(page, 120, 105),
      });
      description = page.locator("#upload-description-sendBubbleNormal");
      await expect(description).toContainText("good-bubble.png");
      thumb = page.locator('[data-upload-thumb="sendBubbleNormal"]');
      await page.getByRole("button", { name: "나의 말풍선 - 기본 상세", exact: true }).click();

      if (refreshFailureCase.caller === "detail") {
        const fitButton = page.getByRole("radio", { name: "채우기", exact: true });
        trigger = async () => {
          await fitButton.focus();
          await fitButton.check();
        };
        focusedAfterFailure = page.getByRole("radio", { name: "채우기", exact: true });
      } else {
        const range = page.locator('input[data-nine-patch-field="stretchX"][data-nine-patch-index="0"]');
        if (refreshFailureCase.caller === "nine-patch") {
          trigger = async () => {
            await range.focus();
            await range.evaluate((input) => {
              input.value = String(Math.min(Number(input.max), Number(input.value) + 1));
              input.dispatchEvent(new Event("input", { bubbles: true }));
            });
          };
          focusedAfterFailure = range;
        } else {
          const backgroundBeforeEdit = await thumb.evaluate((element) => getComputedStyle(element).backgroundImage);
          await range.evaluate((input) => {
            input.value = String(Math.min(Number(input.max), Number(input.value) + 1));
            input.dispatchEvent(new Event("input", { bubbles: true }));
          });
          await expect.poll(() => thumb.evaluate((element) => getComputedStyle(element).backgroundImage)).not.toBe(backgroundBeforeEdit);
          const resetButton = page.getByRole("button", { name: "초기화", exact: true });
          trigger = async () => {
            await resetButton.focus();
            await resetButton.click();
          };
          focusedAfterFailure = resetButton;
        }
      }
    }

    const goodBackground = await thumb.evaluate((element) => getComputedStyle(element).backgroundImage);
    const goodDescription = await description.textContent();
    await page.evaluate((fault) => {
      if (fault === "fetch") {
        const originalFetch = window.fetch.bind(window);
        window.fetch = (input, ...args) => {
          if (String(input).includes("maintabIcoFriends@3x.png")) {
            window.fetch = originalFetch;
            return Promise.resolve(new Response("", { status: 503 }));
          }
          return originalFetch(input, ...args);
        };
        return;
      }

      if (fault === "decode") {
        const originalCreateImageBitmap = window.createImageBitmap.bind(window);
        window.createImageBitmap = (source, ...args) => {
          if (source instanceof Blob && !(source instanceof File)) {
            window.createImageBitmap = originalCreateImageBitmap;
            return Promise.reject(new Error("forced refresh decode failure"));
          }
          return originalCreateImageBitmap(source, ...args);
        };
        return;
      }

      if (fault === "canvas") {
        const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = function (...args) {
          CanvasRenderingContext2D.prototype.drawImage = originalDrawImage;
          throw new Error("forced refresh canvas failure");
        };
        return;
      }

      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (callback) {
        HTMLCanvasElement.prototype.toBlob = originalToBlob;
        callback(null);
      };
    }, refreshFailureCase.fault);

    await trigger();

    const alertMessage = `${refreshFailureCase.label} 이미지를 다시 처리하지 못했습니다. 변경 전 이미지는 유지됩니다. 다시 시도해 주세요.`;
    await expect(page.locator("#error-status")).toHaveText(alertMessage, { timeout: 2_000 });
    await expect(page.locator("#status-text")).toHaveText(`${refreshFailureCase.label} 이미지 처리 실패`);
    await expect(description).toHaveText(goodDescription);
    await expect(thumb).toHaveCSS("background-image", goodBackground);
    expect(await focusedAfterFailure.evaluate((element) => document.activeElement === element)).toBe(true);
  });
}

test("@task3 stale refresh rejection cannot overwrite a newer tint success", async ({ page }) => {
  await page.goto("/");

  const row = page.locator('[aria-labelledby="upload-title-tabFriendIcon"]');
  const input = page.locator("#upload-input-tabFriendIcon");
  await input.setInputFiles({
    name: "stable-friend.png",
    mimeType: "image/png",
    buffer: await createPngBuffer(page, 114, 114),
  });
  await expect(page.locator("#upload-description-tabFriendIcon")).toContainText("stable-friend.png");

  const thumb = row.locator('[data-upload-thumb="tabFriendIcon"]');
  const backgroundBeforeRefresh = await thumb.evaluate((element) => getComputedStyle(element).backgroundImage);
  await installLiveRegionRecorder(page);
  await page.evaluate(() => {
    const originalCreateImageBitmap = window.createImageBitmap.bind(window);
    let refreshDecodeCount = 0;
    window.createImageBitmap = (source, ...args) => {
      if (!(source instanceof Blob) || source instanceof File) {
        return originalCreateImageBitmap(source, ...args);
      }

      refreshDecodeCount += 1;
      if (refreshDecodeCount !== 1) {
        return originalCreateImageBitmap(source, ...args);
      }

      window.__staleRefreshStarted = true;
      const heldRefresh = new Promise((resolve, reject) => {
        window.__rejectStaleRefresh = () => reject(new Error("forced stale refresh failure"));
      });
      heldRefresh.catch(() => {
        window.__staleRefreshSettled = true;
      });
      return heldRefresh;
    };
  });

  const checkbox = row.getByRole("checkbox", { name: "친구 탭 아이콘 - 기본 색상 적용", exact: true });
  await checkbox.check();
  await expect.poll(() => page.evaluate(() => window.__staleRefreshStarted)).toBe(true);

  const tintColor = row.locator('input[type="color"]');
  await tintColor.fill("#123456");
  await expect.poll(() => thumb.evaluate((element) => getComputedStyle(element).backgroundImage)).not.toBe(
    backgroundBeforeRefresh,
  );
  const newerBackground = await thumb.evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(await tintColor.evaluate((element) => document.activeElement === element)).toBe(true);

  await page.evaluate(async () => {
    window.__rejectStaleRefresh();
    while (!window.__staleRefreshSettled) {
      await Promise.resolve();
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });

  await expect(page.locator("#error-status")).toBeEmpty();
  await expect(thumb).toHaveCSS("background-image", newerBackground);
  expect(await liveMessageCount(page, "status", `${IMAGE_TARGETS.tabFriendIcon.label} 이미지 처리 실패`)).toBe(0);
  expect(await tintColor.evaluate((element) => document.activeElement === element)).toBe(true);
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

for (const snapshotCase of [
  {
    platform: "iOS",
    button: "#download-ios",
    kind: "ios",
    fileName: "Invocation-Theme.ktheme",
    mainEntry: "Images/mainBgImage@3x.png",
    pendingEntry: "Images/maintabIcoFriends@3x.png",
    templateEntries: [
      { name: "KakaoTalkTheme.css", body: "" },
      { name: "Images/mainBgImage@3x.png", body: "template main background" },
      { name: "Images/maintabIcoFriends@3x.png", body: "template pending icon" },
    ],
  },
  {
    platform: "Android",
    button: "#download-android",
    kind: "android",
    fileName: "Invocation-Theme-android-source.zip",
    mainEntry: "src/main/theme/drawable-xxhdpi/theme_background_image.png",
    pendingEntry: "src/main/theme/drawable-xxhdpi/theme_maintab_ico_friends_image.png",
    splashEntry: "src/main/theme/drawable-xxhdpi/theme_splash_image.png",
    templateEntries: [
      { name: "build.gradle.kts", body: 'namespace = "old"\napplicationId = "old"\nversionName = "0.0.0"' },
      { name: "src/main/AndroidManifest.xml", body: '<manifest package="old"></manifest>' },
      { name: "src/main/theme/values/colors.xml", body: "<resources></resources>" },
      { name: "src/main/res/values/strings.xml", body: "<resources></resources>" },
      { name: "src/main/theme/drawable-xxhdpi/theme_background_image.png", body: "template main background" },
      { name: "src/main/theme/drawable-xxhdpi/theme_maintab_ico_friends_image.png", body: "template pending icon" },
      { name: "src/main/theme/drawable-xxhdpi/theme_splash_image.png", body: "template splash" },
    ],
  },
]) {
  test(`@task3 ${snapshotCase.platform} generation uses one invocation-time state and upload snapshot`, async ({ page }) => {
    const pendingFileName = `pending-${snapshotCase.kind}-friend.png`;
    await delayImageBitmapForFile(page, pendingFileName);
    await page.addInitScript(() => {
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
        if (!window.__serializeCanvasPixels) {
          return originalToBlob.call(this, callback, ...args);
        }

        const context = this.getContext("2d");
        const pixel = (x, y) => Array.from(context.getImageData(x, y, 1, 1).data);
        const marker = JSON.stringify({
          width: this.width,
          height: this.height,
          top: pixel(0, 0),
          center: pixel(Math.floor(this.width / 2), Math.floor(this.height / 2)),
        });
        callback(new Blob([marker], { type: "image/png" }));
        return undefined;
      };
    });

    const heldManifests = [];
    await page.route("**/assets/template-manifest.json", async (route) => {
      await new Promise((resolve) => heldManifests.push({ route, resolve }));
    });
    await page.route("**/snapshot-template/**", async (route) => {
      const index = Number(new URL(route.request().url()).pathname.split("/").pop());
      const entry = snapshotCase.templateEntries[index];
      await route.fulfill({ status: 200, body: entry.body });
    });
    await page.route("**/assets/template-images/ios/Images/commonIcoTheme.png", async (route) => {
      await route.fulfill({ status: 200, contentType: "image/png", body: onePixelPng });
    });
    await page.goto("/");
    await page.evaluate(() => {
      window.__serializeCanvasPixels = true;
    });

    const invocationMainImage = await createPngBuffer(page, 4, 4, "#112233");
    const laterMainImage = await createPngBuffer(page, 4, 4, "#445566");
    const laterSplashImage = await createPngBuffer(page, 4, 4, "#778899");
    const pendingIconImage = await createPngBuffer(page, 114, 114, "#f78da7");

    await page.locator("#app-name").fill("Invocation Theme");
    await page.locator("#theme-id-segment").fill("Snapshot");
    await page.locator("#version").fill("1.2.3");
    await page.locator("#additional-author-name").fill("Invocation Author");
    await page.locator(".color-picker-control").filter({ has: page.locator("#color-value-mainBackground") }).click();
    await page.locator("#color-hex-mainBackground").fill("#123456");

    const mainInput = page.locator("#upload-input-mainBackground");
    await mainInput.setInputFiles({ name: "invocation-main.png", mimeType: "image/png", buffer: invocationMainImage });
    await expect(page.locator("#upload-description-mainBackground")).toContainText("invocation-main.png");

    const pendingInput = page.locator("#upload-input-tabFriendIcon");
    await pendingInput.setInputFiles({ name: pendingFileName, mimeType: "image/png", buffer: pendingIconImage });
    await expect.poll(() => page.evaluate(() => window.__delayedImageBitmapStarted)).toBe(true);

    const downloadPromise = page.waitForEvent("download");
    await page.locator(snapshotCase.button).click();
    await expect.poll(() => heldManifests.length).toBe(1);

    await page.locator("#app-name").fill("Later Theme");
    await page.locator("#theme-id-segment").fill("Changed");
    await page.locator("#version").fill("4.5.6");
    await page.locator("#additional-author-name").fill("Later Author");
    await mainInput.setInputFiles({ name: "later-main.png", mimeType: "image/png", buffer: laterMainImage });
    await expect(page.locator("#upload-description-mainBackground")).toContainText("later-main.png");

    if (snapshotCase.platform === "Android") {
      await page.getByRole("tab", { name: "로딩화면", exact: true }).click();
      const splashInput = page.locator("#upload-input-splashImage");
      await splashInput.setInputFiles({ name: "later-splash.png", mimeType: "image/png", buffer: laterSplashImage });
      await expect(page.locator("#upload-description-splashImage")).toContainText("later-splash.png");
    }

    await page.locator(".color-picker-control").filter({ has: page.locator("#color-value-mainBackground") }).click();
    const focusedColorInput = page.locator("#color-hex-mainBackground");
    await focusedColorInput.fill("#654321");
    await page.evaluate(() => window.__releaseDelayedImageBitmap());
    await expect.poll(() => page.evaluate(() => window.__delayedImageBitmapClosed)).toBe(true);
    await expect(page.locator("#status-text")).toHaveText(`${IMAGE_TARGETS.tabFriendIcon.label} 반영`);

    const held = heldManifests.shift();
    await held.route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ios: snapshotCase.kind === "ios"
          ? snapshotCase.templateEntries.map((entry, index) => ({ name: entry.name, url: `snapshot-template/${index}` }))
          : [],
        android: snapshotCase.kind === "android"
          ? snapshotCase.templateEntries.map((entry, index) => ({ name: entry.name, url: `snapshot-template/${index}` }))
          : [],
      }),
    });
    held.resolve();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(snapshotCase.fileName);
    const entries = await readStoredZipEntries(download);
    expect(decodeEntry(entries, snapshotCase.pendingEntry)).toBe("template pending icon");

    if (snapshotCase.platform === "iOS") {
      const css = decodeEntry(entries, "KakaoTalkTheme.css");
      expect(css).toContain("-kakaotalk-theme-name: 'Invocation Theme'");
      expect(css).toContain("-kakaotalk-theme-version: '1.2.3'");
      expect(css).toContain("-kakaotalk-theme-id: 'com.snapshot.kakaotalk.theme'");
      expect(css).toContain("-kakaotalk-author-name: 'reha, Invocation Author'");
      expect(css).toContain("background-color: #123456");
      expect(css).not.toContain("Later Theme");
      expect(css).not.toContain("4.5.6");
      expect(css).not.toContain("com.changed.kakaotalk.theme");
      expect(css).not.toContain("Later Author");
      expect(css).not.toContain("#654321");
      expect(Buffer.from(entries.get(snapshotCase.mainEntry))).toEqual(invocationMainImage);
      expect(Buffer.from(entries.get(snapshotCase.mainEntry))).not.toEqual(laterMainImage);
    } else {
      const strings = decodeEntry(entries, "src/main/res/values/strings.xml");
      const colors = decodeEntry(entries, "src/main/theme/values/colors.xml");
      const gradle = decodeEntry(entries, "build.gradle.kts");
      const manifest = decodeEntry(entries, "src/main/AndroidManifest.xml");
      expect(strings).toContain("Invocation Theme");
      expect(strings).not.toContain("Later Theme");
      expect(gradle).toContain('namespace = "com.snapshot.kakaotalk.theme"');
      expect(gradle).toContain('applicationId = "com.snapshot.kakaotalk.theme"');
      expect(gradle).toContain('versionName = "1.2.3"');
      expect(gradle).not.toContain("com.changed.kakaotalk.theme");
      expect(gradle).not.toContain("4.5.6");
      expect(manifest).toContain('package="com.snapshot.kakaotalk.theme"');
      expect(manifest).not.toContain("com.changed.kakaotalk.theme");
      expect(colors).toContain("#123456");
      expect(colors).not.toContain("#654321");
      expect(Buffer.from(entries.get(snapshotCase.mainEntry))).toEqual(invocationMainImage);
      expect(Buffer.from(entries.get(snapshotCase.mainEntry))).not.toEqual(laterMainImage);
      const splashMarker = decodeEntry(entries, snapshotCase.splashEntry);
      expect(splashMarker).toContain('"top":[18,52,86,255]');
      expect(splashMarker).not.toContain("119,136,153,255");
    }

    expect(await focusedColorInput.evaluate((element) => document.activeElement === element)).toBe(true);
  });
}

test("@task3 cached iOS success announces start before completion exactly once", async ({ page }) => {
  let manifestRequestCount = 0;
  await page.route("**/assets/template-manifest.json", async (route) => {
    manifestRequestCount += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ios: [], android: [] }),
    });
  });
  await page.goto("/");

  const button = page.locator("#download-ios");
  const warmDownloadPromise = page.waitForEvent("download");
  await button.click();
  await warmDownloadPromise;
  await expect(page.locator("#status-text")).toHaveText("iOS 다운로드 준비 완료");

  await installLiveRegionRecorder(page);
  const cachedDownloadPromise = page.waitForEvent("download");
  await button.click();
  await cachedDownloadPromise;

  await expect.poll(() => nonEmptyLiveMessages(page, "status")).toEqual([
    "iOS 생성 중",
    "iOS 다운로드 준비 완료",
  ]);
  expect(manifestRequestCount).toBe(1);
  await expect(page.locator("#error-status")).toBeEmpty();
});

test("@task3 post-cache iOS failure announces start before failure exactly once", async ({ page }) => {
  let manifestRequestCount = 0;
  await page.route("**/assets/template-manifest.json", async (route) => {
    manifestRequestCount += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ios: [], android: [] }),
    });
  });
  await page.goto("/");

  const button = page.locator("#download-ios");
  const warmDownloadPromise = page.waitForEvent("download");
  await button.click();
  await warmDownloadPromise;
  await expect(page.locator("#status-text")).toHaveText("iOS 다운로드 준비 완료");

  await page.evaluate(() => {
    const originalCreateObjectUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (...args) => {
      URL.createObjectURL = originalCreateObjectUrl;
      throw new Error(`forced cached download failure for ${args[0]?.type || "unknown type"}`);
    };
  });
  await installLiveRegionRecorder(page);
  let failedAttemptDownloadCount = 0;
  page.on("download", () => {
    failedAttemptDownloadCount += 1;
  });

  await button.click();

  await expect.poll(() => nonEmptyLiveMessages(page, "status")).toEqual([
    "iOS 생성 중",
    "iOS 생성 실패",
  ]);
  await expect.poll(() => nonEmptyLiveMessages(page, "alert")).toEqual([
    "iOS 테마를 생성하지 못했습니다. 다시 시도해 주세요.",
  ]);
  await expect(page.locator(".download-actions")).toHaveAttribute("aria-busy", "false");
  expect(manifestRequestCount).toBe(1);
  expect(failedAttemptDownloadCount).toBe(0);
});

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
    outlineColor: "rgb(11, 107, 95)",
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
  await expect(fileButton).toHaveCSS("outline-color", "rgb(11, 107, 95)");

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

test("@task4 connects every preview tab to one panel and hides inactive panels from focus and the accessibility tree", async ({
  page,
}) => {
  await page.goto("/");

  await expectPreviewInvariant(page, 1);

  const snapshot = await page.locator("#preview-frame").ariaSnapshot();
  expect(snapshot).toContain('tabpanel "대화 목록"');
  for (const previewPage of PREVIEW_PAGES.filter((_, index) => index !== 1)) {
    expect(snapshot).not.toContain(`tabpanel "${previewPage.label}"`);
  }

  await page.locator("#preview-next").focus();
  const inactivePanelFocus = [];
  for (let index = 0; index < 80; index += 1) {
    await page.keyboard.press("Tab");
    const focusState = await page.evaluate(() => {
      const panel = document.activeElement?.closest(".preview-slide");
      return panel
        ? {
            id: panel.id,
            inactive: panel.hasAttribute("inert") || panel.getAttribute("aria-hidden") === "true",
          }
        : null;
    });
    if (focusState?.inactive) {
      inactivePanelFocus.push(focusState.id);
    }
  }
  expect(inactivePanelFocus).toEqual([]);
});

test("@task4 automatically activates scoped preview tabs with arrows, Home, End, and wraparound", async ({ page }) => {
  await page.goto("/");
  const tabs = page.locator('#preview-tabs > button[role="tab"]');
  const previewStatus = page.locator("#preview-status");

  await tabs.nth(1).focus();
  for (const step of [
    { key: "ArrowRight", index: 2 },
    { key: "ArrowLeft", index: 1 },
    { key: "Home", index: 0 },
    { key: "ArrowLeft", index: 9 },
    { key: "ArrowRight", index: 0 },
    { key: "End", index: 9 },
  ]) {
    await page.keyboard.press(step.key);
    await expectPreviewInvariant(page, step.index);
    await expect(tabs.nth(step.index)).toBeFocused();
    await expect(previewStatus).toHaveText("");
  }

  await tabs.nth(3).click();
  await expectPreviewInvariant(page, 3);
  await expect(tabs.nth(3)).toBeFocused();

  await page.locator("#preview-previous").click();
  await expectPreviewInvariant(page, 2);
  await expect(page.locator("#preview-previous")).toBeFocused();
  await expect(previewStatus).toContainText("지금 프리뷰, 3/10");
  await expect(previewStatus).toContainText(/통과 \d+개, 미달 \d+개, 자동 확인 불가 \d+개/);

  await page.locator("#preview-next").click();
  await expectPreviewInvariant(page, 3);
  await expect(page.locator("#preview-next")).toBeFocused();
  await expect(previewStatus).toContainText("쇼핑 프리뷰, 4/10");
  await expect(previewStatus).toContainText(/통과 \d+개, 미달 \d+개, 자동 확인 불가 \d+개/);
});

test("@task4 removes global arrow navigation and scopes passcode shortcuts to its focused panel", async ({ page }) => {
  await page.goto("/");
  const tabs = page.locator('#preview-tabs > button[role="tab"]');
  const selectedDots = page.locator(".passcode-dot.is-selected");

  await tabs.nth(7).click();
  await expectPreviewInvariant(page, 7);

  await page.locator("#preview-next").focus();
  await page.keyboard.press("ArrowLeft");
  await expectPreviewInvariant(page, 7);
  await page.keyboard.press("7");
  await expect(selectedDots).toHaveCount(0);

  await page.locator('[data-passcode-digit="1"]').focus();
  await page.keyboard.press("7");
  await expect(selectedDots).toHaveCount(1);
  await page.keyboard.press("Backspace");
  await expect(selectedDots).toHaveCount(0);
});

test("@task7 exposes click-driven passcode progress without revealing the entered digit", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "잠금화면", exact: true }).click();

  const status = page.locator("#passcode-status");
  const selectedDots = page.locator(".passcode-dot.is-selected");
  const digit = page.locator('[data-passcode-digit="8"]');
  const deleteButton = page.getByRole("button", { name: "한 자리 지우기", exact: true });

  await expect(status).toHaveAttribute("role", "status");
  await expect(status).toHaveAttribute("aria-live", "polite");
  await expect(status).toHaveAttribute("aria-atomic", "true");
  await expect(status).toHaveText("4자리 중 0자리 입력됨");
  await expect(selectedDots).toHaveCount(0);

  await digit.click();
  await expect(status).toHaveText("4자리 중 1자리 입력됨");
  await expect(status).not.toContainText("8");
  await expect(selectedDots).toHaveCount(1);

  for (let count = 2; count <= 4; count += 1) {
    await digit.click();
    await expect(status).toHaveText(`4자리 중 ${count}자리 입력됨`);
    await expect(selectedDots).toHaveCount(count);
  }
  await digit.click();
  await expect(status).toHaveText("4자리 중 4자리 입력됨");
  await expect(status).not.toContainText("8");
  await expect(selectedDots).toHaveCount(4);

  await deleteButton.click();
  await expect(status).toHaveText("4자리 중 3자리 입력됨");
  await expect(selectedDots).toHaveCount(3);

  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(status).toHaveText("4자리 중 0자리 입력됨");
  await expect(selectedDots).toHaveCount(0);
});

test("@task7 scopes keyboard passcode progress to the focused active screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "잠금화면", exact: true }).click();

  const status = page.locator("#passcode-status");
  const selectedDots = page.locator(".passcode-dot.is-selected");
  const digit = page.locator('[data-passcode-digit="9"]');
  await digit.focus();

  await page.keyboard.press("9");
  await expect(status).toHaveText("4자리 중 1자리 입력됨");
  await expect(status).not.toContainText("9");
  await expect(selectedDots).toHaveCount(1);

  for (let count = 2; count <= 4; count += 1) {
    await page.keyboard.press("9");
    await expect(status).toHaveText(`4자리 중 ${count}자리 입력됨`);
    await expect(selectedDots).toHaveCount(count);
  }
  await page.keyboard.press("9");
  await expect(status).toHaveText("4자리 중 4자리 입력됨");
  await expect(status).not.toContainText("9");
  await expect(selectedDots).toHaveCount(4);

  await page.keyboard.press("ArrowRight");
  await expectPreviewInvariant(page, 7);
  await expect(status).toHaveText("4자리 중 4자리 입력됨");
  await expect(selectedDots).toHaveCount(4);

  await page.keyboard.press("Backspace");
  await expect(status).toHaveText("4자리 중 3자리 입력됨");
  await expect(selectedDots).toHaveCount(3);

  await page.keyboard.press("Escape");
  await expect(status).toHaveText("4자리 중 0자리 입력됨");
  await expect(selectedDots).toHaveCount(0);
});

async function openDefaultBubbleDetail(page) {
  await page.goto("/");
  await page.getByRole("tab", { name: "채팅방", exact: true }).click();
  await page.getByRole("button", { name: "나의 말풍선 - 기본 상세", exact: true }).click();
}

test("@task5 detail click focuses its semantic heading", async ({ page }) => {
  await openDefaultBubbleDetail(page);

  const heading = page.getByRole("heading", { name: "나의 말풍선 - 기본 상세", level: 3, exact: true });
  await expect(heading).toHaveAttribute("tabindex", "-1");
  await expect(heading).toBeFocused();
  await expectPreviewInvariant(page, 6);
});

test("@task5 exposes native fit radios and four labelled range groups", async ({ page }) => {
  await openDefaultBubbleDetail(page);

  const panel = page.locator("[data-bubble-detail-panel]");
  const fitGroup = panel.getByRole("group", { name: "배치", exact: true });
  const cover = fitGroup.getByRole("radio", { name: "채우기", exact: true });
  const contain = fitGroup.getByRole("radio", { name: "전체", exact: true });
  await expect(cover).not.toBeChecked();
  await expect(contain).toBeChecked();
  await expect(cover).toHaveAttribute("id", "nine-patch-fit-cover");
  await expect(contain).toHaveAttribute("id", "nine-patch-fit-contain");

  const rangeDefinitions = [
    { field: "stretchX", legend: "가로 늘림" },
    { field: "stretchY", legend: "세로 늘림" },
    { field: "paddingX", legend: "내용 가로" },
    { field: "paddingY", legend: "내용 세로" },
  ];
  await expect(panel.locator("fieldset.nine-patch-control")).toHaveCount(4);
  await expect(panel.getByRole("slider")).toHaveCount(8);

  for (const { field, legend } of rangeDefinitions) {
    const group = panel.getByRole("group", { name: legend, exact: true });
    for (const [index, position] of ["시작", "끝"].entries()) {
      const slider = group.getByRole("slider", {
        name: `나의 말풍선 - 기본 ${legend} ${position}`,
        exact: true,
      });
      await expect(slider).toHaveAttribute("id", `nine-patch-${field}-${position === "시작" ? "start" : "end"}`);
      await expect(slider).toHaveAttribute("aria-valuetext", /^\d+픽셀$/);
      await expect(slider).toHaveAttribute("data-nine-patch-index", String(index));
    }
  }

  await expect(panel.locator("output")).toHaveCount(0);
  await expect(panel.getByRole("status")).toHaveCount(0);
  const snapshot = await panel.ariaSnapshot();
  expect(snapshot).not.toMatch(/stretchX|stretchY|paddingX|paddingY/);
});

for (const fitMode of [
  { name: "채우기", value: "cover" },
  { name: "전체", value: "contain" },
]) {
  test(`@task5 ${fitMode.name} fit radio retains its exact node and focus`, async ({ page }) => {
    await openDefaultBubbleDetail(page);

    const radio = page.getByRole("radio", { name: fitMode.name, exact: true });
    await radio.focus();
    const node = await radio.elementHandle();
    await radio.check();

    await expect(radio).toBeChecked();
    await expect(radio).toBeFocused();
    expect(await radio.evaluate((element, previous) => element === previous, node)).toBe(true);
    await expect(page.locator('[data-bubble-detail-panel] input[type="radio"]:checked')).toHaveValue(fitMode.value);
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
  });
}

test("@task5 range input keeps focus and synchronizes its pixel value", async ({ page }) => {
  await openDefaultBubbleDetail(page);

  const slider = page.getByRole("slider", {
    name: "나의 말풍선 - 기본 가로 늘림 시작",
    exact: true,
  });
  await slider.focus();
  const node = await slider.elementHandle();
  const nextValue = await slider.evaluate((input) => String(Math.max(Number(input.min), Number(input.value) - 1)));
  await slider.evaluate((input, value) => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, nextValue);

  await expect(slider).toHaveValue(nextValue);
  await expect(slider).toHaveAttribute("aria-valuetext", `${nextValue}픽셀`);
  await expect(slider).toBeFocused();
  expect(await slider.evaluate((element, previous) => element === previous, node)).toBe(true);
  await expect(page.locator('[data-nine-patch-value="stretchX-0"]')).toHaveText(nextValue);
  await expect(page.locator('[data-nine-patch-value="stretchX-0"]')).toHaveAttribute("aria-hidden", "true");
});

test("@task5 uploaded bubble dimensions resynchronize slider bounds without replacing controls", async ({ page }) => {
  await page.addInitScript(() => {
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      if (!window.__holdTask5CanvasBlob || window.__task5CanvasBlobStarted) {
        return originalToBlob.call(this, callback, ...args);
      }

      const canvas = this;
      window.__task5CanvasBlobStarted = true;
      window.__releaseTask5CanvasBlob = () => originalToBlob.call(canvas, callback, ...args);
      return undefined;
    };
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "채팅방", exact: true }).click();
  await page.evaluate(() => {
    window.__holdTask5CanvasBlob = true;
  });
  await page.locator("#upload-input-sendBubbleNormal").setInputFiles({
    name: "large-bubble.png",
    mimeType: "image/png",
    buffer: await createPngBuffer(page, 520, 450),
  });
  await expect.poll(() => page.evaluate(() => window.__task5CanvasBlobStarted)).toBe(true);
  await page.getByRole("button", { name: "나의 말풍선 - 기본 상세", exact: true }).click();

  const slider = page.getByRole("slider", {
    name: "나의 말풍선 - 기본 가로 늘림 끝",
    exact: true,
  });
  const node = await slider.elementHandle();
  await expect(slider).toHaveAttribute("max", "300");

  await page.evaluate(() => window.__releaseTask5CanvasBlob());
  await expect(page.locator("#status-text")).toHaveText("나의 말풍선 - 기본 반영");
  await expect(slider).toHaveAttribute("max", "520");
  await expect(slider).toHaveAttribute("aria-valuetext", /^\d+픽셀$/);
  expect(await slider.evaluate((element, previous) => element === previous, node)).toBe(true);
});

test("@task5 previous preview navigation preserves its trigger focus", async ({ page }) => {
  await openDefaultBubbleDetail(page);

  const previous = page.locator("#preview-previous");
  await previous.click();
  await expectPreviewInvariant(page, 5);
  await expect(previous).toBeFocused();
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
});

test("@task5 next preview navigation preserves its trigger focus", async ({ page }) => {
  await openDefaultBubbleDetail(page);

  const next = page.locator("#preview-next");
  await next.click();
  await expectPreviewInvariant(page, 7);
  await expect(next).toBeFocused();
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
});

async function openShoppingPreview(page) {
  await page.goto("/");
  await page.getByRole("tab", { name: "쇼핑", exact: true }).click();
  await expectPreviewInvariant(page, 3);
}

async function shoppingCarouselState(page) {
  return page.locator("#shopping-pick-carousel").evaluate((scroller) => ({
    activePreview: document.querySelector('#preview-tabs > [role="tab"][aria-selected="true"]')?.dataset.previewIndex,
    clientWidth: scroller.clientWidth,
    maxScrollLeft: scroller.scrollWidth - scroller.clientWidth,
    scrollLeft: scroller.scrollLeft,
    scrollWidth: scroller.scrollWidth,
  }));
}

test("@task6 removes false preview controls and keeps deliberate sample semantics", async ({ page }) => {
  await page.goto("/");

  const mockControlCount = await page.locator(".preview-slide .preview-mock-control").count();
  expect(mockControlCount).toBe(55);
  await expect(page.locator('.preview-slide .preview-mock-control[role="button"], .preview-slide .preview-mock-control[role="tab"], .preview-slide .preview-mock-control[role="link"]')).toHaveCount(0);

  const cases = [
    { tab: "메인", summary: "친구 목록과 선택된 친구 탭", forbidden: /button "(?:검색|친구|설정)"|tab "(?:친구|소식)"/ },
    { tab: "대화 목록", summary: "대화 목록과 선택된 대화 탭", forbidden: /button "(?:검색|새 대화|설정|친구|대화|오픈채팅|쇼핑|더보기)"/ },
    { tab: "지금", summary: "오픈채팅 목록과 선택된 오픈채팅 탭", forbidden: /button "(?:검색|새 오픈채팅|설정|친구|대화|오픈채팅|쇼핑|더보기)"/ },
    { tab: "쇼핑", summary: "쇼핑 요약과 상품 캐러셀", forbidden: /button "(?:검색|장바구니|설정|친구|대화|오픈채팅|쇼핑|더보기)"|tab "(?:홈|랭킹)"/ },
    { tab: "더보기", summary: "서비스 목록과 선택된 더보기 탭", forbidden: /button "(?:검색|스캔|설정|친구|대화|오픈채팅|쇼핑|더보기)"|tab "(?:홈|지갑)"/ },
    { tab: "채팅방", summary: "메시지 대화와 입력창", forbidden: /button "(?:뒤로|메뉴|전송)"|link "https:\/\/talk\.kakao\.com"/ },
    { tab: "말풍선 상세", summary: "말풍선 이미지를 조정하는 실제 편집 화면", forbidden: /button "뒤로"/ },
    { tab: "잠금화면", summary: "숫자 키패드로 네 자리 암호 입력", forbidden: /link / },
    { tab: "로딩화면", summary: "테마 아이콘과 배경을 보여 주는 로딩화면", forbidden: /button |link / },
    { tab: "테마 목록", summary: "기본, 공식, 사용자 테마 목록과 선택된 사용자 테마", forbidden: /button "(?:뒤로|관리|공식 테마 다운로드)"/ },
  ];

  for (const { tab, summary, forbidden } of cases) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    const panel = page.locator('.preview-slide:not([aria-hidden="true"])');
    const snapshot = await panel.ariaSnapshot();
    expect(snapshot).toContain(summary);
    expect(snapshot).toContain("heading");
    expect(snapshot).not.toMatch(forbidden);
  }

  await page.getByRole("tab", { name: "쇼핑", exact: true }).click();
  const shoppingPanel = page.locator("#preview-panel-shopping");
  await expect(shoppingPanel.getByRole("button", { name: "이전 상품", exact: true })).toHaveCount(1);
  await expect(shoppingPanel.getByRole("button", { name: "다음 상품", exact: true })).toHaveCount(1);
  await expect(shoppingPanel.getByRole("region", { name: "오늘의 PICK 상품 캐러셀", exact: true })).toHaveCount(1);

  await page.getByRole("tab", { name: "더보기", exact: true }).click();
  await expect(page.getByRole("link", { name: "리딩로그 Google Play 다운로드 (새 창)", exact: true })).toHaveCount(1);
  await page.getByRole("tab", { name: "말풍선 상세", exact: true }).click();
  await expect(page.getByRole("button", { name: "다음 말풍선", exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "초기화", exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "뒤로", exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "잠금화면", exact: true }).click();
  await expect(page.locator(".keypad").getByRole("button")).toHaveCount(12);
});

test("@task6 carousel keyboard navigation scrolls without changing the parent preview or focus", async ({ page }) => {
  await openShoppingPreview(page);
  const carousel = page.getByRole("region", { name: "오늘의 PICK 상품 캐러셀", exact: true });
  const previous = page.getByRole("button", { name: "이전 상품", exact: true });
  const next = page.getByRole("button", { name: "다음 상품", exact: true });

  const initial = await shoppingCarouselState(page);
  expect(initial.scrollWidth).toBeGreaterThan(initial.clientWidth);
  expect(initial.activePreview).toBe("3");
  await expect(previous).toHaveAttribute("aria-disabled", "true");
  await expect(next).toHaveAttribute("aria-disabled", "false");

  await carousel.focus();
  for (const [key, direction] of [["ArrowRight", "increase"], ["ArrowLeft", "decrease"]]) {
    const before = (await shoppingCarouselState(page)).scrollLeft;
    await page.keyboard.press(key);
    if (direction === "increase") {
      await expect.poll(async () => (await shoppingCarouselState(page)).scrollLeft).toBeGreaterThan(before);
    } else {
      await expect.poll(async () => (await shoppingCarouselState(page)).scrollLeft).toBeLessThan(before);
    }
    await expect(carousel).toBeFocused();
    await expectPreviewInvariant(page, 3);
  }

  await page.keyboard.press("End");
  await expect.poll(async () => {
    const state = await shoppingCarouselState(page);
    return Math.abs(state.scrollLeft - state.maxScrollLeft);
  }).toBeLessThanOrEqual(1);
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Home");
  await expect.poll(async () => (await shoppingCarouselState(page)).scrollLeft).toBeLessThanOrEqual(1);
  await expect(previous).toHaveAttribute("aria-disabled", "true");
  await expect(carousel).toBeFocused();
  await expectPreviewInvariant(page, 3);
});

test("@task6 carousel queues three rapid keyboard moves through the fourth product", async ({ page }) => {
  await openShoppingPreview(page);
  const carousel = page.getByRole("region", { name: "오늘의 PICK 상품 캐러셀", exact: true });
  const status = page.locator("#shopping-carousel-status");

  await carousel.focus();
  const cancelled = await carousel.evaluate((element) => Array.from({ length: 3 }, () => {
    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowRight",
    });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  }));

  expect(cancelled).toEqual([true, true, true]);
  await expect(status).toHaveText("4/4, 간단 앱 코딩");
  await expect(carousel).toBeFocused();
  await expectPreviewInvariant(page, 3);
});

test("@task6 carousel buttons keep trigger focus and synchronize both boundary states", async ({ page }) => {
  await openShoppingPreview(page);
  const previous = page.getByRole("button", { name: "이전 상품", exact: true });
  const next = page.getByRole("button", { name: "다음 상품", exact: true });

  await next.focus();
  await next.click();
  await expect.poll(async () => (await shoppingCarouselState(page)).scrollLeft).toBeGreaterThan(1);
  await expect(next).toBeFocused();
  await expectPreviewInvariant(page, 3);

  await page.locator("#shopping-pick-carousel").evaluate((scroller) => {
    scroller.scrollLeft = scroller.scrollWidth;
  });
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await page.setViewportSize({ width: 940, height: 900 });
  await expect.poll(async () => {
    const state = await shoppingCarouselState(page);
    return Math.abs(state.scrollLeft - state.maxScrollLeft);
  }).toBeLessThanOrEqual(1);
  await expect(next).toHaveAttribute("aria-disabled", "true");

  await previous.focus();
  await previous.click();
  await expect.poll(async () => {
    const state = await shoppingCarouselState(page);
    return state.maxScrollLeft - state.scrollLeft;
  }).toBeGreaterThan(1);
  await expect(previous).toBeFocused();
  await expectPreviewInvariant(page, 3);
});

test("@task6 carousel queues three rapid button moves through the fourth product", async ({ page }) => {
  await openShoppingPreview(page);
  const next = page.getByRole("button", { name: "다음 상품", exact: true });
  const status = page.locator("#shopping-carousel-status");

  await next.focus();
  await next.evaluate((button) => {
    button.click();
    button.click();
    button.click();
  });

  await expect(status).toHaveText("4/4, 간단 앱 코딩");
  await expect(next).toBeFocused();
  await expectPreviewInvariant(page, 3);
});

test("@task6 carousel pointer drag preserves focus, moves overflow, and releases capture", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openShoppingPreview(page);
  const carousel = page.getByRole("region", { name: "오늘의 PICK 상품 캐러셀", exact: true });
  const initial = await shoppingCarouselState(page);
  expect(initial.scrollWidth).toBeGreaterThan(initial.clientWidth);

  await page.locator("#preview-track").evaluate(async (track) => {
    await Promise.all(track.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
  });

  await carousel.evaluate((element) => {
    element.addEventListener("pointerdown", (event) => {
      window.__task6PointerId = event.pointerId;
    }, { once: true });
  });
  const dragPoints = await carousel.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const left = Math.max(0, bounds.left);
    const right = Math.min(window.innerWidth, bounds.right);
    const top = Math.max(0, bounds.top);
    const bottom = Math.min(window.innerHeight, bounds.bottom);
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);

    return {
      end: { x: left + width * 0.2, y: top + height * 0.5 },
      height,
      start: { x: left + width * 0.8, y: top + height * 0.5 },
      width,
    };
  });
  expect(dragPoints.width).toBeGreaterThan(1);
  expect(dragPoints.height).toBeGreaterThan(1);
  const hitTarget = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return {
      className: element?.className ?? null,
      insideCarousel: Boolean(element?.closest("#shopping-pick-carousel")),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      x,
      y,
    };
  }, dragPoints.start);
  expect(hitTarget.insideCarousel, JSON.stringify(hitTarget)).toBe(true);
  await page.mouse.move(dragPoints.start.x, dragPoints.start.y);
  await page.mouse.down();
  await page.mouse.move(dragPoints.end.x, dragPoints.end.y, { steps: 8 });
  await page.mouse.up();

  await expect.poll(async () => (await shoppingCarouselState(page)).scrollLeft).toBeGreaterThan(1);
  await expect(carousel).toBeFocused();
  await expect(carousel).not.toHaveClass(/is-dragging/);
  expect(await carousel.evaluate((element) => element.hasPointerCapture(window.__task6PointerId))).toBe(false);
  await expectPreviewInvariant(page, 3);
});

test("@task6 carousel announces only a newly settled product position", async ({ page }) => {
  await openShoppingPreview(page);
  await page.evaluate(() => {
    const status = document.querySelector("#shopping-carousel-status");
    window.__task6CarouselAnnouncements = [];
    new MutationObserver(() => {
      if (status.textContent) {
        window.__task6CarouselAnnouncements.push(status.textContent);
      }
    }).observe(status, { childList: true, characterData: true, subtree: true });
  });

  const carousel = page.getByRole("region", { name: "오늘의 PICK 상품 캐러셀", exact: true });
  await carousel.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#shopping-carousel-status")).toHaveText("2/4, 스탠딩 이미지 작업");
  await expect.poll(() => page.evaluate(() => window.__task6CarouselAnnouncements.length)).toBe(1);

  await carousel.evaluate((element) => {
    element.dispatchEvent(new Event("scroll"));
  });
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__task6CarouselAnnouncements)).toEqual(["2/4, 스탠딩 이미지 작업"]);
});

test("@task8-default contrast ledger selectors resolve in their declared preview panels", async ({ page }) => {
  await page.goto("/");

  for (const previewPage of PREVIEW_PAGES) {
    await page.locator(`#preview-tab-${previewPage.id}`).click();
    const contexts = CONTRAST_CONTEXTS.filter(({ pageId }) => pageId === previewPage.id);
    expect(contexts.length, `${previewPage.id} has contrast contexts`).toBeGreaterThan(0);

    for (const context of contexts) {
      if (context.activation === "passcode-digit") {
        await page.locator("#preview-panel-passcode [data-passcode-digit='1']").click();
      }
      await expect(page.locator(context.selector).first(), context.id).toBeAttached();
    }
  }
});

test("@task8-default every computable ledger context matches its activated rendered state", async ({ page }) => {
  await page.goto("/");

  for (const context of CONTRAST_CONTEXTS) {
    const declared = evaluateContrastContext(context, defaultThemeState.colors);
    if (declared.status !== "pass") {
      continue;
    }

    await page.locator(`#preview-tab-${context.pageId}`).click();
    await page.mouse.move(0, 0);
    if (context.activation === "passcode-digit") {
      await page.locator("#preview-panel-passcode [data-passcode-digit='1']").click();
    }

    const locator = page.locator(context.selector);
    const count = await locator.count();
    expect(count, `${context.id} resolves rendered nodes`).toBeGreaterThan(0);

    if (["text", "large-text"].includes(context.kind)) {
      const visibleText = await locator.evaluateAll((elements) => elements.map((element) => element.textContent.trim()));
      expect(visibleText.every(Boolean), `${context.id} represents real visible text`).toBe(true);
    }

    if (context.state === "hover") {
      await locator.first().hover();
    }

    let releasePressedState = false;
    if (context.state === "pressed") {
      const box = await locator.first().boundingBox();
      expect(box, `${context.id} has a pressed-state hit target`).not.toBeNull();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      releasePressedState = true;
    }

    const samples = await renderedContextSamples(locator, context);
    if (releasePressedState) {
      await page.mouse.up();
    }

    const expectedForeground = declaredForeground(context);
    const expectedBackground = declaredBackground(context);
    const expectedBacking = declaredBacking(context);
    for (const sample of samples) {
      expectRgbaClose(sample.foreground, expectedForeground, `${context.id} computed foreground`);
      if (expectedBacking) {
        expectRgbaClose(sample.backing, expectedBacking, `${context.id} CSS backing`);
      } else {
        expectRgbaClose(sample.background, expectedBackground, `${context.id} computed background`);
        expect(sample.ratio, `${context.id}: ${sample.foregroundCss} on ${sample.backgroundCss}`).toBeGreaterThanOrEqual(context.required);
      }
    }
  }
});

test("@task8-default bubble backing is painted above the bundled border image", async ({ page }) => {
  await page.goto("/");
  await page.locator("#preview-tab-chat").click();
  await page.evaluate(() => {
    const source = document.querySelector("#preview-panel-chat .send-bubble");
    const probe = source.cloneNode(false);
    probe.id = "bubble-paint-probe";
    probe.textContent = "";
    Object.assign(probe.style, {
      position: "fixed",
      top: "8px",
      left: "8px",
      zIndex: "9999",
      width: "120px",
      height: "80px",
    });
    document.body.append(probe);
  });

  const probe = page.locator("#bubble-paint-probe");
  await expect(probe).toBeVisible();
  const backedPixel = await screenshotCenterPixel(page, probe);
  await page.locator("html").evaluate((root) => root.style.setProperty("--preview-send-text-backing", "transparent"));
  const rasterPixel = await screenshotCenterPixel(page, probe);

  expect(backedPixel.a).toBe(255);
  expect(rasterPixel.a).toBe(255);
  expect(backedPixel.r).toBeLessThan(rasterPixel.r * 0.5);
  expect(backedPixel.g).toBeLessThan(rasterPixel.g * 0.5);
  expect(backedPixel.b).toBeLessThan(rasterPixel.b * 0.5);
});

async function screenshotCenterPixel(page, locator) {
  const screenshot = await locator.screenshot({ animations: "disabled" });
  return page.evaluate(async (base64) => {
    const response = await fetch(`data:image/png;base64,${base64}`);
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0);
    const [r, g, b, a] = context.getImageData(Math.floor(bitmap.width / 2), Math.floor(bitmap.height / 2), 1, 1).data;
    bitmap.close();
    return { r, g, b, a };
  }, screenshot.toString("base64"));
}

function resolveDeclaredColor(source) {
  if (typeof source === "string") {
    return parseCssHex(source);
  }
  const color = parseThemeArgb(defaultThemeState.colors[source.colorKey]);
  return source.alpha === undefined ? color : { ...color, a: color.a * source.alpha };
}

function declaredForeground(context) {
  const foreground = context.foregroundKey
    ? parseThemeArgb(defaultThemeState.colors[context.foregroundKey])
    : parseCssHex(context.foreground);
  return context.foregroundOpacity === undefined
    ? foreground
    : { ...foreground, a: foreground.a * context.foregroundOpacity };
}

function declaredBackground(context) {
  if (context.backgroundKey) {
    return parseThemeArgb(defaultThemeState.colors[context.backgroundKey]);
  }
  if (context.background) {
    return parseCssHex(context.background);
  }

  let background = resolveDeclaredColor(context.backgroundLayers[0]);
  for (const layer of context.backgroundLayers.slice(1)) {
    background = compositeColors(resolveDeclaredColor(layer), background);
  }
  return background;
}

function declaredBacking(context) {
  if (!context.backingSelector && !context.backingPseudo) {
    return null;
  }
  if (context.background) {
    return parseCssHex(context.background);
  }
  return resolveDeclaredColor(context.backgroundLayers.at(-1));
}

function expectRgbaClose(actual, expected, label) {
  expect(actual, `${label} exists`).not.toBeNull();
  expect(expected, `${label} is declared`).not.toBeNull();
  for (const channel of ["r", "g", "b"]) {
    expect(Math.abs(actual[channel] - expected[channel]), `${label} ${channel}`).toBeLessThanOrEqual(1);
  }
  expect(Math.abs(actual.a - expected.a), `${label} alpha`).toBeLessThanOrEqual(0.01);
}

async function renderedContextSamples(locator, context) {
  return locator.evaluateAll((elements, definition) => {
    const parseColor = (value) => {
      const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
      if (channels.length < 3) {
        return null;
      }
      const scale = value.trim().startsWith("color(srgb") ? 255 : 1;
      return { r: channels[0] * scale, g: channels[1] * scale, b: channels[2] * scale, a: channels[3] ?? 1 };
    };
    const composite = (foreground, background) => ({
      r: foreground.r * foreground.a + background.r * (1 - foreground.a),
      g: foreground.g * foreground.a + background.g * (1 - foreground.a),
      b: foreground.b * foreground.a + background.b * (1 - foreground.a),
      a: foreground.a + background.a * (1 - foreground.a),
    });
    const luminance = ({ r, g, b }) => {
      const channel = (value) => {
        const srgb = value / 255;
        return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const effectiveBackground = (element) => {
      const layers = [];
      for (let current = element; current instanceof Element; current = current.parentElement) {
        const layer = parseColor(getComputedStyle(current).backgroundColor);
        if (layer?.a > 0) {
          layers.push(layer);
        }
        if (layer?.a === 1) {
          break;
        }
      }
      let result = { r: 255, g: 255, b: 255, a: 1 };
      for (const layer of layers.reverse()) {
        result = composite(layer, result);
      }
      return result;
    };

    return elements.map((element) => {
      const foregroundStyle = getComputedStyle(element, definition.foregroundPseudo || null);
      const foregroundProperty = definition.foregroundProperty || "color";
      const foregroundCss = foregroundStyle.getPropertyValue(foregroundProperty);
      const foreground = parseColor(foregroundCss);

      let background;
      if (definition.backgroundSource === "foreground-pseudo") {
        background = parseColor(foregroundStyle.backgroundColor);
      } else {
        const start = definition.backgroundSource === "parent" ? element.parentElement : element;
        background = effectiveBackground(start);
      }

      let backing = null;
      if (definition.backingSelector || definition.backingPseudo) {
        const backingElement = definition.backingSelector
          ? element.closest(definition.backingSelector)
          : element;
        backing = parseColor(getComputedStyle(backingElement, definition.backingPseudo || null).backgroundColor);
      }

      const effectiveForeground = composite(foreground, background);
      const foregroundLuminance = luminance(effectiveForeground);
      const backgroundLuminance = luminance(background);
      const ratio = (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);

      return {
        foreground,
        foregroundCss,
        background,
        backgroundCss: `rgb(${background.r}, ${background.g}, ${background.b})`,
        backing,
        ratio,
      };
    });
  }, context);
}

test("@task8-user shows the default current-page and all-page contrast report without gating downloads", async ({ page }) => {
  await page.goto("/");

  const expected = evaluateThemeContrast({ colors: defaultThemeState.colors });
  const current = expected.byPage["chat-list"];
  const currentSummary = page.locator("#contrast-current-summary");

  await expect(page.locator("#contrast-current-report")).toBeVisible();
  await expect(currentSummary).toContainText("대화 목록");
  await expect(currentSummary).toContainText(`통과 ${current.passCount}개`);
  await expect(currentSummary).toContainText(`미달 ${current.failCount}개`);
  await expect(currentSummary).toContainText(`자동 확인 불가 ${current.unknownCount}개`);
  await expect(page.locator("#contrast-current-results > li")).toHaveCount(current.results.length);
  await expect(page.locator("#theme-contrast-pages > li")).toHaveCount(PREVIEW_PAGES.length);
  await expect(page.locator("#theme-contrast-summary")).toContainText("최저");
  await expect(page.locator("#theme-contrast-summary")).toContainText("다운로드할 수 있습니다");
  for (const previewPage of PREVIEW_PAGES) {
    await expect(page.locator(`[data-contrast-page="${previewPage.id}"]`)).toContainText(previewPage.label);
  }
  await expect(page.locator("#download-ios")).toBeEnabled();
  await expect(page.locator("#download-android")).toBeEnabled();
});

test("@task8-user matches token-mixed more and selected-theme surfaces under adversarial colors", async ({ page }) => {
  await page.goto("/");
  const colors = {
    ...defaultThemeState.colors,
    mainBackground: "#000000",
    headerText: "#000000",
    titleText: "#000000",
    sectionTitle: "#000000",
  };

  await page.getByRole("tab", { name: "더보기", exact: true }).click();
  await fillThemeHexColor(page, "mainBackground", colors.mainBackground);
  await fillThemeHexColor(page, "headerText", colors.headerText);
  await fillThemeHexColor(page, "titleText", colors.titleText);

  const moreReport = evaluateThemeContrast({ colors, contexts: CONTRAST_CONTEXTS });
  for (const id of ["more-service-icon", "more-service-title"]) {
    const context = CONTRAST_CONTEXTS.find(({ id: contextId }) => contextId === id);
    const modelResult = moreReport.results.find(({ id: contextId }) => contextId === id);
    const [rendered] = await renderedContextSamples(page.locator(context.selector), context);
    expect(modelResult.status, `${id} model status`).toBe("fail");
    expect(rendered.ratio, `${id} rendered/model ratio`).toBeCloseTo(modelResult.ratio, 2);
    await expect(page.locator(`[data-contrast-context="${id}"]`)).toContainText("미달");
  }

  await page.getByRole("tab", { name: "테마 목록", exact: true }).click();
  await fillThemeHexColor(page, "sectionTitle", colors.sectionTitle);
  const themeReport = evaluateThemeContrast({ colors, contexts: CONTRAST_CONTEXTS });
  const context = CONTRAST_CONTEXTS.find(({ id }) => id === "theme-list-secondary-selected");
  const modelResult = themeReport.results.find(({ id }) => id === context.id);
  const [rendered] = await renderedContextSamples(page.locator(context.selector), context);
  expect(modelResult.status).toBe("fail");
  expect(rendered.ratio).toBeCloseTo(modelResult.ratio, 2);
  await expect(page.locator(`[data-contrast-context="${context.id}"]`)).toContainText("미달");
});

test("@task8-user treats translucent more backings as unknown while fixed-white theme mixes stay numeric", async ({ page }) => {
  await page.goto("/");
  const colors = {
    ...defaultThemeState.colors,
    mainBackground: "#80000000",
    headerText: "#FFFFFFFF",
    titleText: "#FFFFFFFF",
    sectionTitle: "#7F000000",
  };
  const moreContextIds = [
    "more-service-icon",
    "more-service-title",
    "more-page-dot-default",
    "more-page-dot-selected",
  ];

  await page.getByRole("tab", { name: "더보기", exact: true }).click();
  await fillThemeHexColor(page, "mainBackground", colors.mainBackground);
  await fillThemeHexColor(page, "headerText", colors.headerText);
  await fillThemeHexColor(page, "titleText", colors.titleText);

  const titleContext = CONTRAST_CONTEXTS.find(({ id }) => id === "more-service-title");
  const [renderedTitle] = await renderedContextSamples(page.locator(titleContext.selector), titleContext);
  const clearedReport = evaluateThemeContrast({ colors, contexts: CONTRAST_CONTEXTS });
  const servicePanelAlpha = await page.locator("#preview-panel-more .more-service-panel").evaluate((element) => {
    const channels = getComputedStyle(element).backgroundColor.match(/[\d.]+/g)?.map(Number) ?? [];
    return channels[3] ?? 1;
  });
  expect(renderedTitle.ratio).toBeCloseTo(4.5996, 2);
  expect(servicePanelAlpha).toBeLessThan(1);
  expect(clearedReport.results.find(({ id }) => id === titleContext.id).status).toBe("unknown");
  for (const id of moreContextIds) {
    const result = page.locator(`[data-contrast-context="${id}"]`);
    await expect(result).toContainText("자동 확인 불가");
    await expect(result).toContainText("투명 색상");
  }
  const mainDescription = page.locator("#color-contrast-description-mainBackground");
  await expect(mainDescription).toContainText("자동 확인 불가");
  await expect(mainDescription).toContainText("더보기 서비스 이름");
  await expect(page.locator("#contrast-current-summary")).toContainText("설정은 유지");
  await expect(page.locator("#download-ios")).toBeEnabled();

  await page.locator("#upload-input-mainBackground").setInputFiles({
    name: "translucent-backing.png",
    mimeType: "image/png",
    buffer: await createPngBuffer(page, 32, 32, "#ffffff"),
  });
  await expect(page.locator("html")).toHaveCSS("--preview-main-image", /blob:/);
  await expect(page.locator("#preview-panel-more .more-screen")).toHaveCSS("background-image", /blob:/);
  const userImageReport = evaluateThemeContrast({
    colors,
    imageStates: { mainBackground: "user" },
    contexts: CONTRAST_CONTEXTS,
  });
  for (const id of moreContextIds) {
    expect(userImageReport.results.find(({ id: resultId }) => resultId === id).status).toBe("unknown");
    await expect(page.locator(`[data-contrast-context="${id}"]`)).toContainText("자동 확인 불가");
  }

  await page.getByRole("tab", { name: "테마 목록", exact: true }).click();
  await fillThemeHexColor(page, "sectionTitle", colors.sectionTitle);
  const themeReport = evaluateThemeContrast({ colors, contexts: CONTRAST_CONTEXTS });
  for (const id of ["theme-list-title-selected", "theme-list-secondary-selected", "theme-list-choice-selected"]) {
    const themeContext = CONTRAST_CONTEXTS.find(({ id: contextId }) => contextId === id);
    const themeResult = themeReport.results.find(({ id: resultId }) => resultId === id);
    const [renderedTheme] = await renderedContextSamples(page.locator(themeContext.selector), themeContext);
    expect(themeResult.status, id).not.toBe("unknown");
    expect(renderedTheme.ratio, id).toBeCloseTo(themeResult.ratio, 2);
    await expect(page.locator(`[data-contrast-context="${id}"]`)).toContainText(
      `${themeResult.ratio.toFixed(2)}:1`,
    );
  }
});

for (const { width, height } of [
  { width: 1280, height: 800 },
  { width: 760, height: 800 },
  { width: 390, height: 844 },
  { width: 320, height: 700 },
]) {
  test(`@task8-user keeps the final content and contrast footer reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect.poll(() => page.evaluate(() => {
      const footer = document.querySelector(".download-bar");
      const main = document.querySelector(".app-shell");
      if (getComputedStyle(footer).position !== "fixed") {
        return true;
      }
      return Number.parseFloat(getComputedStyle(main).paddingBottom) >= footer.getBoundingClientRect().height - 1;
    })).toBe(true);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    const geometry = await page.evaluate(() => {
      const footer = document.querySelector(".download-bar");
      const main = document.querySelector(".app-shell");
      const report = document.querySelector("#theme-contrast-report");
      const footerRect = footer.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();
      const reportRect = report.getBoundingClientRect();
      const fixed = getComputedStyle(footer).position === "fixed";
      const lastContent = ["#settings-form", "#upload-controls", "#preview-frame"].map((selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return { selector, bottom: rect.bottom };
      });

      return {
        fixed,
        footerHeight: footerRect.height,
        footerTop: footerRect.top,
        footerBottom: footerRect.bottom,
        mainBottom: mainRect.bottom,
        paddingBottom: Number.parseFloat(getComputedStyle(main).paddingBottom),
        reportTop: reportRect.top,
        reportBottom: reportRect.bottom,
        lastContent,
        maxScrollReached: Math.abs(
          window.scrollY - (document.documentElement.scrollHeight - window.innerHeight),
        ) <= 1,
        viewportHeight: window.innerHeight,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(geometry.maxScrollReached).toBe(true);
    expect(geometry.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(geometry.reportTop).toBeGreaterThanOrEqual(-1);
    expect(geometry.reportBottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
    if (width > 760) {
      expect(geometry.fixed).toBe(true);
      expect(geometry.paddingBottom).toBeGreaterThanOrEqual(geometry.footerHeight - 1);
      for (const target of geometry.lastContent) {
        expect(target.bottom, `${target.selector} clears the fixed footer`).toBeLessThanOrEqual(geometry.footerTop + 1);
      }
    } else {
      expect(geometry.fixed).toBe(false);
      expect(geometry.paddingBottom).toBe(0);
      expect(geometry.mainBottom).toBeLessThanOrEqual(geometry.footerTop + 1);
      expect(geometry.footerBottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
    }
  });
}

test("@task8-user retains a low color and reports ratio, threshold, failed screens, and download policy", async ({ page }) => {
  await page.goto("/");

  const { input } = await fillThemeHexColor(page, "headerText", defaultThemeState.colors.mainBackground);
  const failedContext = page.locator('[data-contrast-context="chat-list-header-title"]');

  await expect(input).toHaveValue(defaultThemeState.colors.mainBackground);
  await expect(page.locator("#color-value-headerText")).toHaveText(defaultThemeState.colors.mainBackground);
  await expect(failedContext).toContainText("미달");
  await expect(failedContext).toContainText("1.00:1");
  await expect(failedContext).toContainText("기준 4.50:1");
  await expect(page.locator("#contrast-current-summary")).toContainText("설정은 유지");
  await expect(page.locator("#contrast-current-summary")).toContainText("다운로드할 수 있습니다");
  await expect(page.locator("#theme-contrast-summary")).toContainText("미달 화면");
  await expect(page.locator("#theme-contrast-pages > li")).toHaveCount(PREVIEW_PAGES.length);
  await expect(input).not.toHaveAttribute("aria-invalid");
  await expect(page.locator("#download-ios")).toBeEnabled();
  await expect(page.locator("#download-android")).toBeEnabled();
});

test("@task8-user changes the current-page report while retaining the global low-color result", async ({ page }) => {
  await page.goto("/");
  await fillThemeHexColor(page, "headerText", defaultThemeState.colors.mainBackground);
  const globalBefore = await page.locator("#theme-contrast-report").innerText();

  await page.getByRole("tab", { name: "잠금화면", exact: true }).click();

  await expect(page.locator("#contrast-current-summary")).toContainText("잠금화면");
  await expect(page.locator("#contrast-current-results > li")).toHaveCount(
    CONTRAST_CONTEXTS.filter(({ pageId }) => pageId === "passcode").length,
  );
  expect(await page.locator("#theme-contrast-report").innerText()).toBe(globalBefore);
  await expect(page.locator('[data-contrast-page="chat-list"]')).toContainText("미달");
});

test("@task8-user makes only relevant unprotected image contexts unknown and delete restores numeric results", async ({ page }) => {
  await page.goto("/");

  const titleResult = page.locator('[data-contrast-context="chat-list-header-title"]');
  await expect(titleResult).toContainText("통과");
  await expect(titleResult).toContainText(/\d+\.\d{2}:1/);

  await page.locator("#upload-input-mainBackground").setInputFiles({
    name: "unknown-main.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });
  await expect(titleResult).toContainText("자동 확인 불가");
  await expect(page.locator('[data-contrast-context="chat-list-status"]')).toContainText("통과");

  await page.getByRole("button", { name: "메인 배경 삭제", exact: true }).click();
  await expect(titleResult).toContainText("통과");
  await expect(titleResult).toContainText(/\d+\.\d{2}:1/);
  await expect(titleResult).not.toContainText("자동 확인 불가");
});

test("@task8-user restores an uploaded bubble to the bundled default without clear semantics", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "채팅방", exact: true }).click();

  const restore = page.getByRole("button", { name: "나의 말풍선 - 기본 기본 이미지 복원", exact: true });
  const state = page.locator('[data-upload-state="sendBubbleNormal"]');
  await expect(restore).toBeDisabled();
  await expect(state).toHaveText("기본 이미지");

  await page.locator("#upload-input-sendBubbleNormal").setInputFiles({
    name: "custom-bubble.png",
    mimeType: "image/png",
    buffer: await createPngBuffer(page, 120, 105),
  });
  await expect(restore).toBeEnabled();
  await expect(state).toContainText("custom-bubble.png");
  await expect(page.locator("html")).toHaveCSS("--preview-send-image", /blob:/);

  await restore.click();
  await expect(restore).toBeDisabled();
  await expect(state).toHaveText("기본 이미지");
  await expect(page.locator('[data-upload-thumb="sendBubbleNormal"]')).not.toHaveCSS("background-image", /blob:/);
  await expect(page.locator("html")).not.toHaveCSS("--preview-send-image", /blob:/);
  await expect(page.locator('[data-upload-clear="sendBubbleNormal"]')).toHaveCount(0);
  await expect(page.locator('[data-contrast-context="chat-send-bubble-normal"]')).toContainText(/통과|자동 확인 불가/);
});

test("@task8-user links picker, HEX, and native color controls to one active-page result description", async ({ page }) => {
  await page.goto("/");

  const row = page.locator(".color-row").filter({ has: page.locator("#color-label-mainBackground") });
  const description = row.locator("#color-contrast-description-mainBackground");
  await expect(description).toBeVisible();
  await expect(description).toContainText("대비");
  for (const control of [
    row.locator(".color-picker-control"),
    row.locator("#color-hex-mainBackground"),
    row.locator("#color-mainBackground"),
  ]) {
    await expect(control).toHaveAttribute("aria-describedby", "color-contrast-description-mainBackground");
    await expect(control).toHaveAccessibleDescription(await description.innerText());
  }
  await expect(row.locator("#color-hex-mainBackground")).not.toHaveAttribute("aria-errormessage");
});

test("@task8-user leaves contrast output and announcements unchanged for an invalid HEX draft", async ({ page }) => {
  await page.goto("/");
  await installContrastLiveRegionRecorder(page);
  const currentBefore = await page.locator("#contrast-current-report").innerText();
  const globalBefore = await page.locator("#theme-contrast-report").innerText();

  const { input } = await fillThemeHexColor(page, "mainBackground", "#12GG");
  await input.press("Enter");
  await page.waitForTimeout(350);

  await expect(input).toHaveValue("#12GG");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAttribute("aria-errormessage", "color-hex-error-mainBackground");
  expect(await page.locator("#contrast-current-report").innerText()).toBe(currentBefore);
  expect(await page.locator("#theme-contrast-report").innerText()).toBe(globalBefore);
  expect(await contrastAnnouncements(page)).toEqual([]);
});

test("@task8-user updates visual results immediately but merges rapid color speech into one debounce", async ({ page }) => {
  await page.goto("/");
  await installContrastLiveRegionRecorder(page);
  const { input } = await fillThemeHexColor(page, "headerText", "#111111");
  await expect(page.locator("#color-value-headerText")).toHaveText("#111111");
  await input.fill("#222222");
  await expect(page.locator("#color-value-headerText")).toHaveText("#222222");
  await input.fill("#333333");
  await expect(page.locator("#color-value-headerText")).toHaveText("#333333");
  await expect(input).toBeFocused();

  await page.waitForTimeout(180);
  expect(await contrastAnnouncements(page)).toEqual([]);
  await expect.poll(async () => (await contrastAnnouncements(page)).length).toBe(1);
  expect((await contrastAnnouncements(page))[0]).toContain("대비");
});

test("@task8-user cancels pending color speech and reannounces identical discrete resets", async ({ page }) => {
  await page.goto("/");
  await installContrastLiveRegionRecorder(page);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await fillThemeHexColor(page, "headerText", defaultThemeState.colors.mainBackground);
    const reset = page.getByRole("button", { name: "메인 글자 색 초기화", exact: true });
    await reset.click();
    await expect.poll(async () => (await contrastAnnouncements(page)).length).toBe(attempt);
  }

  const announcements = await contrastAnnouncements(page);
  expect(announcements).toHaveLength(2);
  expect(announcements[0]).toBe(announcements[1]);
  expect(announcements[0]).toContain("통과");
  expect(announcements[0]).toContain("미달");
  expect(announcements[0]).toContain("자동 확인 불가");
  await expect(page.locator("#contrast-current-summary")).toContainText("미달 0개");
  await expect(page.locator("#theme-contrast-summary")).toContainText("미달 화면 0개");
});

test("@task8-user queues synchronous discrete page and reset announcements in FIFO order", async ({ page }) => {
  await page.goto("/");
  await installAllLiveRegionRecorder(page);

  await page.evaluate(() => {
    document.querySelector("#preview-next").click();
    document.querySelector("#preview-next").click();
  });
  await expect.poll(async () => (await allLiveAnnouncements(page)).filter(({ id }) => id === "preview-status").length).toBe(2);
  const pageMessages = (await allLiveAnnouncements(page)).filter(({ id }) => id === "preview-status");
  expect(pageMessages[0].text).toContain("지금 프리뷰, 3/10");
  expect(pageMessages[1].text).toContain("쇼핑 프리뷰, 4/10");

  await fillThemeHexColor(page, "headerText", "#111111");
  await fillThemeHexColor(page, "mainBackground", "#222222");
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__allLiveAnnouncements = [];
    document.querySelector("#color-label-headerText").closest(".color-row").querySelector(".color-reset-button").click();
    document.querySelector("#color-label-mainBackground").closest(".color-row").querySelector(".color-reset-button").click();
  });

  await expect.poll(async () => (await allLiveAnnouncements(page)).filter(({ id }) => id === "contrast-status").length).toBe(2);
  const resetMessages = (await allLiveAnnouncements(page)).filter(({ id }) => id === "contrast-status");
  expect(resetMessages).toHaveLength(2);
  expect(resetMessages.every(({ text }) => text.includes("대비") && text.includes("통과"))).toBe(true);
});

test("@task8-user publishes one combined live message for arrows and none for roving tabs", async ({ page }) => {
  await page.goto("/");
  await installAllLiveRegionRecorder(page);

  await page.locator("#preview-next").click();
  await expect.poll(async () => (await allLiveAnnouncements(page)).length).toBeGreaterThan(0);
  await page.waitForTimeout(50);
  let messages = await allLiveAnnouncements(page);
  expect(messages).toHaveLength(1);
  expect(messages[0].id).toBe("preview-status");
  expect(messages[0].text).toContain("지금 프리뷰, 3/10");
  expect(messages[0].text).toMatch(/통과 \d+개, 미달 \d+개, 자동 확인 불가 \d+개/);

  await page.evaluate(() => { window.__allLiveAnnouncements = []; });
  const tabs = page.locator('#preview-tabs > button[role="tab"]');
  await tabs.nth(2).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Home");
  await page.keyboard.press("End");
  await tabs.nth(4).click();
  await page.waitForTimeout(300);
  messages = await allLiveAnnouncements(page);
  expect(messages).toEqual([]);
});

test("@task8-user keeps existing status channels untouched by color contrast updates", async ({ page }) => {
  await page.goto("/");
  const before = await page.locator("#status-text, #error-status, #preview-status").allTextContents();

  await fillThemeHexColor(page, "headerText", defaultThemeState.colors.mainBackground);
  await page.waitForTimeout(300);

  expect(await page.locator("#status-text, #error-status, #preview-status").allTextContents()).toEqual(before);
  await expect(page.locator("#contrast-status")).not.toBeEmpty();
});

test("@task8-user low-contrast content leaves app chrome and warning UI axe-clean", async ({ page }) => {
  await page.goto("/");
  await fillThemeHexColor(page, "headerText", defaultThemeState.colors.mainBackground);

  const results = await new AxeBuilder({ page })
    .exclude("#preview-frame")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});

test("@task9-focus renders essential control boundaries at three-to-one contrast", async ({ page }) => {
  await page.goto("/");
  await page.locator(".color-picker-control").first().click();

  const controlCases = [
    ["theme name", page.locator("#app-name")],
    ["theme id", page.locator(".package-input")],
    ["author", page.locator(".author-input")],
    ["color picker", page.locator(".color-picker-control").first()],
    ["HEX input", page.locator(".color-hex-input").first()],
    ["native color input", page.locator(".color-native-input").first()],
    ["color reset", page.locator(".color-reset-button").first()],
    ["file upload", page.locator(".file-button").first()],
    ["tint control", page.locator(".upload-tint-control").first()],
    ["device picker", page.locator(".device-picker")],
    ["preview previous", page.locator("#preview-previous")],
    ["preview tabs", page.locator("#preview-tabs")],
  ];

  for (const [name, locator] of controlCases) {
    const colors = await locator.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        border: style.borderTopColor,
        borderWidth: Number.parseFloat(style.borderTopWidth),
      };
    });
    expect(colors.borderWidth, `${name} has a perceivable boundary`).toBeGreaterThanOrEqual(1);
    expect(computedContrast(colors.border, colors.background), `${name} boundary contrast`).toBeGreaterThanOrEqual(3);
  }
});

test("@task9-focus exposes three-pixel unclipped focus rings through actual Tab navigation", async ({ page }) => {
  await page.goto("/");

  const focusCases = [
    {
      name: "theme name",
      target: page.locator("#app-name"),
      proxy: page.locator("#app-name"),
      adjacentBackground: "rgb(255, 255, 255)",
    },
    {
      name: "theme id wrapper",
      target: page.locator("#theme-id-segment"),
      proxy: page.locator(".package-input"),
      adjacentBackground: "rgb(255, 255, 255)",
    },
    {
      name: "selected preview tab",
      target: page.locator('#preview-tabs > button[aria-selected="true"]'),
      proxy: page.locator('#preview-tabs > button[aria-selected="true"]'),
      adjacentBackground: "rgb(241, 242, 243)",
    },
    {
      name: "file label",
      target: page.locator("#upload-input-mainBackground"),
      proxy: page.locator('label.file-button[for="upload-input-mainBackground"]'),
      adjacentBackground: "rgb(255, 255, 255)",
    },
  ];

  for (const { name, target, proxy, adjacentBackground } of focusCases) {
    await tabTo(page, target);
    const appearance = await focusGeometry(proxy);
    expect(appearance.outlineStyle, `${name} ring style`).toBe("solid");
    expect(appearance.outlineWidth, `${name} ring width`).toBeGreaterThanOrEqual(3);
    expect(computedContrast(appearance.outlineColor, adjacentBackground), `${name} ring contrast`).toBeGreaterThanOrEqual(3);
    expect(appearance.focusBounds.left, `${name} ring starts in viewport`).toBeGreaterThanOrEqual(-1);
    expect(appearance.focusBounds.top, `${name} ring starts in viewport`).toBeGreaterThanOrEqual(-1);
    expect(appearance.focusBounds.right, `${name} ring ends in viewport`).toBeLessThanOrEqual(appearance.viewport.width + 1);
    expect(appearance.focusBounds.bottom, `${name} ring ends in viewport`).toBeLessThanOrEqual(appearance.viewport.height + 1);
    expect(appearance.clippedBy, `${name} ring clears every clip ancestor`).toEqual([]);
  }
});

test("@task9-focus gives the selected preview tab a contrasting internal three-pixel indicator", async ({ page }) => {
  await page.goto("/");

  const indicator = await page.locator('#preview-tabs > button[aria-selected="true"]').evaluate((element) => {
    const buttonStyle = getComputedStyle(element);
    const style = getComputedStyle(element, "::after");
    return {
      background: style.backgroundColor,
      buttonBackground: buttonStyle.backgroundColor,
      bottom: Number.parseFloat(style.bottom),
      content: style.content,
      height: Number.parseFloat(style.height),
      left: Number.parseFloat(style.left),
      position: style.position,
      right: Number.parseFloat(style.right),
    };
  });

  expect(indicator.content).not.toBe("none");
  expect(indicator.position).toBe("absolute");
  expect(indicator.height).toBeGreaterThanOrEqual(3);
  expect(indicator.bottom).toBeGreaterThanOrEqual(0);
  expect(indicator.left).toBeGreaterThanOrEqual(0);
  expect(indicator.right).toBeGreaterThanOrEqual(0);
  expect(computedContrast(indicator.background, indicator.buttonBackground)).toBeGreaterThanOrEqual(3);
});

test("@task9-focus keeps proxy and small control hit areas at least twenty-four CSS pixels", async ({ page }) => {
  await page.goto("/");
  const tintCheckbox = page.locator('.upload-tint-control input[type="checkbox"]').first();
  await tintCheckbox.check();
  await page.locator(".color-picker-control").first().click();

  const initialTargets = [
    ["file label", page.locator(".file-button").first()],
    ["tint checkbox label", page.locator(".upload-tint-checkbox-label").first()],
    ["tint checkbox", tintCheckbox],
    ["tint color", page.locator(".upload-tint-color").first()],
    ["native theme color", page.locator(".color-native-input").first()],
  ];

  for (const [name, locator] of initialTargets) {
    const bounds = await locator.boundingBox();
    expect(bounds, `${name} is rendered`).not.toBeNull();
    expect(bounds.width, `${name} target width`).toBeGreaterThanOrEqual(24);
    expect(bounds.height, `${name} target height`).toBeGreaterThanOrEqual(24);
  }

  await page.getByRole("tab", { name: "말풍선 상세", exact: true }).click();
  const fitOptions = page.locator(".nine-patch-fit-option label");
  await expect(fitOptions).toHaveCount(2);
  for (const label of await fitOptions.all()) {
    const bounds = await label.boundingBox();
    expect(bounds.width, "hidden radio label width").toBeGreaterThanOrEqual(24);
    expect(bounds.height, "hidden radio label height").toBeGreaterThanOrEqual(24);
  }

  const ranges = page.locator('.nine-patch-control input[type="range"]');
  await expect(ranges).toHaveCount(8);
  for (const range of await ranges.all()) {
    const bounds = await range.boundingBox();
    expect(bounds.width, "range target width").toBeGreaterThanOrEqual(24);
    expect(bounds.height, "range target height").toBeGreaterThanOrEqual(24);
  }

  const fitLayout = await page.locator(".nine-patch-fit-control").evaluate((fieldset) => {
    const fieldsetBounds = fieldset.getBoundingClientRect();
    const legendBounds = fieldset.querySelector("legend").getBoundingClientRect();
    const optionsBounds = fieldset.querySelector(".nine-patch-fit-options").getBoundingClientRect();
    return {
      fieldsetLeft: fieldsetBounds.left,
      legendRight: legendBounds.right,
      optionsLeft: optionsBounds.left,
      optionsWidth: optionsBounds.width,
    };
  });
  expect(fitLayout.optionsWidth).toBeGreaterThanOrEqual(48);
  expect(fitLayout.optionsLeft).toBeGreaterThanOrEqual(fitLayout.legendRight);
  expect(fitLayout.optionsLeft).toBeGreaterThan(fitLayout.fieldsetLeft);
});

test("@task9-focus uses a bright and dark internal double ring for controls over preview imagery", async ({ page }) => {
  await page.goto("/");
  const bubbleTab = page.getByRole("tab", { name: "말풍선 상세", exact: true });
  await bubbleTab.click();
  const imageControl = page.getByRole("button", { name: "다음 말풍선", exact: true });
  await tabTo(page, imageControl);

  const appearance = await focusGeometry(imageControl);
  expect(appearance.outlineStyle).toBe("solid");
  expect(appearance.outlineWidth).toBeGreaterThanOrEqual(3);
  expect(appearance.boxShadow).toContain("rgb(255, 255, 255)");
  expect(appearance.boxShadow).toContain("rgb(11, 107, 95)");
  expect(appearance.clippedBy).toEqual([]);
});

for (const previewDevice of ["phone", "tablet"]) {
  test(`@task9-focus keeps every ${previewDevice} nine-patch control and preview inside its own region`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "말풍선 상세", exact: true }).click();
    await page.locator(`[data-preview-device="${previewDevice}"]`).click();

    const geometry = await page.locator("#preview-panel-bubble-detail").evaluate((panel) => {
      const editor = panel.querySelector(".bubble-detail-panel");
      const stage = panel.querySelector(".nine-patch-stage");
      const preview = panel.querySelector(".nine-patch-preview");
      const rect = (element) => {
        const bounds = element.getBoundingClientRect();
        return {
          bottom: bounds.bottom,
          height: bounds.height,
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
          width: bounds.width,
        };
      };
      const editorRect = rect(editor);
      const targetRects = [
        ...editor.querySelectorAll(".nine-patch-fit-option label, .nine-patch-control input[type=range]"),
      ].map((element) => ({
        id: element.htmlFor || element.id,
        ...rect(element),
      }));
      const rows = [...editor.querySelectorAll(".nine-patch-fit-control, .nine-patch-control")].map((fieldset) => {
        const legendRect = rect(fieldset.querySelector("legend"));
        const fieldsRect = rect(fieldset.querySelector(".nine-patch-fit-options, .nine-patch-control-fields"));
        return {
          fieldsRect,
          legend: fieldset.querySelector("legend").textContent,
          legendRect,
          verticalOverlap: Math.min(legendRect.bottom, fieldsRect.bottom) - Math.max(legendRect.top, fieldsRect.top),
        };
      });

      return {
        editor: {
          clientHeight: editor.clientHeight,
          rect: editorRect,
          scrollHeight: editor.scrollHeight,
          scrollTop: editor.scrollTop,
        },
        preview: rect(preview),
        rows,
        stage: rect(stage),
        targetRects,
      };
    });

    expect(geometry.editor.scrollTop).toBe(0);
    expect(
      geometry.editor.scrollHeight,
      `${previewDevice} controls need no initial scrolling: ${JSON.stringify(geometry.rows)}`,
    ).toBeLessThanOrEqual(
      geometry.editor.clientHeight + 1,
    );
    expect(geometry.targetRects).toHaveLength(10);
    for (const target of geometry.targetRects) {
      expect(target.width, `${previewDevice} ${target.id} width`).toBeGreaterThanOrEqual(24);
      expect(target.height, `${previewDevice} ${target.id} height`).toBeGreaterThanOrEqual(24);
      expect(target.top, `${previewDevice} ${target.id} starts in editor`).toBeGreaterThanOrEqual(
        geometry.editor.rect.top - 1,
      );
      expect(target.bottom, `${previewDevice} ${target.id} ends in editor`).toBeLessThanOrEqual(
        geometry.editor.rect.bottom + 1,
      );
    }
    for (const row of geometry.rows) {
      expect(row.verticalOverlap, `${previewDevice} ${row.legend} legend aligns with its fields`).toBeGreaterThan(0);
    }

    expect(geometry.preview.width).toBeGreaterThan(0);
    expect(geometry.preview.height).toBeGreaterThan(0);
    expect(geometry.preview.left).toBeGreaterThanOrEqual(geometry.stage.left - 1);
    expect(geometry.preview.right).toBeLessThanOrEqual(geometry.stage.right + 1);
    expect(geometry.preview.top).toBeGreaterThanOrEqual(geometry.stage.top - 1);
    expect(geometry.preview.bottom).toBeLessThanOrEqual(geometry.stage.bottom + 1);
    expect(geometry.preview.bottom, `${previewDevice} preview clears the editor`).toBeLessThanOrEqual(
      geometry.editor.rect.top + 1,
    );
  });
}

test("@task9-focus changes stable rendered pixels on the selected tab indicator edge", async ({ page }) => {
  await page.goto("/");
  const selectedTab = page.getByRole("tab", { name: "대화 목록", exact: true });
  const selectedPng = await selectedTab.screenshot({ animations: "disabled" });
  const selectedRepeatPng = await selectedTab.screenshot({ animations: "disabled" });

  await page.getByRole("tab", { name: "지금", exact: true }).click();
  const unselectedPng = await selectedTab.screenshot({ animations: "disabled" });
  const unselectedRepeatPng = await selectedTab.screenshot({ animations: "disabled" });

  const selected = decodeScreenshotPng(selectedPng);
  const selectedRepeat = decodeScreenshotPng(selectedRepeatPng);
  const unselected = decodeScreenshotPng(unselectedPng);
  const unselectedRepeat = decodeScreenshotPng(unselectedRepeatPng);
  const indicatorColor = [11, 107, 95, 255];
  const expectedIndicatorEdge = (x, y, width, height) => y >= height - 3 && x >= 8 && x < width - 8;
  const selectedIndicatorPixels = countScreenshotPixels(selected, indicatorColor, expectedIndicatorEdge);
  expect(selectedIndicatorPixels).toBeGreaterThanOrEqual((selected.width - 18) * 2);
  expect(countScreenshotPixels(selectedRepeat, indicatorColor, expectedIndicatorEdge)).toBe(selectedIndicatorPixels);
  expect(countScreenshotPixels(unselected, indicatorColor, expectedIndicatorEdge)).toBe(0);
  expect(countScreenshotPixels(unselectedRepeat, indicatorColor, expectedIndicatorEdge)).toBe(0);
  expect(changedScreenshotPixelCount(selected, unselected, expectedIndicatorEdge)).toBeGreaterThanOrEqual(
    (selected.width - 18) * 2,
  );
});

test("@task9-focus changes stable rendered edge pixels after real Tab focuses an image control", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "말풍선 상세", exact: true }).click();
  const imageControl = page.getByRole("button", { name: "다음 말풍선", exact: true });
  const unfocusedPng = await imageControl.screenshot({ animations: "disabled" });

  await tabTo(page, imageControl);
  await expect(imageControl).toBeFocused();
  const focusedPng = await imageControl.screenshot({ animations: "disabled" });
  const focusedRepeatPng = await imageControl.screenshot({ animations: "disabled" });

  const unfocused = decodeScreenshotPng(unfocusedPng);
  const focused = decodeScreenshotPng(focusedPng);
  const focusedRepeat = decodeScreenshotPng(focusedRepeatPng);
  const focusEdge = (x, y, width, height) => Math.min(x, y, width - 1 - x, height - 1 - y) < 6;
  expect(countScreenshotPixels(unfocused, [11, 107, 95, 255], focusEdge)).toBe(0);
  const darkFocusPixels = countScreenshotPixels(focused, [11, 107, 95, 255], focusEdge);
  const brightFocusPixels = countScreenshotPixels(focused, [255, 255, 255, 255], focusEdge);
  expect(darkFocusPixels).toBeGreaterThan(40);
  expect(brightFocusPixels).toBeGreaterThan(40);
  expect(countScreenshotPixels(focusedRepeat, [11, 107, 95, 255], focusEdge)).toBe(darkFocusPixels);
  expect(countScreenshotPixels(focusedRepeat, [255, 255, 255, 255], focusEdge)).toBe(brightFocusPixels);
  expect(changedScreenshotPixelCount(unfocused, focused, focusEdge)).toBeGreaterThan(80);

  const appearance = await focusGeometry(imageControl);
  expect(appearance.clippedBy).toEqual([]);
});

async function forcedColorPalette(page) {
  return page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.cssText = [
      "position:fixed",
      "width:1px",
      "height:1px",
      "color:ButtonText",
      "background-color:Canvas",
      "border:1px solid Highlight",
    ].join(";");
    document.body.append(probe);
    const style = getComputedStyle(probe);
    const palette = {
      buttonText: style.color,
      canvas: style.backgroundColor,
      highlight: style.borderTopColor,
    };
    probe.remove();
    return palette;
  });
}

async function uploadForcedColorFixtures(page) {
  const uploads = [
    ["대화 목록", "mainBackground", "forced-main.png", 48, 48],
    ["대화 목록", "tabBackground", "forced-tab.png", 90, 24],
    ["채팅방", "chatBackground", "forced-chat.png", 48, 48],
    ["채팅방", "sendBubbleNormal", "forced-bubble.png", 120, 105],
    ["잠금화면", "passcodeBackgroundImage", "forced-passcode.png", 48, 48],
    ["로딩화면", "splashImage", "forced-splash.png", 48, 72],
    ["로딩화면", "themeIcon", "forced-icon.png", 162, 162],
  ];

  for (const [preview, key, name, width, height] of uploads) {
    await page.getByRole("tab", { name: preview, exact: true }).click();
    await page.locator(`#upload-input-${key}`).setInputFiles({
      name,
      mimeType: "image/png",
      buffer: await createPngBuffer(page, width, height),
    });
    await expect(page.locator(`#upload-description-${key}`)).toContainText(name);
  }
}

test("@task9-forced removes uploaded and decorative preview images while leaving forced colors automatic", async ({
  page,
}) => {
  await page.goto("/");
  await uploadForcedColorFixtures(page);

  await expect(page.locator("#preview-panel-home .main-screen")).toHaveCSS("background-image", /blob:/);
  await expect(page.locator("#chat-screen")).toHaveCSS("background-image", /blob:/);
  await expect(page.locator("#preview-panel-home .bottom-tabs")).toHaveCSS("background-image", /blob:/);
  await expect(page.locator(".passcode-screen")).toHaveCSS("background-image", /blob:/);
  await expect(page.locator(".splash-preview")).toHaveCSS("background-image", /blob:/);
  await expect(page.locator(".splash-icon")).toHaveCSS("background-image", /blob:/);
  await expect(page.locator("#preview-panel-chat .send-bubble").first()).toHaveCSS("border-image-source", /blob:/);
  await page.locator("#chat-screen").evaluate((element) => {
    element.style.backgroundImage = document.documentElement.style.getPropertyValue("--preview-chat-image");
  });
  await page.addStyleTag({
    content: `
      @media (forced-colors: active) {
        #preview-frame .shop-card::before,
        #preview-frame .promo-mascot::before {
          background-image: url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==");
        }
      }
    `,
  });

  await page.emulateMedia({ forcedColors: "active" });

  const retainedSources = await page.evaluate(() => ({
    chatInline: document.querySelector("#chat-screen").style.backgroundImage,
    mainVariable: document.documentElement.style.getPropertyValue("--preview-main-image"),
    tabVariable: document.documentElement.style.getPropertyValue("--preview-tab-image"),
    passcodeVariable: document.documentElement.style.getPropertyValue("--preview-passcode-image"),
  }));
  expect(retainedSources.chatInline).toContain("blob:");
  expect(retainedSources.mainVariable).toContain("blob:");
  expect(retainedSources.tabVariable).toContain("blob:");
  expect(retainedSources.passcodeVariable).toContain("blob:");

  const imageSurfaces = [
    ["main header", "#preview-panel-home .main-header"],
    ["main screen", "#preview-panel-home .main-screen"],
    ["chat list", "#preview-panel-chat-list .chat-list-screen"],
    ["chat room", "#chat-screen"],
    ["tab background", "#preview-panel-home .bottom-tabs"],
    ["passcode", ".passcode-screen"],
    ["splash", ".splash-preview"],
    ["splash icon", ".splash-icon"],
    ["profile avatar", "#preview-panel-home .avatar"],
    ["group avatar", "#preview-panel-chat-list .group-avatar-item"],
    ["tab icon", "#preview-panel-home .tab-icon"],
    ["shopping summary", ".shopping-summary-thumb"],
    ["shopping product", ".shop-thumb"],
    ["advertisement art", ".more-ad-art"],
    ["theme mode artwork", ".theme-preview-card"],
    ["theme icon", "#preview-panel-theme-list .theme-icon:not(.pale)"],
  ];
  for (const [name, selector] of imageSurfaces) {
    const locator = page.locator(selector).first();
    await expect(locator, `${name} exists`).toBeAttached();
    await expect(locator, `${name} image is removed`).toHaveCSS("background-image", "none");
  }

  await expect(page.locator("#preview-panel-chat .bubble").first()).toHaveCSS("border-image-source", "none");
  const effects = await page.evaluate(() => {
    const style = (selector, pseudo) => getComputedStyle(document.querySelector(selector), pseudo);
    return {
      adFilter: style(".more-ad-art").filter,
      avatarFilter: style(".avatar.soft").filter,
      downloadBackdrop: style(".download-bar").backdropFilter || style(".download-bar").webkitBackdropFilter,
      phoneShadow: style(".phone-preview").boxShadow,
      productAfterBackdrop:
        style(".shop-card", "::after").backdropFilter || style(".shop-card", "::after").webkitBackdropFilter,
      productAfterImage: style(".shop-card", "::after").backgroundImage,
      productBeforeImage: style(".shop-card", "::before").backgroundImage,
      promoBeforeImage: style(".promo-mascot", "::before").backgroundImage,
    };
  });
  const bubbleBoundary = await page.locator("#preview-panel-chat .bubble").first().evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      borderColor: style.borderTopColor,
      borderWidth: Number.parseFloat(style.borderTopWidth),
      padding: Number.parseFloat(style.paddingTop),
    };
  });
  const palette = await forcedColorPalette(page);
  expect(bubbleBoundary).toMatchObject({
    background: palette.canvas,
    borderColor: palette.buttonText,
    borderWidth: 1,
    padding: 9,
  });
  expect(effects).toMatchObject({
    adFilter: "none",
    avatarFilter: "none",
    downloadBackdrop: "none",
    phoneShadow: "none",
    productAfterBackdrop: "none",
    productAfterImage: "none",
  });
  expect(effects.productBeforeImage.split(", ").every((image) => image === "none")).toBe(true);
  expect(effects.promoBeforeImage.split(", ").every((image) => image === "none")).toBe(true);

  for (const selector of ["html", "body", "#preview-frame", ".preview-slide"]) {
    await expect(page.locator(selector).first()).toHaveCSS("forced-color-adjust", "auto");
  }
});

test("@task9-forced uses system boundaries, focus, mask icons, and non-color selected indicators", async ({ page }) => {
  await page.goto("/");
  await page.emulateMedia({ forcedColors: "active" });
  const palette = await forcedColorPalette(page);

  const boundaryCases = [
    ["theme name", "#app-name"],
    ["theme id", ".package-input"],
    ["color picker", ".color-picker-control"],
    ["file upload", ".file-button"],
    ["tint control", ".upload-tint-control"],
    ["device picker", ".device-picker"],
    ["preview arrow", ".preview-arrow"],
    ["preview tabs", ".preview-tabs"],
    ["download", ".download-actions button"],
  ];
  for (const [name, selector] of boundaryCases) {
    const boundary = await page.locator(selector).first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        color: style.borderTopColor,
        style: style.borderTopStyle,
        width: Number.parseFloat(style.borderTopWidth),
      };
    });
    expect(boundary.color, `${name} boundary uses ButtonText`).toBe(palette.buttonText);
    expect(boundary.style, `${name} boundary is drawn`).toBe("solid");
    expect(boundary.width, `${name} boundary width`).toBeGreaterThanOrEqual(1);
  }

  const themeName = page.locator("#app-name");
  await tabTo(page, themeName);
  await expect(themeName).toBeFocused();
  const themeNameFocus = await focusGeometry(themeName);
  expect(themeNameFocus.outlineColor).toBe(palette.highlight);
  expect(themeNameFocus.outlineWidth).toBeGreaterThanOrEqual(3);

  const activeTab = page.locator('#preview-tabs > button[aria-selected="true"]');
  await tabTo(page, activeTab);
  await expect(activeTab).toBeFocused();
  const activeTabState = await activeTab.evaluate((element) => {
    const focusStyle = getComputedStyle(element);
    const indicatorStyle = getComputedStyle(element, "::after");
    return {
      focusColor: focusStyle.outlineColor,
      focusWidth: Number.parseFloat(focusStyle.outlineWidth),
      indicatorColor: indicatorStyle.borderTopColor,
      indicatorContent: indicatorStyle.content,
      indicatorThickness: Number.parseFloat(indicatorStyle.borderTopWidth),
      indicatorWidth: Number.parseFloat(indicatorStyle.width),
    };
  });
  expect(activeTabState.focusColor).toBe(palette.highlight);
  expect(activeTabState.focusWidth).toBeGreaterThanOrEqual(3);
  expect(activeTabState.indicatorColor).toBe(palette.highlight);
  expect(activeTabState.indicatorContent).not.toBe("none");
  expect(activeTabState.indicatorThickness).toBeGreaterThanOrEqual(3);
  expect(activeTabState.indicatorWidth).toBeGreaterThan(0);

  for (const [name, selector] of [
    ["page icon", ".page-icon"],
    ["arrow icon", ".preview-arrow .arrow-icon"],
    ["header icon", ".friend-action-icon"],
    ["bubble action icon", ".bubble-detail-action-icon"],
  ]) {
    const icon = await page.locator(selector).first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        forcedColorAdjust: style.forcedColorAdjust,
        maskImage: style.maskImage || style.webkitMaskImage,
      };
    });
    expect(icon.backgroundColor, `${name} uses ButtonText`).toBe(palette.buttonText);
    expect(icon.forcedColorAdjust, `${name} retains only its mask paint`).toBe("none");
    expect(icon.maskImage, `${name} mask remains identifiable`).not.toBe("none");
  }

  const selectedDevice = await page.locator(".device-picker button.is-active").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      color: style.borderTopColor,
      style: style.borderTopStyle,
      width: Number.parseFloat(style.borderTopWidth),
    };
  });
  expect(selectedDevice).toMatchObject({ color: palette.highlight, style: "solid" });
  expect(selectedDevice.width).toBeGreaterThanOrEqual(3);

  await page.getByRole("tab", { name: "잠금화면", exact: true }).click();
  await page.locator('[data-passcode-digit="1"]').click();
  const dotStates = await page.locator(".passcode-dot").evaluateAll((dots) => dots.slice(0, 2).map((dot) => {
    const style = getComputedStyle(dot);
    return {
      color: style.borderTopColor,
      image: style.backgroundImage,
      selected: dot.classList.contains("is-selected"),
      width: Number.parseFloat(style.borderTopWidth),
    };
  }));
  expect(dotStates[0]).toMatchObject({ color: palette.highlight, image: "none", selected: true });
  expect(dotStates[0].width).toBeGreaterThanOrEqual(3);
  expect(dotStates[1]).toMatchObject({ color: palette.buttonText, image: "none", selected: false });
  expect(dotStates[1].width).toBeGreaterThanOrEqual(1);
  expect(dotStates[1].width).toBeLessThan(dotStates[0].width);
});

test("@task9-forced preserves nine-patch editing content with system stage, crop, and guides", async ({ page }) => {
  await page.goto("/");
  const bubbleName = "forced-nine-patch.png";
  await page.getByRole("tab", { name: "채팅방", exact: true }).click();
  await page.locator("#upload-input-sendBubbleNormal").setInputFiles({
    name: bubbleName,
    mimeType: "image/png",
    buffer: await createPngBuffer(page, 120, 105),
  });
  await expect(page.locator("#upload-description-sendBubbleNormal")).toContainText(bubbleName);
  await page.getByRole("tab", { name: "말풍선 상세", exact: true }).click();

  const preview = page.locator(".nine-patch-preview");
  const crop = page.locator(".nine-patch-crop");
  await expect(preview).toHaveCSS("background-image", "none");
  expect(await preview.evaluate((element) => getComputedStyle(element, "::before").backgroundImage)).toContain("blob:");
  await expect(crop).toHaveCSS("background-image", /blob:/);

  await page.emulateMedia({ forcedColors: "active" });
  const palette = await forcedColorPalette(page);
  const editingAppearance = await page.evaluate(() => {
    const style = (selector, pseudo) => getComputedStyle(document.querySelector(selector), pseudo);
    return {
      cropBorder: style(".nine-patch-crop").borderTopColor,
      cropImage: style(".nine-patch-crop").backgroundImage,
      cropShadow: style(".nine-patch-crop").boxShadow,
      paddingGuide: style(".nine-patch-guide.padding-x").borderLeftColor,
      sourceImage: style(".nine-patch-preview", "::before").backgroundImage,
      stageBackground: style(".nine-patch-stage").backgroundColor,
      stretchGuide: style(".nine-patch-guide.stretch-x").borderLeftColor,
    };
  });
  expect(editingAppearance.stageBackground).toBe(palette.canvas);
  expect(editingAppearance.cropBorder).toBe(palette.buttonText);
  expect(editingAppearance.cropShadow).toBe("none");
  expect(editingAppearance.stretchGuide).toBe(palette.highlight);
  expect(editingAppearance.paddingGuide).toBe(palette.buttonText);
  expect(editingAppearance.sourceImage).toContain("blob:");
  expect(editingAppearance.cropImage).toContain("blob:");

  const choices = await page.locator(".nine-patch-fit-option label").evaluateAll((labels) => labels.map((label) => {
    const style = getComputedStyle(label);
    return {
      checked: label.previousElementSibling.checked,
      color: style.borderTopColor,
      width: Number.parseFloat(style.borderTopWidth),
    };
  }));
  const selected = choices.find(({ checked }) => checked);
  const unselected = choices.find(({ checked }) => !checked);
  expect(selected.color).toBe(palette.highlight);
  expect(selected.width).toBeGreaterThanOrEqual(3);
  expect(unselected.color).toBe(palette.buttonText);
  expect(unselected.width).toBeLessThan(selected.width);
});

const reflowViewportCases = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
];

const reflowPageCases = [
  {
    id: "home",
    region: ".main-screen",
    name: "친구 홈 콘텐츠",
    last: ".all-friends-section .favorite-profile-row:last-child",
    role: "region",
  },
  {
    id: "chat-list",
    region: ".chat-list-screen",
    name: "대화 목록 예시",
    last: ".chat-list-row:last-child",
    role: "list",
  },
  {
    id: "open-chat",
    region: ".open-chat-screen",
    name: "오픈채팅 목록 예시",
    last: ".chat-list-row:last-child",
    role: "list",
  },
  {
    id: "shopping",
    region: ".shopping-screen",
    name: "쇼핑 콘텐츠",
    last: ".shop-card:first-child .shop-card-content",
    role: "region",
  },
  {
    id: "more",
    region: ".more-screen",
    name: "더보기 콘텐츠",
    last: ".more-section-heading",
    role: "region",
  },
  {
    id: "chat",
    region: "#chat-screen",
    name: "메시지 대화 예시",
    last: ".message-group:not(.typing-group):nth-last-child(2)",
    role: "list",
  },
  {
    id: "bubble-detail",
    region: ".bubble-detail-panel",
    name: "말풍선 편집 설정",
    last: ".nine-patch-control:last-child",
    role: "region",
  },
  {
    id: "passcode",
    region: ".passcode-screen",
    name: "잠금화면 키패드",
    last: ".passcode-delete",
    role: "region",
  },
  {
    id: "splash",
    region: ".splash-screen",
    name: "로딩화면 콘텐츠",
    last: ".splash-icon",
    role: "region",
  },
  {
    id: "theme-list",
    region: ".theme-list-screen",
    name: "테마 목록",
    last: ".theme-list-row:last-child",
    role: "group",
  },
];

async function waitForReflowLayout(page) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function clippedReflowText(page) {
  return page.evaluate(() => {
    const roots = [
      document.querySelector('.preview-slide:not([aria-hidden="true"])'),
      document.querySelector(".download-copy"),
    ];
    const failures = [];
    const isClipValue = (value) => /^(?:clip|hidden)$/.test(value);

    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent.trim()) {
          continue;
        }

        const parent = node.parentElement;
        if (
          !parent ||
          parent.closest(".visually-hidden, [aria-hidden=true], [hidden]") ||
          getComputedStyle(parent).visibility === "hidden"
        ) {
          continue;
        }

        const range = document.createRange();
        range.selectNodeContents(node);
        const textRects = [...range.getClientRects()].filter(({ width, height }) => width > 0 && height > 0);
        if (textRects.length === 0) {
          continue;
        }

        for (let ancestor = parent; ancestor; ancestor = ancestor.parentElement) {
          if (ancestor !== parent && ancestor.matches("[data-preview-scroll-region]")) {
            break;
          }

          const style = getComputedStyle(ancestor);
          const clipsX = isClipValue(style.overflowX);
          const clipsY = isClipValue(style.overflowY);
          if (clipsX || clipsY) {
            const clip = ancestor.getBoundingClientRect();
            const clipped = textRects.some((rect) =>
              (clipsX && (rect.left < clip.left - 1 || rect.right > clip.right + 1)) ||
              (clipsY && (rect.top < clip.top - 1 || rect.bottom > clip.bottom + 1))
            );
            if (clipped) {
              failures.push({
                clipper: ancestor.id || ancestor.className || ancestor.tagName,
                text: node.textContent.trim().slice(0, 80),
              });
              break;
            }
          }

          if (ancestor === root) {
            break;
          }
        }
      }
    }

    return failures;
  });
}

async function activePreviewTabStops(page) {
  return page.locator('.preview-slide:not([aria-hidden="true"])').evaluate((panel) => {
    const candidates = [...panel.querySelectorAll("a[href], button, input, [tabindex]")];
    const radioNames = new Set();
    let index = 0;
    const targetIds = [];

    for (const element of candidates) {
      const style = getComputedStyle(element);
      if (
        element.disabled ||
        element.tabIndex < 0 ||
        style.display === "none" ||
        style.visibility === "hidden" ||
        element.getClientRects().length === 0
      ) {
        continue;
      }
      if (element.matches('input[type="radio"]')) {
        if (radioNames.has(element.name) || !element.checked) {
          continue;
        }
        radioNames.add(element.name);
      }
      const targetId = `${panel.dataset.previewPage}-${index}`;
      element.dataset.reflowFocusTarget = targetId;
      targetIds.push(targetId);
      index += 1;
    }

    return targetIds;
  });
}

async function assertActivePreviewTabStops(page, context) {
  const expectedTargets = await activePreviewTabStops(page);
  const visitedTargets = new Set();
  let reachedIos = false;
  let reachedAndroid = false;
  await page.locator("#preview-next").focus();

  for (let index = 0; index < 80 && (!reachedAndroid || visitedTargets.size < expectedTargets.length); index += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => ({
      id: document.activeElement?.id,
      target: document.activeElement?.dataset.reflowFocusTarget,
    }));
    if (focused.target) {
      visitedTargets.add(focused.target);
    }
    reachedIos ||= focused.id === "download-ios";
    reachedAndroid ||= focused.id === "download-android";
  }

  expect([...visitedTargets].sort(), `${context}: active preview controls are visited`).toEqual([...expectedTargets].sort());
  expect(reachedIos, `${context}: iOS download is visited after preview content`).toBe(true);
  expect(reachedAndroid, `${context}: Android download is visited after preview content`).toBe(true);
}

async function assertReflowPage(page, pageCase, device, viewport, mode) {
  const context = `${mode} ${viewport.width}x${viewport.height} ${device} ${pageCase.id}`;
  await page.locator(`#preview-tab-${pageCase.id}`).click();
  await waitForReflowLayout(page);

  const shell = await page.evaluate(() => {
    const app = document.querySelector(".app-shell").getBoundingClientRect();
    const footer = document.querySelector(".download-bar").getBoundingClientRect();
    const previewPanel = document.querySelector(".preview-panel").getBoundingClientRect();
    const frame = document.querySelector("#preview-frame").getBoundingClientRect();
    return {
      appBottom: app.bottom,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      footerPosition: getComputedStyle(document.querySelector(".download-bar")).position,
      footerTop: footer.top,
      frame: { bottom: frame.bottom, height: frame.height, left: frame.left, right: frame.right, width: frame.width },
      panel: { bottom: previewPanel.bottom, left: previewPanel.left, right: previewPanel.right },
    };
  });
  expect(shell.documentScrollWidth, `${context}: document has no horizontal overflow`).toBeLessThanOrEqual(
    shell.documentClientWidth + 1,
  );
  expect(shell.footerPosition, `${context}: the mobile footer participates in document flow`).toBe("static");
  expect(shell.footerTop, `${context}: footer clears the app shell`).toBeGreaterThanOrEqual(shell.appBottom - 1);
  expect(shell.frame.left, `${context}: preview starts inside its panel`).toBeGreaterThanOrEqual(shell.panel.left - 1);
  expect(shell.frame.right, `${context}: preview ends inside its panel`).toBeLessThanOrEqual(shell.panel.right + 1);
  expect(shell.frame.bottom, `${context}: preview is contained by its panel`).toBeLessThanOrEqual(shell.panel.bottom + 1);
  if (device === "tablet") {
    expect(shell.frame.height, `${context}: narrow tablet uses a portrait 3:4 frame`).toBeGreaterThanOrEqual(
      (shell.frame.width * 4) / 3 - 1,
    );
  }

  const footerText = await page.locator("#download-title, #status-text, .site-disclaimer").evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        id: element.id || element.className,
        overflowWrap: style.overflowWrap,
        textOverflow: style.textOverflow,
        whiteSpace: style.whiteSpace,
      };
    }),
  );
  for (const text of footerText) {
    expect(text.whiteSpace, `${context}: ${text.id} can wrap`).not.toBe("nowrap");
    expect(text.textOverflow, `${context}: ${text.id} is not ellipsized`).not.toBe("ellipsis");
    expect(text.overflowWrap, `${context}: ${text.id} breaks long tokens`).toBe("anywhere");
  }

  const region = page.locator(`#preview-panel-${pageCase.id} ${pageCase.region}`).first();
  await expect(region, `${context}: primary content region exists`).toBeAttached();
  const regionState = await region.evaluate((element) => ({
    clientHeight: element.clientHeight,
    clientWidth: element.clientWidth,
    dataRegion: element.hasAttribute("data-preview-scroll-region"),
    name: element.getAttribute("aria-label"),
    role: element.getAttribute("role"),
    scrollHeight: element.scrollHeight,
    scrollWidth: element.scrollWidth,
    tabIndexAttribute: element.getAttribute("tabindex"),
  }));
  expect(regionState.dataRegion, `${context}: content is registered for overflow synchronization`).toBe(true);
  expect(regionState.name, `${context}: content has a unique accessible name`).toBe(pageCase.name);
  expect(regionState.role, `${context}: existing list/group semantics are preserved`).toBe(pageCase.role);
  expect(regionState.scrollWidth, `${context}: primary content does not need horizontal scrolling`).toBeLessThanOrEqual(
    regionState.clientWidth + 1,
  );

  const isOverflowing =
    regionState.scrollHeight > regionState.clientHeight + 1 || regionState.scrollWidth > regionState.clientWidth + 1;
  expect(regionState.tabIndexAttribute, `${context}: only actual overflow becomes a Tab stop`).toBe(
    isOverflowing ? "0" : null,
  );

  if (regionState.scrollHeight > regionState.clientHeight + 1) {
    await page.locator("#preview-next").focus();
    await tabTo(page, region, 30);
    await expect(region, `${context}: overflow is reached with a real Tab`).toBeFocused();
    await page.keyboard.press("End");
    await expect.poll(
      () => region.evaluate((element) => element.scrollTop),
      { message: `${context}: End scrolls the named region to its final content` },
    ).toBeGreaterThanOrEqual(regionState.scrollHeight - regionState.clientHeight - 2);
  }

  const lastContent = region.locator(pageCase.last).first();
  await expect(lastContent, `${context}: final representative content exists`).toBeAttached();
  const visibility = await lastContent.evaluate((element, scrollSelector) => {
    const region = element.closest(scrollSelector);
    const content = element.getBoundingClientRect();
    const viewport = region.getBoundingClientRect();
    return {
      bottom: content.bottom,
      left: content.left,
      right: content.right,
      top: content.top,
      viewportBottom: viewport.bottom,
      viewportLeft: viewport.left,
      viewportRight: viewport.right,
      viewportTop: viewport.top,
    };
  }, pageCase.region);
  expect(visibility.bottom, `${context}: final content bottom is visible`).toBeLessThanOrEqual(visibility.viewportBottom + 1);
  expect(visibility.top, `${context}: final content top is visible`).toBeGreaterThanOrEqual(visibility.viewportTop - 1);
  expect(visibility.left, `${context}: final content starts inside the region`).toBeGreaterThanOrEqual(visibility.viewportLeft - 1);
  expect(visibility.right, `${context}: final content ends inside the region`).toBeLessThanOrEqual(visibility.viewportRight + 1);

  expect(await clippedReflowText(page), `${context}: no meaningful text is clipped`).toEqual([]);
  await assertActivePreviewTabStops(page, context);
}

for (const viewport of reflowViewportCases) {
  for (const device of ["phone", "tablet"]) {
    for (const mode of ["default spacing", "WCAG text spacing"]) {
      test(`@task9-reflow keeps all pages operable at ${viewport.width}x${viewport.height}, ${device}, ${mode}`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.goto("/");
        if (mode === "WCAG text spacing") {
          await page.addStyleTag({
            content: `
              * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }
              p { margin-bottom: 2em !important; }
            `,
          });
        }
        await page.locator(`[data-preview-device="${device}"]`).click();
        await waitForReflowLayout(page);

        for (const pageCase of reflowPageCases) {
          await assertReflowPage(page, pageCase, device, viewport, mode);
        }
      });
    }
  }
}
