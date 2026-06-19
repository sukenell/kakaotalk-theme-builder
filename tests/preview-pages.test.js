import assert from "node:assert/strict";
import test from "node:test";

import {
  CHAT_BUBBLE_IMAGE_KEYS,
  getNextPreviewIndex,
  getPreviewColorKeys,
  getPreviewIconUrl,
  getPreviewImageKeys,
  PREVIEW_PAGES,
  TAB_ICON_IMAGE_KEYS,
} from "../src/preview-pages.js";

test("PREVIEW_PAGES exposes multiple KakaoTalk template screens", () => {
  assert.ok(PREVIEW_PAGES.length >= 4);
  assert.deepEqual(
    PREVIEW_PAGES.map((page) => page.id),
    ["home", "chat-list", "chat", "passcode", "splash", "theme-list"],
  );
});

test("getPreviewColorKeys returns only colors used by the active preview page", () => {
  assert.deepEqual(getPreviewColorKeys("chat"), [
    "mainBackground",
    "chatBackground",
    "headerText",
    "descriptionText",
    "sendText",
    "receiveText",
    "inputBarBackground",
    "inputBarText",
    "inputMenu",
    "sendButton",
    "sendButtonText",
  ]);
  assert.deepEqual(getPreviewColorKeys("passcode"), [
    "passcodeBackground",
    "passcodeText",
    "passcodeKeypadBackground",
  ]);
  assert.deepEqual(getPreviewColorKeys("home"), [
    "mainBackground",
    "headerText",
    "titleText",
    "paragraphText",
    "sectionTitle",
    "bodyPressed",
    "titlePressed",
  ]);
});

test("getPreviewImageKeys returns only images used by the active preview page", () => {
  assert.deepEqual(getPreviewImageKeys("home"), ["mainBackground", "tabBackground", ...TAB_ICON_IMAGE_KEYS, "profileImage"]);
  assert.deepEqual(getPreviewImageKeys("chat-list"), [
    "mainBackground",
    "tabBackground",
    ...TAB_ICON_IMAGE_KEYS,
    "profileImage",
  ]);
  assert.deepEqual(getPreviewImageKeys("chat"), ["chatBackground", "profileImage", ...CHAT_BUBBLE_IMAGE_KEYS]);
  assert.deepEqual(getPreviewImageKeys("passcode"), ["passcodeBackgroundImage", "passcodeDot", "passcodeDotSelected"]);
  assert.deepEqual(getPreviewImageKeys("splash"), ["splashImage"]);
  assert.deepEqual(getPreviewImageKeys("theme-list"), ["themeIcon"]);
});

test("PREVIEW_PAGES uses Flaticon image assets for page icons", () => {
  for (const page of PREVIEW_PAGES) {
    assert.match(getPreviewIconUrl(page.id), /^https:\/\/cdn-icons-png\.flaticon\.com\/512\//);
  }
});

test("getNextPreviewIndex moves left and right with wraparound", () => {
  assert.equal(getNextPreviewIndex(0, "next"), 1);
  assert.equal(getNextPreviewIndex(1, "previous"), 0);
  assert.equal(getNextPreviewIndex(0, "previous"), PREVIEW_PAGES.length - 1);
  assert.equal(getNextPreviewIndex(PREVIEW_PAGES.length - 1, "next"), 0);
});
