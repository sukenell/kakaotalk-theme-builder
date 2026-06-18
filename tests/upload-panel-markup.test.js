import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("upload panel starts with the official guide download link", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const linkIndex = html.indexOf('id="original-image-download"');
  const uploadControlsIndex = html.indexOf('id="upload-controls"');

  assert.ok(linkIndex > -1);
  assert.ok(linkIndex < uploadControlsIndex);
  assert.match(
    html,
    /<a[^>]+id="original-image-download"[^>]+href="https:\/\/cs\.kakao\.com\/helps_html\/1073209428"[^>]*>\s*공식 가이드 파일 다운로드\s*<\/a>/,
  );
});

test("theme mode controls are not shown because generated themes use one palette", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.equal(html.includes("data-theme-style"), false);
  assert.equal(html.includes("테마 모드"), false);
});

test("preview has device switches, five bottom tabs, and unofficial footer notice", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /data-preview-device="phone"/);
  assert.match(html, /data-preview-device="tablet"/);
  assert.match(html, /본 사이트는 \[카카오톡\]과 관련이 없는 비공식 테마 제작 도구입니다\./);

  for (const className of ["tab-friends", "tab-chat", "tab-openchat", "tab-shopping", "tab-more"]) {
    assert.match(html, new RegExp(`class=\"[^\"]*${className}`));
  }
});

test("visible defaults hide package affixes and use compact download labels", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /id="app-name"[^>]+value="나의 테마"/);
  assert.match(html, /id="download-title">나의 테마<\/strong>/);
  assert.doesNotMatch(html, />com\.<\/span>/);
  assert.doesNotMatch(html, />\.kakaotalk\.theme<\/span>/);
  assert.match(html, /<button id="download-ios"[^>]*>IOS<\/button>/);
  assert.match(html, /<button id="download-android"[^>]*>Android<\/button>/);
});

test("theme id and author wrapper inputs keep rounded focus treatment", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.package-input:focus-within,\s*\.author-input:focus-within/);
  assert.match(css, /\.package-input input,\s*\.author-input input\s*\{[\s\S]*outline: (?:0|none);/);
  assert.match(css, /\.package-input input,\s*\.author-input input\s*\{[\s\S]*border-radius: inherit;/);
});

test("chat preview has a date chip and no bottom tabs", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const chatStart = html.indexOf('class="preview-slide chat-preview"');
  const passcodeStart = html.indexOf('class="preview-slide passcode-preview"');
  const chatMarkup = html.slice(chatStart, passcodeStart);

  assert.ok(chatStart > -1);
  assert.ok(passcodeStart > chatStart);
  assert.match(chatMarkup, /data-preview-date/);
  assert.doesNotMatch(chatMarkup, /class="bottom-tabs"/);
  assert.doesNotMatch(chatMarkup, /<span>3<\/span>/);
});

test("friends preview header has a left title without search or settings buttons", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const headerStart = html.indexOf('class="phone-header main-header"');
  const screenStart = html.indexOf('class="main-screen"');
  const headerMarkup = html.slice(headerStart, screenStart);

  assert.ok(headerStart > -1);
  assert.ok(screenStart > headerStart);
  assert.match(headerMarkup, /<strong>친구<\/strong>/);
  assert.doesNotMatch(headerMarkup, /title="검색"/);
  assert.doesNotMatch(headerMarkup, /title="설정"/);
});

test("chat preview title is chat room and its trailing action is a menu", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const chatStart = html.indexOf('class="preview-slide chat-preview"');
  const chatScreenStart = html.indexOf('id="chat-screen"');
  const headerMarkup = html.slice(chatStart, chatScreenStart);

  assert.ok(chatStart > -1);
  assert.ok(chatScreenStart > chatStart);
  assert.match(headerMarkup, /<strong>채팅방<\/strong>/);
  assert.match(headerMarkup, /title="메뉴" aria-label="메뉴">☰<\/button>/);
  assert.doesNotMatch(headerMarkup, /테마 미리보기/);
  assert.doesNotMatch(headerMarkup, /title="검색"/);
});

