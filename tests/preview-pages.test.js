import assert from "node:assert/strict";
import test from "node:test";

import {
  ADDITIONAL_IMAGE_KEYS,
  CHAT_BUBBLE_IMAGE_KEYS,
  getNextPreviewIndex,
  getPreviewColorKeys,
  getPreviewIconUrl,
  getPreviewImageKeys,
  PREVIEW_PAGES,
  VISIBLE_TAB_ICON_IMAGE_KEYS,
} from "../src/preview-pages.js";

test("PREVIEW_PAGES exposes multiple KakaoTalk template screens", () => {
  assert.ok(PREVIEW_PAGES.length >= 4);
  assert.deepEqual(
    PREVIEW_PAGES.map((page) => page.id),
    ["home", "chat-list", "open-chat", "shopping", "more", "chat", "passcode", "splash", "theme-list"],
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
    "tabBackground",
    "headerText",
    "titleText",
    "paragraphText",
    "sectionTitle",
    "bodyPressed",
    "titlePressed",
  ]);
  assert.equal(getPreviewColorKeys("chat-list").includes("tabBackground"), true);
  assert.equal(getPreviewColorKeys("open-chat").includes("tabBackground"), true);
  assert.equal(getPreviewColorKeys("shopping").includes("tabBackground"), true);
  assert.equal(getPreviewColorKeys("more").includes("tabBackground"), true);
});

test("getPreviewImageKeys returns only images used by the active preview page", () => {
  assert.deepEqual(getPreviewImageKeys("home"), [
    "mainBackground",
    "tabBackground",
    ...VISIBLE_TAB_ICON_IMAGE_KEYS,
    "profileImage",
    "profileFullImage",
    "addFriendButton",
    "addFriendButtonPressed",
  ]);
  assert.deepEqual(getPreviewImageKeys("chat-list"), [
    "mainBackground",
    "tabBackground",
    ...VISIBLE_TAB_ICON_IMAGE_KEYS,
    "profileImage",
    "profileFullImage",
    "addFriendButton",
    "addFriendButtonPressed",
  ]);
  for (const pageId of ["open-chat", "shopping", "more"]) {
    assert.deepEqual(getPreviewImageKeys(pageId), [
      "mainBackground",
      "tabBackground",
      ...VISIBLE_TAB_ICON_IMAGE_KEYS,
      "profileImage",
    ]);
  }
  for (const hiddenTabIconKey of [
    "tabCallIcon",
    "tabCallIconSelected",
    "tabPiccomaIcon",
    "tabPiccomaIconSelected",
    "tabFindIcon",
    "tabFindIconSelected",
    "tabGameIcon",
    "tabGameIconSelected",
  ]) {
    assert.equal(getPreviewImageKeys("home").includes(hiddenTabIconKey), false);
    assert.equal(getPreviewImageKeys("more").includes(hiddenTabIconKey), false);
  }
  assert.deepEqual(getPreviewImageKeys("chat"), ["chatBackground", "profileImage", ...CHAT_BUBBLE_IMAGE_KEYS]);
  assert.deepEqual(getPreviewImageKeys("passcode"), ["passcodeBackgroundImage", "passcodeDot", "passcodeDotSelected"]);
  assert.deepEqual(getPreviewImageKeys("splash"), ["splashImage"]);
  assert.deepEqual(getPreviewImageKeys("theme-list"), [
    "themeIcon",
    ...ADDITIONAL_IMAGE_KEYS.filter((key) => key.startsWith("themeIcon")),
  ]);
});

test("PREVIEW_PAGES uses bundled internal image assets for page icons", () => {
  for (const page of PREVIEW_PAGES) {
    assert.match(getPreviewIconUrl(page.id), /^\.\/assets\//);
  }

  assert.equal(getPreviewIconUrl("home"), "./assets/template-images/ios/Images/maintabIcoFriends@3x.png");
  assert.equal(getPreviewIconUrl("chat-list"), "./assets/template-images/ios/Images/maintabIcoChats@3x.png");
  assert.equal(getPreviewIconUrl("open-chat"), "./assets/template-images/ios/Images/maintabIcoNow@3x.png");
  assert.equal(getPreviewIconUrl("shopping"), "./assets/template-images/ios/Images/maintabIcoShopping@3x.png");
  assert.equal(getPreviewIconUrl("more"), "./assets/template-images/ios/Images/maintabIcoMore@3x.png");
  assert.equal(getPreviewIconUrl("chat"), "./assets/preview/header-icons/headerCompose.png");
  assert.equal(getPreviewIconUrl("splash"), "./assets/template-images/ios/Images/commonIcoTheme.png");
  assert.equal(getPreviewIconUrl("theme-list"), "./assets/template-images/ios/Images/commonIcoTheme.png");
  assert.equal(PREVIEW_PAGES.find((page) => page.id === "open-chat")?.label, "지금");
});

test("getNextPreviewIndex moves left and right with wraparound", () => {
  assert.equal(getNextPreviewIndex(0, "next"), 1);
  assert.equal(getNextPreviewIndex(1, "previous"), 0);
  assert.equal(getNextPreviewIndex(0, "previous"), PREVIEW_PAGES.length - 1);
  assert.equal(getNextPreviewIndex(PREVIEW_PAGES.length - 1, "next"), 0);
});
