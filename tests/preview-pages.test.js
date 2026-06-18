import assert from "node:assert/strict";
import test from "node:test";

import {
  getNextPreviewIndex,
  getPreviewColorKeys,
  getPreviewIconUrl,
  getPreviewImageKeys,
  PREVIEW_PAGES,
} from "../src/preview-pages.js";

test("PREVIEW_PAGES exposes multiple KakaoTalk template screens", () => {
  assert.ok(PREVIEW_PAGES.length >= 4);
  assert.deepEqual(
    PREVIEW_PAGES.map((page) => page.id),
    ["home", "chat", "passcode", "theme-list"],
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
});

test("getPreviewImageKeys returns only images used by the active preview page", () => {
  const tabIconKeys = ["tabFriendIcon", "tabChatIcon", "tabOpenChatIcon", "tabShoppingIcon", "tabMoreIcon"];

  assert.deepEqual(getPreviewImageKeys("home"), ["mainBackground", "tabBackground", ...tabIconKeys, "profileImage"]);
  assert.deepEqual(getPreviewImageKeys("chat"), [
    "chatBackground",
    "tabBackground",
    ...tabIconKeys,
    "profileImage",
    "sendBubble",
    "receiveBubble",
  ]);
  assert.deepEqual(getPreviewImageKeys("passcode"), ["passcodeBackgroundImage", "passcodeDot", "passcodeDotSelected"]);
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