test("theme list orders official themes before user themes and removes header subtitle", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const previewStart = html.indexOf('class="preview-slide theme-list-preview"');
  const previewMarkup = html.slice(previewStart);
  const headerEnd = previewMarkup.indexOf('class="theme-list-screen"');
  const headerMarkup = previewMarkup.slice(0, headerEnd);
  const officialIndex = previewMarkup.indexOf("공식 테마");
  const defaultIndex = previewMarkup.indexOf("<strong>기본</strong>");
  const userSectionIndex = previewMarkup.indexOf("사용자 테마");
  const activeIndex = previewMarkup.indexOf("data-preview-theme-name");
  const userThemeIndex = previewMarkup.indexOf("<strong>사용자테마</strong>");

  assert.ok(previewStart > -1);
  assert.doesNotMatch(headerMarkup, /내 테마/);
  assert.ok(officialIndex > -1);
  assert.ok(defaultIndex > officialIndex);
  assert.ok(userSectionIndex > defaultIndex);
  assert.ok(activeIndex > userSectionIndex);
  assert.ok(userThemeIndex > activeIndex);
  assert.doesNotMatch(previewMarkup, /겨울이야기/);
});

test("tablet passcode preview defines a landscape layout that fits the keypad", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.phone-preview\.is-tablet \.passcode-screen\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(css, /\.phone-preview\.is-tablet \.passcode-screen\s*\{[\s\S]*gap: 18px 24px;/);
  assert.match(css, /\.phone-preview\.is-tablet \.passcode-screen\s*\{[\s\S]*padding: 32px;/);
  assert.match(css, /\.phone-preview\.is-tablet \.keypad\s*\{[\s\S]*grid-column: 2;/);
  assert.match(css, /\.phone-preview\.is-tablet \.keypad\s*\{[\s\S]*width: min\(100%, 260px\);/);
});

test("chat bubbles use 9-slice template images instead of stretching the full asset", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

  assert.match(css, /border-image-source: var\(--preview-send-image, image-set\(url\("\.\/assets\/templates\/ios\/Images\/chatroomBubbleSend01@3x\.png"\) 3x\)\);/);
  assert.match(css, /border-image-source: var\(--preview-receive-image, image-set\(url\("\.\/assets\/templates\/ios\/Images\/chatroomBubbleReceive01@3x\.png"\) 3x\)\);/);
  assert.match(css, /--preview-bubble-slice: 12 13\.333 11\.333 13\.333;/);
  assert.match(css, /border-width: 12px 13\.333px 11\.333px;/);
  assert.match(css, /border-image-slice: var\(--preview-bubble-slice\) fill;/);
  assert.match(css, /border-image-repeat: stretch;/);
  assert.doesNotMatch(css, /background:[\s\S]*--preview-send-image[\s\S]*100% 100% no-repeat/);
  assert.match(app, /function formatUploadLabel/);
  assert.match(app, /\$\{target\.label\}\(\$\{width\}px x \$\{height\}px\)/);
  assert.doesNotMatch(css, /border-bottom-(?:right|left)-radius:\s*6px/);
});

test("bubble uploads preview the same generated iOS variant used for downloads", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

  assert.match(app, /function createPreviewUrlFromBytes/);
  assert.match(app, /function setPreviewBubbleImage/);
  assert.match(app, /image-set\(url\("\$\{url\}"\) \$\{target\.previewScale\}x\)/);
  assert.match(app, /IMAGE_TARGETS\[key\]\?\.previewIos \?\? IMAGE_TARGETS\[key\]\?\.ios\?\.\[0\]/);
});

test("chat upload panel exposes 3x bubble uploads and generates 2x automatically", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const model = await readFile(new URL("../src/theme-model.js", import.meta.url), "utf8");

  assert.match(app, /\.\.\.CHAT_BUBBLE_IMAGE_KEYS/);

  for (const key of [
    "sendBubbleNormal",
    "sendBubbleSelected",
    "sendBubbleTailless",
    "sendBubbleTaillessSelected",
    "receiveBubbleNormal",
    "receiveBubbleSelected",
    "receiveBubbleTailless",
    "receiveBubbleTaillessSelected",
  ]) {
    assert.match(model, new RegExp(`"${key}"`));
  }

  assert.doesNotMatch(model, /sendBubbleNormal2x/);
  assert.doesNotMatch(model, /receiveBubbleNormal3x/);
  assert.match(model, /previewScale:\s*3/);
});
