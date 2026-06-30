import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

import {
  PREVIEW_CSS_IMAGE_VARIABLES,
  PREVIEW_DEFAULT_IMAGE_PATHS,
  PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY,
} from "../src/preview-assets.js";
import { PREVIEW_PAGES } from "../src/preview-pages.js";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function chatListRowByTitle(markup, title) {
  const titleIndex = markup.indexOf(`<strong>${title}</strong>`);
  assert.ok(titleIndex > -1, `${title} row exists`);
  const rowStart = markup.lastIndexOf('<div class="chat-list-row', titleIndex);
  const rowEnd = markup.indexOf('<div class="chat-list-row', titleIndex);

  return markup.slice(rowStart, rowEnd === -1 ? markup.length : rowEnd);
}

function chatListRowsByTitle(markup, title) {
  const rows = [];
  let searchIndex = 0;

  while (true) {
    const titleIndex = markup.indexOf(`<strong>${title}</strong>`, searchIndex);

    if (titleIndex === -1) {
      break;
    }

    const rowStart = markup.lastIndexOf('<div class="chat-list-row', titleIndex);
    const rowEnd = markup.indexOf('<div class="chat-list-row', titleIndex);
    rows.push(markup.slice(rowStart, rowEnd === -1 ? markup.length : rowEnd));
    searchIndex = titleIndex + title.length;
  }

  return rows;
}

test("document head defines explicit social preview metadata", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const previewTitle = "카톡 테마 만들기 by reha";

  assert.match(html, new RegExp(`<title>${escapeRegExp(previewTitle)}<\\/title>`));
  assert.match(
    html,
    new RegExp(`<meta name="description" content="${escapeRegExp(previewTitle)}" \\/>`),
  );
  assert.match(
    html,
    new RegExp(`<meta property="og:title" content="${escapeRegExp(previewTitle)}" \\/>`),
  );
  assert.match(
    html,
    new RegExp(`<meta property="og:description" content="${escapeRegExp(previewTitle)}" \\/>`),
  );
  assert.match(html, /<meta property="og:type" content="website" \/>/);
});

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
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const activePreviewTabCss = css.match(/\.preview-tabs button\.is-active\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const activePreviewTabIconCss = css.match(/\.preview-tabs button\.is-active \.page-icon\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const pageIconCss = css.match(/\.page-icon\s*\{[\s\S]*?\}/)?.[0] ?? "";

  assert.match(html, /data-preview-device="phone"/);
  assert.match(html, /data-preview-device="tablet"/);
  assert.match(html, /본 사이트는 \[카카오톡\]과 관련이 없는 비공식 테마 제작 도구입니다\./);
  assert.match(html, /id="preview-previous"[\s\S]*<span class="arrow-icon arrow-left" aria-hidden="true"><\/span>[\s\S]*id="preview-next"[\s\S]*<span class="arrow-icon arrow-right" aria-hidden="true"><\/span>/);
  assert.doesNotMatch(html, /id="preview-previous"[^>]*>‹<\/button>/);
  assert.doesNotMatch(html, /id="preview-next"[^>]*>›<\/button>/);
  assert.match(css, /\.arrow-icon\s*\{[\s\S]*mask: url\("data:image\/svg\+xml,/);
  assert.doesNotMatch(css, /\.preview-arrow::before/);
  assert.doesNotMatch(css, /\.preview-arrow::after/);
  assert.match(css, /\.preview-tabs button:is\(:hover, :focus-visible\)\s*\{[\s\S]*background: #f1f2f3;/);
  assert.match(css, /\.preview-tabs button:is\(:hover, :focus-visible\)\s*\{[\s\S]*color: var\(--muted\);/);
  assert.match(activePreviewTabCss, /background: #eef0f2;/);
  assert.match(activePreviewTabCss, /color: var\(--muted\);/);
  assert.doesNotMatch(activePreviewTabCss, /background:\s*(var\(--ink\)|#000|black)/);
  assert.doesNotMatch(activePreviewTabIconCss, /invert/);
  assert.match(app, /const icon = document\.createElement\("span"\);/);
  assert.match(app, /icon\.style\.setProperty\("--page-icon-mask", `url\("\$\{page\.iconUrl\}"\)`\);/);
  assert.doesNotMatch(app, /document\.createElement\("img"\)/);
  assert.match(pageIconCss, /display: block;/);
  assert.match(pageIconCss, /width: 24px;[\s\S]*height: 24px;/);
  assert.match(pageIconCss, /background-color: currentColor;/);
  assert.match(pageIconCss, /mask: var\(--page-icon-mask\) center \/ contain no-repeat;/);
  assert.doesNotMatch(pageIconCss, /object-fit|filter/);

  for (const className of ["tab-friends", "tab-chat", "tab-openchat", "tab-shopping", "tab-more"]) {
    assert.match(html, new RegExp(`class=\"[^\"]*${className}`));
  }
});

test("visible defaults hide package affixes and use compact download labels", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

  assert.match(html, /id="app-name"[^>]+value="나의 테마"/);
  assert.match(html, /id="download-title">나의 테마<\/strong>/);
  assert.match(html, /id="version"[^>]+pattern="\\d\+\\\.\\d\+\\\.\\d\+"/);
  assert.match(html, /id="version"[^>]+inputmode="numeric"/);
  assert.doesNotMatch(html, />com\.<\/span>/);
  assert.doesNotMatch(html, />\.kakaotalk\.theme<\/span>/);
  assert.match(html, /<button id="download-ios"[^>]*>IOS<\/button>/);
  assert.match(html, /<button id="download-android"[^>]*>Android<\/button>/);
  assert.match(app, /normalizeThemeVersion/);
  assert.match(app, /isValidThemeVersion/);
  assert.match(app, /function updateDownloadButtons/);
  assert.match(app, /downloadIosButton\.disabled = isDownloadDisabled;/);
  assert.match(app, /downloadAndroidButton\.disabled = isDownloadDisabled;/);
});

test("theme id and author wrapper inputs keep rounded focus treatment", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.package-input:focus-within,\s*\.author-input:focus-within/);
  assert.match(css, /\.package-input input,\s*\.author-input input\s*\{[\s\S]*outline: (?:0|none);/);
  assert.match(css, /\.package-input input,\s*\.author-input input\s*\{[\s\S]*border-radius: inherit;/);
});

test("chat list screens hide scrollbars while keeping vertical scroll", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.chat-list-screen\s*\{[\s\S]*overflow-y: auto;/);
  assert.match(css, /\.chat-list-screen\s*\{[\s\S]*scrollbar-width: none;/);
  assert.match(css, /\.chat-list-screen\s*\{[\s\S]*-ms-overflow-style: none;/);
  assert.match(css, /\.chat-list-screen::-webkit-scrollbar\s*\{[\s\S]*display: none;/);
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

test("preview status bars are rendered by one shared widget", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const phoneStatusCount = (html.match(/class="phone-status"/g) ?? []).length;
  const statusPlaceholders = html.match(/<div class="phone-status" data-phone-status><\/div>/g) ?? [];
  const phoneStatusCss = css.match(/\.phone-status\s*\{[\s\S]*?\}/)?.[0] ?? "";

  assert.equal(statusPlaceholders.length, phoneStatusCount);
  assert.ok(statusPlaceholders.length >= 8);
  assert.doesNotMatch(html, /<div class="phone-status">\s*<span>/);
  assert.match(app, /const phoneStatusWidget = \{[\s\S]*time: "9:41"[\s\S]*network: "LTE"[\s\S]*battery: "100%"[\s\S]*\};/);
  assert.match(app, /function createPhoneStatusWidget\(\)/);
  assert.match(app, /document\.querySelectorAll\("\[data-phone-status\]"\)/);
  assert.doesNotMatch(css, /\.shopping-preview \.phone-status/);
  assert.doesNotMatch(phoneStatusCss, /background:/);
});

test("chat input bar reserves the bottom safe area like tab bars", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const chatStart = html.indexOf('class="preview-slide chat-preview"');
  const passcodeStart = html.indexOf('class="preview-slide passcode-preview"');
  const chatMarkup = html.slice(chatStart, passcodeStart);

  assert.match(chatMarkup, /<div class="input-bar">\s*<div class="input-bar-content">/);
  assert.match(css, /\.chat-preview\s*\{[\s\S]*grid-template-rows: 28px 58px 1fr 68px;/);
  assert.match(css, /\.phone-preview\.is-tablet \.chat-preview\s*\{[\s\S]*grid-template-rows: 30px 62px 1fr 70px;/);
  assert.match(css, /\.bottom-tabs\s*\{[\s\S]*--preview-tab-content-height: 49px;/);
  assert.match(
    css,
    /\.input-bar\s*\{[\s\S]*--preview-input-content-height: 49px;[\s\S]*align-items: flex-start;[\s\S]*padding: 0 12px;/,
  );
  assert.match(
    css,
    /\.input-bar-content\s*\{[\s\S]*display: flex;[\s\S]*align-items: center;[\s\S]*gap: 10px;[\s\S]*height: var\(--preview-input-content-height\);/,
  );
  assert.match(css, /\.input-bar-content > button:first-child\s*\{[\s\S]*width: 34px;/);
  assert.doesNotMatch(css, /\.input-bar > button:first-child/);
});

test("chat preview includes default profile and extra basic/additional bubble samples", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const chatStart = html.indexOf('class="preview-slide chat-preview"');
  const passcodeStart = html.indexOf('class="preview-slide passcode-preview"');
  const chatMarkup = html.slice(chatStart, passcodeStart);

  assert.match(chatMarkup, /class="message-group receive"[\s\S]*<span class="sender">가야<\/span>[\s\S]*<p class="bubble receive-bubble">ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ<\/p>/);
  assert.match(chatMarkup, /class="message-group receive"[\s\S]*<div class="avatar default-profile"><\/div>[\s\S]*<span class="sender">가야<\/span>[\s\S]*<p class="bubble receive-bubble additional-bubble">아 웃겨 근데 어떻게 우연히 그럴수 있지\?ㅠㅠㅠ<\/p>[\s\S]*<p class="bubble receive-bubble additional-bubble">/);
  assert.match(chatMarkup, /class="message-group send"[\s\S]*<p class="bubble send-bubble short">진심 너무 웃기지ㅠ\?\?<\/p>[\s\S]*<p class="bubble send-bubble additional-bubble">나도 그래서 보면서 이게 실환가 했잖어ㅠ<\/p>/);
  assert.match(chatMarkup, /<p class="bubble send-bubble short">ㅁㅈ 정말 탕후루 했구나<\/p>[\s\S]*<p class="bubble send-bubble additional-bubble">ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ<\/p>/);
  assert.doesNotMatch(chatMarkup, /<span class="sender">친구<\/span>|<span class="sender">슈슈님<\/span>|오늘 테마 분위기 좋다\./);
  assert.match(chatMarkup, /<time class="message-time" data-preview-time>00:00<\/time>/);
  assert.match(css, /\.message-group\.receive\s*\{[\s\S]*align-items: start;/);
  assert.match(css, /\.message-stack\s*\{[\s\S]*align-items: flex-start;/);
  assert.match(css, /\.sender\s*\{[^}]*margin: 3px 0 4px 2px;/);
  assert.match(css, /\.message-group\.send \.message-stack\s*\{[\s\S]*align-items: flex-end;/);
  assert.match(css, /\.bubble\.short\s*\{[\s\S]*width: max-content;[\s\S]*max-width: min\(238px, 100%\);/);
  assert.doesNotMatch(css, /\.bubble\.short\s*\{[\s\S]*max-width: 88px;/);
  assert.match(app, /formatKoreanTime/);
  assert.match(app, /previewTimeElements\.forEach/);
});

test("upload panel no longer shows bubble generation or Android 9-patch helper copy", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

  assert.doesNotMatch(html, /말풍선 9-patch는 자동 변환하고, 탭바 9-patch 이미지는 원본을 유지합니다\./);
  assert.doesNotMatch(html, /class="output-note"/);
  assert.doesNotMatch(app, /3x 업로드 \/ 2x 자동 생성/);
  assert.doesNotMatch(app, /Android 9-patch 자동 적용/);
});

test("background image uploads expose a delete action that falls back to the selected color", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

  assert.match(app, /const clearableBackgroundImageKeys = new Set\(\[[\s\S]*"mainBackground"[\s\S]*"chatBackground"[\s\S]*"tabBackground"[\s\S]*"passcodeBackgroundImage"/);
  assert.match(app, /tabBackground: "tabBackground"/);
  assert.match(app, /clearButton\.dataset\.uploadClear = key;/);
  assert.match(app, /clearButton\.textContent = "삭제";/);
  assert.match(app, /uploads\[key\] = \{ cleared: true \};/);
  assert.match(app, /documentRoot\.style\.setProperty\(variableName, "none"\);/);
});

test("default background uploads start cleared except for the loading screen", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const defaultClearedImageUploadKeys = app.match(/const defaultClearedImageUploadKeys = new Set\(\[[^\n]*\]\);/)?.[0] ?? "";

  assert.match(app, /const defaultClearedImageUploadKeys = new Set\(\[[\s\S]*"mainBackground"[\s\S]*"chatBackground"[\s\S]*"tabBackground"[\s\S]*"passcodeBackgroundImage"/);
  assert.doesNotMatch(defaultClearedImageUploadKeys, /"splashImage"/);
  assert.match(app, /const uploads = Object\.fromEntries\(\[\.\.\.defaultClearedImageUploadKeys\]\.map\(\(key\) => \[key, \{ cleared: true \}\]\)\);/);
  assert.match(app, /if \(isClearedImageUpload\(key\)\) \{[\s\S]*element\.style\.backgroundColor = toPreviewCssColor\(colors\[colorKey\]\);[\s\S]*element\.style\.backgroundImage = "none";/);
});

test("color controls show hex values on the picker and expose reset buttons", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  for (const [key, label] of [
    ["mainBackground", "배경 색"],
    ["tabBackground", "하단 탭 배경 색"],
    ["headerText", "메인 글자 색"],
    ["titleText", "메뉴 글자 색"],
    ["paragraphText", "서브 글자색"],
    ["bodyPressed", "선택 메뉴 배경 색"],
    ["titlePressed", "선택 메뉴 글자 색"],
    ["unreadCount", "레드닷 알림 색"],
    ["sendText", "나의 글자 색"],
    ["receiveText", "상대 글자 색"],
  ]) {
    assert.match(app, new RegExp(`\\["${key}", "${label}"\\]`));
  }
  assert.match(app, /const picker = document\.createElement\("button"\);/);
  assert.match(app, /picker\.type = "button";/);
  assert.match(app, /picker\.className = "color-picker-control";/);
  assert.match(app, /const valueText = document\.createElement\("span"\);/);
  assert.match(app, /valueText\.className = "color-picker-value";/);
  assert.match(app, /valueText\.textContent = normalizedValue;/);
  assert.match(app, /const colorPopover = document\.createElement\("div"\);/);
  assert.match(app, /colorPopover\.className = "color-picker-popover";/);
  assert.match(app, /colorPopover\.hidden = true;/);
  assert.match(app, /const hexInput = document\.createElement\("input"\);/);
  assert.match(app, /hexInput\.type = "text";/);
  assert.match(app, /hexInput\.className = "color-hex-input";/);
  assert.match(app, /hexInput\.focus\(\);/);
  assert.match(app, /hexInput\.select\(\);/);
  assert.match(app, /normalizeHexColorInput/);
  assert.match(app, /function toPreviewCssColor/);
  assert.match(app, /setPreviewColorVariable\("--preview-tab-bg", colors\.tabBackground\);/);
  assert.match(app, /element\.style\.backgroundColor = toPreviewCssColor\(colors\[colorKey\]\);/);
  assert.match(app, /resetButton\.textContent = "초기화";/);
  assert.match(app, /defaultThemeState\.colors\[key\]/);
  assert.match(css, /\.color-inputs\s*\{/);
  assert.match(css, /\.color-picker-control\s*\{/);
  assert.match(css, /\.color-picker-value\s*\{/);
  assert.match(css, /\.color-picker-popover\s*\{/);
  assert.match(css, /\.color-hex-input\s*\{/);
  assert.match(css, /\.color-reset-button\s*\{/);
});

test("tab icon uploads expose optional PNG tinting before theme export", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

  assert.match(app, /import \{ normalizeTintColor, tintImageDataPixels \} from "\.\/image-tint\.js";/);
  assert.match(app, /const tintableUploadKeys = new Set\(VISIBLE_TAB_ICON_IMAGE_KEYS\);/);
  assert.match(app, /const uploadTints = \{\};/);
  assert.match(app, /input\.type = "color";/);
  assert.match(app, /checkbox\.type = "checkbox";/);
  assert.doesNotMatch(app, /text\.textContent = "색";/);
  assert.match(app, /control\.append\(checkbox, input\);/);
  assert.match(app, /await refreshUploadImage\(key\);/);
  assert.match(app, /await getDefaultUploadSource\(key\);/);
  assert.match(app, /sourceKind = "default";/);
  assert.match(app, /function clearGeneratedTintUpload/);
  assert.match(app, /tintImageDataPixels\(imageData, tintColor\);/);
});

test("tab icon upload actions place the color control before the upload button", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

  assert.match(
    app,
    /if \(tintableUploadKeys\.has\(key\)\) \{[\s\S]*actions\.append\(createUploadTintControl\(key, target\)\);[\s\S]*\}[\s\S]*actions\.append\(button\);/,
  );
});

test("tab icon upload labels stay compact and only expose previewed bottom tabs", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const previewPages = await readFile(new URL("../src/preview-pages.js", import.meta.url), "utf8");
  const model = await readFile(new URL("../src/theme-model.js", import.meta.url), "utf8");

  assert.match(model, /export const VISIBLE_TAB_ICON_IMAGE_KEYS = \[/);
  assert.match(app, /import \{[\s\S]*VISIBLE_TAB_ICON_IMAGE_KEYS/);
  assert.match(app, /const uploadKeys = \[[\s\S]*\.\.\.VISIBLE_TAB_ICON_IMAGE_KEYS/);
  assert.doesNotMatch(app, /const uploadKeys = \[[\s\S]*\.\.\.TAB_ICON_IMAGE_KEYS/);
  assert.match(previewPages, /const mainTabImageKeys = \[[\s\S]*\.\.\.VISIBLE_TAB_ICON_IMAGE_KEYS/);
  for (const [key, label] of [
    ["tabFriendIcon", "친구1"],
    ["tabFriendIconSelected", "친구2"],
    ["tabChatIcon", "대화1"],
    ["tabChatIconSelected", "대화2"],
    ["tabOpenChatIcon", "지금1"],
    ["tabOpenChatIconSelected", "지금2"],
    ["tabShoppingIcon", "쇼핑1"],
    ["tabShoppingIconSelected", "쇼핑2"],
    ["tabMoreIcon", "더보기1"],
    ["tabMoreIconSelected", "더보기2"],
  ]) {
    assert.match(app, new RegExp(`${key}: "${label}"`));
  }
  for (const hiddenKey of ["tabCallIcon", "tabPiccomaIcon", "tabFindIcon", "tabGameIcon"]) {
    assert.doesNotMatch(previewPages, new RegExp(`\\.\\.\\.VISIBLE_TAB_ICON_IMAGE_KEYS[\\s\\S]*${hiddenKey}`));
  }
  assert.match(app, /appendUploadLabel\(label, target, key\)/);
  assert.match(app, /function appendUploadLabel/);
  assert.match(app, /formatUploadSizeLines\(target\)/);
  assert.match(app, /className = "upload-size-lines"/);
  assert.match(app, /className = "upload-size-line"/);
  assert.match(app, /\["ios", "IOS"\]/);
  assert.match(app, /\$\{platform\} \$\{width\}x\$\{height\}px/);
  assert.match(app, /target\.displaySizes/);
  assert.match(css, /\.upload-size-lines\s*\{[\s\S]*display: grid;/);
  assert.match(css, /\.upload-size-line\s*\{[\s\S]*display: block;/);
  assert.doesNotMatch(app, /\$\{label\}\(\$\{sizeText\}\)/);
  assert.doesNotMatch(app, /\$\{target\.label\}\(\$\{width\}px x \$\{height\}px\)/);
});

test("chat list headers use local default action icons tinted by the active header color", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const homeStart = html.indexOf('class="preview-slide home-preview"');
  const chatListStart = html.indexOf('class="preview-slide chat-list-preview"');
  const homeMarkup = html.slice(homeStart, chatListStart);
  const homeActions = homeMarkup.match(/<div class="friend-header-actions">[\s\S]*?<\/div>/)?.[0] ?? "";

  for (const path of [
    "../assets/preview/header-icons/headerSearch.png",
    "../assets/preview/header-icons/headerCompose.png",
    "../assets/preview/header-icons/headerSettings.png",
    "../assets/preview/header-icons/headerScan.png",
    "../assets/template-images/ios/Images/maintabIcoFriends@3x.png",
  ]) {
    assert.ok((await stat(new URL(path, import.meta.url))).isFile());
  }

  for (const [className, url] of [
    ["search-action", "./assets/preview/header-icons/headerSearch.png"],
    ["friend-tab-action", "./assets/template-images/ios/Images/maintabIcoFriends@3x.png"],
    ["chat-compose-icon", "./assets/preview/header-icons/headerCompose.png"],
    ["settings-action", "./assets/preview/header-icons/headerSettings.png"],
    ["shopping-action-icon", "./assets/template-images/ios/Images/maintabIcoShopping@3x.png"],
    ["scan-action-icon", "./assets/preview/header-icons/headerScan.png"],
  ]) {
    assert.match(css, new RegExp(`\\.${className}\\s*\\{[\\s\\S]*--header-action-mask: url\\("${url.replaceAll("/", "\\/")}"\\);`));
  }

  assert.equal((homeActions.match(/<button /g) ?? []).length, 3);
  assert.match(homeActions, /aria-label="검색"/);
  assert.match(homeActions, /aria-label="친구"/);
  assert.match(homeActions, /class="friend-action-icon friend-tab-action"/);
  assert.match(homeActions, /aria-label="설정"/);
  assert.doesNotMatch(homeActions, /aria-label="친구 추가"|aria-label="음악"|add-action|music-action/);
  assert.match(css, /\.friend-header-actions button\s*\{[\s\S]*width: 28px;[\s\S]*height: 28px;/);
  assert.match(
    css,
    /\.friend-action-icon,\s*\.chat-compose-icon,\s*\.shopping-action-icon,\s*\.scan-action-icon\s*\{[\s\S]*width: 20px;[\s\S]*height: 20px;[\s\S]*background-color: currentColor;[\s\S]*mask: var\(--header-action-mask\) center \/ contain no-repeat;/,
  );
  assert.match(css, /\.phone-header\s*\{[\s\S]*color: var\(--preview-header, #664242\);/);
  assert.match(css, /\.chat-list-header > strong\s*\{[^}]*font-size: 18px;/);
  assert.match(css, /\.main-header \.friend-header-actions\s*\{[\s\S]*grid-template-columns: repeat\(3, 28px\);[\s\S]*gap: 12px;/);
  assert.match(css, /\.chat-list-actions\s*\{[\s\S]*grid-template-columns: repeat\(3, 28px\);[\s\S]*gap: 12px;/);
  assert.match(css, /\.phone-header \.chat-list-actions\s*\{[\s\S]*grid-template-columns: repeat\(3, 28px\);[\s\S]*gap: 12px;/);
  assert.match(css, /\.chat-list-actions button\s*\{[\s\S]*width: 28px;[\s\S]*height: 28px;/);
  assert.doesNotMatch(css, /cdn-icons-png\.flaticon\.com/);
  assert.doesNotMatch(css, /\.add-action\s*\{|\.music-action\s*\{/);
  assert.doesNotMatch(css, /\.search-action::before/);
  assert.doesNotMatch(css, /\.search-action::after/);
  assert.doesNotMatch(css, /\.settings-action::before/);
  assert.doesNotMatch(css, /\.chat-compose-icon::before/);
  assert.doesNotMatch(css, /\.chat-compose-icon::after/);
});

test("unread badges center the white count inside the red pill", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.unread-badge\s*\{[\s\S]*display: inline-flex;[\s\S]*align-items: center;[\s\S]*justify-content: center;[\s\S]*height: 18px;[\s\S]*line-height: 18px;/);
});

test("bottom tab preview removes text labels and centers icons in the downloaded tab content area", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const bottomTabsStart = html.indexOf('class="bottom-tabs"');
  const homeEnd = html.indexOf("</article>", bottomTabsStart);
  const bottomTabsMarkup = html.slice(bottomTabsStart, homeEnd);
  const tabIconBlock = css.match(/\.tab-icon\s*\{[^}]*\}/)?.[0] ?? "";

  assert.match(bottomTabsMarkup, /aria-label="친구"/);
  assert.match(bottomTabsMarkup, /aria-label="대화"/);
  assert.match(bottomTabsMarkup, /aria-label="오픈채팅"/);
  assert.match(bottomTabsMarkup, /aria-label="쇼핑"/);
  assert.match(bottomTabsMarkup, /aria-label="더보기"/);
  for (const label of ["친구", "대화", "오픈채팅", "쇼핑", "더보기"]) {
    assert.doesNotMatch(bottomTabsMarkup, new RegExp(`>${label}<\\/span>`));
  }
  assert.match(bottomTabsMarkup, /class="tab-friends is-selected"/);
  assert.match(css, /\.bottom-tabs\s*\{[\s\S]*--preview-tab-content-height: 49px;[\s\S]*align-items: flex-start;/);
  assert.match(css, /\.bottom-tabs button\s*\{[\s\S]*height: var\(--preview-tab-content-height\);/);
  assert.match(css, /\.tab-icon\s*\{[\s\S]*width: 38px;[\s\S]*height: 38px;/);
  assert.doesNotMatch(tabIconBlock, /transform:/);
  assert.match(app, /PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY/);
  assert.deepEqual(PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY.tabFriendIcon, ["--preview-tab-friends-icon"]);
  assert.deepEqual(PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY.tabFriendIconSelected, ["--preview-tab-friends-icon-selected"]);
  assert.equal(PREVIEW_CSS_IMAGE_VARIABLES["--preview-tab-friends-icon"], `url("./${PREVIEW_DEFAULT_IMAGE_PATHS.tabFriendIcon}")`);
  assert.equal(
    PREVIEW_CSS_IMAGE_VARIABLES["--preview-tab-chat-icon-selected"],
    `url("./${PREVIEW_DEFAULT_IMAGE_PATHS.tabChatIconSelected}")`,
  );
  assert.notDeepEqual(PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY.tabFriendIcon, [
    "--preview-tab-friends-icon",
    "--preview-tab-friends-icon-selected",
  ]);
});

test("tab icon upload thumbnails show the bundled default icons before upload", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(app, /element\.classList\.toggle\("is-tab-icon-thumb", tabIconUploadKeys\.has\(key\)\);/);
  assert.match(app, /const previewImage = getPreviewDefaultCssUrl\(key\);/);
  assert.match(app, /element\.style\.backgroundImage = previewImage;/);
  assert.match(css, /\.upload-thumb\.is-tab-icon-thumb\s*\{/);
  assert.match(css, /\.upload-thumb\.is-tab-icon-thumb\s*\{[\s\S]*background-size: 38px 38px;/);

  for (const key of [
    "tabFriendIcon",
    "tabFriendIconSelected",
    "tabChatIcon",
    "tabChatIconSelected",
    "tabOpenChatIcon",
    "tabOpenChatIconSelected",
    "tabShoppingIcon",
    "tabShoppingIconSelected",
    "tabMoreIcon",
    "tabMoreIconSelected",
  ]) {
    assert.match(PREVIEW_DEFAULT_IMAGE_PATHS[key], /assets\/template-images\/ios\/Images\/maintabIco.+@3x\.png/);
  }
});

test("preview includes a chat list screen before the chat room", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const chatListStart = html.indexOf('class="preview-slide chat-list-preview"');
  const openChatStart = html.indexOf('class="preview-slide open-chat-preview"');
  const chatStart = html.indexOf('class="preview-slide chat-preview"');
  const chatListMarkup = html.slice(chatListStart, openChatStart);
  const tabletChatListCss = css.match(/\.phone-preview\.is-tablet \.chat-list-screen\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const groupAvatarItemCss = css.match(/\.avatar\.group-avatar \.group-avatar-item\s*\{[\s\S]*?\}/)?.[0] ?? "";

  assert.ok(chatListStart > -1);
  assert.ok(openChatStart > chatListStart);
  assert.ok(chatStart > chatListStart);
  assert.match(chatListMarkup, /aria-label="대화 목록 프리뷰"/);
  assert.match(chatListMarkup, /class="phone-header chat-list-header"[\s\S]*<strong>대화<\/strong>/);
  assert.match(chatListMarkup, /class="chat-list-row"[\s\S]*data-preview-time/);
  for (const [name, message, unread] of [
    ["수매", "지금 뭐하고 있어요?", "1"],
    ["수기람", "이번에 개봉한 영화 봤어? 안 봤음 같이 보자!", "5"],
    ["허약 4인방", "오늘 저녁 OO역 맞지?", "38"],
    ["쭈디, 건이", "오늘 잼썼어 다들 잘 들어가고~", "3"],
    ["금요일 조아", "(사진)", "10"],
  ]) {
    assert.match(
      chatListMarkup,
      new RegExp(
        `<strong>${escapeRegExp(name)}<\\/strong>[\\s\\S]*<span>${escapeRegExp(message)}<\\/span>[\\s\\S]*<span class="unread-badge">${unread}<\\/span>`,
      ),
    );
  }
  for (const [name, message] of [
    ["대표님", "OK~"],
    ["학원 13기모임 - 일등이조", "메일 보냈습니다. 다들 좋은 밤 되세요"],
    ["엄마", "내일 아침에 비온대, 우산 꼭 챙겨"],
    ["선배", "매번 고맙고, 땡큐~ 잘 자!"],
  ]) {
    assert.match(
      chatListMarkup,
      new RegExp(
        `<strong>${escapeRegExp(name)}<\\/strong>[\\s\\S]*<span>${escapeRegExp(message)}<\\/span>[\\s\\S]*<div class="chat-list-meta">\\s*<time data-preview-time>00:00<\\/time>\\s*<\\/div>`,
      ),
    );
  }
  for (const [name, groupClass, profileCount] of [
    ["허약 4인방", "group-4", 4],
    ["학원 13기모임 - 일등이조", "group-4", 4],
    ["쭈디, 건이", "group-2", 2],
    ["금요일 조아", "group-4", 4],
  ]) {
    const row = chatListRowByTitle(chatListMarkup, name);

    assert.match(row, new RegExp(`class="avatar group-avatar ${groupClass}"`));
    assert.equal((row.match(/<span class="group-avatar-item"><\/span>/g) ?? []).length, profileCount);
  }
  for (const [name, memberCount] of [
    ["허약 4인방", "4"],
    ["학원 13기모임 - 일등이조", "7"],
    ["쭈디, 건이", "3"],
    ["금요일 조아", "6"],
  ]) {
    assert.match(
      chatListRowByTitle(chatListMarkup, name),
      new RegExp(
        `<div class="chat-list-title">\\s*<strong>${escapeRegExp(name)}<\\/strong>\\s*<span class="room-member-count">${memberCount}<\\/span>\\s*<\\/div>`,
      ),
    );
  }
  for (const name of ["수매", "수기람", "대표님", "엄마", "선배"]) {
    assert.doesNotMatch(chatListRowByTitle(chatListMarkup, name), /group-avatar/);
    assert.doesNotMatch(chatListRowByTitle(chatListMarkup, name), /room-member-count/);
  }
  assert.doesNotMatch(chatListMarkup, /<strong>친구<\/strong>|<strong>슈슈님<\/strong>|오늘 테마 분위기 좋다\.|나와의 채팅|이미지와 컬러를 확인해봐\.|테마 미리보기|채팅방 화면으로 들어가기 전 목록\./);
  assert.match(chatListMarkup, /class="tab-chat is-selected"/);
  assert.doesNotMatch(chatListMarkup, /class="tab-friends is-selected"/);
  assert.match(css, /\.chat-list-preview\s*\{[\s\S]*grid-template-rows: 30px 68px 1fr 68px;/);
  assert.match(css, /\.chat-list-screen\s*\{[\s\S]*overflow-y: auto;/);
  assert.match(css, /\.chat-list-screen\s*\{[\s\S]*scrollbar-width: none;/);
  assert.match(css, /\.chat-list-screen\s*\{[\s\S]*-ms-overflow-style: none;/);
  assert.match(css, /\.chat-list-screen::-webkit-scrollbar\s*\{[\s\S]*display: none;/);
  assert.match(css, /\.chat-list-row\s*\{[\s\S]*grid-template-columns: 48px minmax\(0, 1fr\) auto;/);
  assert.match(css, /\.chat-list-title\s*\{[\s\S]*display: flex;[\s\S]*align-items: baseline;/);
  assert.match(css, /\.room-member-count\s*\{[\s\S]*font-size: 13px;[\s\S]*font-weight: 800;/);
  assert.match(css, /\.avatar\.group-avatar\s*\{[\s\S]*position: relative;[\s\S]*width: 34px;[\s\S]*height: 34px;/);
  assert.match(groupAvatarItemCss, /position: absolute;/);
  assert.match(groupAvatarItemCss, /border-radius: 5px;/);
  assert.match(groupAvatarItemCss, /--group-avatar-image/);
  assert.doesNotMatch(groupAvatarItemCss, /linear-gradient|radial-gradient/);
  assert.doesNotMatch(groupAvatarItemCss, /border-radius:\s*999px/);
  assert.match(css, /\.avatar\.group-avatar\.group-2 \.group-avatar-item\s*\{/);
  assert.match(css, /\.avatar\.group-avatar\.group-4 \.group-avatar-item\s*\{/);
  assert.match(tabletChatListCss, /display: block;/);
  assert.doesNotMatch(tabletChatListCss, /grid-template-columns/);
});

test("preview includes open chat, shopping, and more tab screens", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const openChatStart = html.indexOf('class="preview-slide open-chat-preview"');
  const shoppingStart = html.indexOf('class="preview-slide shopping-preview"');
  const moreStart = html.indexOf('class="preview-slide more-preview"');
  const chatStart = html.indexOf('class="preview-slide chat-preview"');

  assert.ok(openChatStart > -1);
  assert.ok(shoppingStart > openChatStart);
  assert.ok(moreStart > shoppingStart);
  assert.ok(chatStart > moreStart);

  const openChatMarkup = html.slice(openChatStart, shoppingStart);
  const shoppingMarkup = html.slice(shoppingStart, moreStart);
  const moreMarkup = html.slice(moreStart, chatStart);

  assert.match(openChatMarkup, /aria-label="오픈채팅 프리뷰"/);
  assert.match(openChatMarkup, /class="phone-header chat-list-header"[\s\S]*<strong>지금<\/strong>/);
  assert.match(openChatMarkup, /class="chat-list-screen open-chat-screen"[\s\S]*class="chat-list-row[^"]*"[\s\S]*data-preview-time[\s\S]*class="unread-badge"/);
  for (const [name, message, unread] of [
    ["롤체 단톡방", "디코방 공지 ㄱ", "3"],
    ["세션 사담방", "ㅋㅋㅋ아니ㅋㅋㅋㅋ주사위 소금쳐요 빨리ㅋㅋㅋㅋ", "48"],
    ["반려견 단톡방", "왕크왕귀", "8"],
    ["월간 독서모임", "혹시 이번에 읽은 책 추천드려도 될까요? 저 정말 감동있게 읽었어요..!", "1"],
    ["러닝 함께 해요", "이번주 금요일날 8시 넘어서 러닝 계획 있으니 다들 공지 읽어주세요!", "4"],
    ["주식 단타방", "으아 씨게 물렸네요ㅠㅠ", "20"],
  ]) {
    assert.match(
      openChatMarkup,
      new RegExp(
        `<strong>${escapeRegExp(name)}<\\/strong>[\\s\\S]*<span>${escapeRegExp(message)}<\\/span>[\\s\\S]*<span class="unread-badge">${unread}<\\/span>`,
      ),
    );
  }
  for (const [name, groupClass, profileCount] of [
    ["롤체 단톡방", "group-4", 4],
    ["세션 사담방", "group-4", 4],
    ["반려견 단톡방", "group-4", 4],
    ["월간 독서모임", "group-4", 4],
    ["러닝 함께 해요", "group-4", 4],
    ["주식 단타방", "group-4", 4],
  ]) {
    const row = chatListRowByTitle(openChatMarkup, name);

    assert.match(row, new RegExp(`class="avatar group-avatar ${groupClass}"`));
    assert.equal((row.match(/<span class="group-avatar-item"><\/span>/g) ?? []).length, profileCount);
  }
  for (const [name, memberCount] of [
    ["롤체 단톡방", "8"],
    ["세션 사담방", "4"],
    ["반려견 단톡방", "12"],
    ["월간 독서모임", "9"],
    ["러닝 함께 해요", "14"],
    ["주식 단타방", "21"],
  ]) {
    assert.match(
      chatListRowByTitle(openChatMarkup, name),
      new RegExp(
        `<div class="chat-list-title">\\s*<strong>${escapeRegExp(name)}<\\/strong>\\s*<span class="room-member-count">${memberCount}<\\/span>\\s*<\\/div>`,
      ),
    );
  }
  assert.doesNotMatch(openChatMarkup, /지금 뜨는 오픈채팅/);
  assert.doesNotMatch(openChatMarkup, /테마 제작자 모임|새 말풍선과 탭 아이콘을 함께 확인해요\.|오늘의 감성 채팅|배경 이미지와 컬러 조합 공유\.|반려견 단톡방 @강아지정보 @친목|\(사진\)|아이콘 테스트방|책덕후들의 아지트|선택된 지금 탭을 확인해 보세요\.|초보 헬스인 모임|요새 안 보이시던데, 헬스장 언제 오시나요\./);
  assert.doesNotMatch(openChatMarkup, /open-room-card|room-count|tab-section-title/);
  assert.match(openChatMarkup, /class="tab-openchat is-selected"/);
  assert.doesNotMatch(openChatMarkup, /class="tab-chat is-selected"/);
  assert.match(shoppingMarkup, /aria-label="쇼핑 프리뷰"/);
  assert.match(shoppingMarkup, /class="tab-shopping is-selected"/);
  assert.match(moreMarkup, /aria-label="더보기 프리뷰"/);
  assert.match(moreMarkup, /class="more-segment is-active"[^>]*>홈<\/button>[\s\S]*class="more-segment"[^>]*>지갑<\/button>/);
  for (const label of [
    "선물하기",
    "받은선물",
    "톡딜",
    "이모티콘",
    "라이브쇼핑",
    "메이커스",
    "프렌즈",
    "게임",
    "모바일신분증",
    "톡클라우드",
    "캘린더",
    "예약하기",
  ]) {
    assert.match(moreMarkup, new RegExp(`<strong>${label}<\\/strong>`));
  }
  assert.match(moreMarkup, /class="more-ad-card"[\s\S]*리딩로그[\s\S]*TTS로 당신의 플레이 로그를 읽어보세요\.[\s\S]*리딩로그ReadingLog[\s\S]*다운로드/);
  assert.match(
    moreMarkup,
    /<a href="https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.reha\.readinglog" target="_blank" rel="noopener noreferrer">다운로드<\/a>/,
  );
  assert.doesNotMatch(moreMarkup, /<button type="button">다운로드<\/button>/);
  assert.doesNotMatch(moreMarkup, /메이플 키우기|테마 프리뷰 광고 영역/);
  assert.match(moreMarkup, /class="more-section-heading">게임플레이<\/div>/);
  assert.doesNotMatch(moreMarkup, /pay|페이|0원|송금|자산|결제/);
  assert.match(moreMarkup, /class="tab-more is-selected"/);
  assert.match(css, /\.open-chat-preview,\s*\.shopping-preview,\s*\.more-preview\s*\{[\s\S]*grid-template-rows: 30px 68px 1fr 68px;/);
  assert.match(css, /\.tab-preview-screen\s*\{[\s\S]*background:[\s\S]*var\(--preview-main-image, none\)/);
  assert.match(css, /\.more-service-panel\s*\{[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.more-service-icon\s*\{[\s\S]*border-radius: 50%;/);
  assert.doesNotMatch(css, /\.more-service-icon\.(?:gift|giftbox|deal|emoticon|live|makers|friends|game|idcard|cloud|calendar|reservation)::before\s*\{[\s\S]*border-radius:/);
  assert.doesNotMatch(css, /\.more-service-icon::(?:before|after)\s*\{/);
  assert.match(css, /\.more-ad-art\s*\{[\s\S]*aspect-ratio: 16 \/ 9;/);
  assert.match(css, /\.more-ad-footer a\s*\{/);
  assert.doesNotMatch(css, /\.more-ad-footer button\s*\{/);
});

test("preview ad copy stays out of downloadable theme source templates", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const iosTemplate = await readFile(new URL("../assets/templates/ios/KakaoTalkTheme.css", import.meta.url), "utf8");
  const androidThemeStrings = await readFile(
    new URL("../assets/templates/android-source/src/main/theme/values/strings.xml", import.meta.url),
    "utf8",
  );
  const androidAppStrings = await readFile(
    new URL("../assets/templates/android-source/src/main/res/values/strings.xml", import.meta.url),
    "utf8",
  );
  const previewOnlyPhrases = [
    "[광고] 연성 교환을 구하고 있습니다.",
    "폼 :",
    "*해당 광고는 실제 들어가지 않습니다.",
    "TTS로 당신의 플레이 로그를 읽어보세요.",
    "리딩로그ReadingLog",
  ];

  for (const phrase of previewOnlyPhrases) {
    const pattern = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    assert.match(html, pattern);
    assert.doesNotMatch(iosTemplate, pattern);
    assert.doesNotMatch(androidThemeStrings, pattern);
    assert.doesNotMatch(androidAppStrings, pattern);
  }
});

test("friend promo caption visibility is controlled by runtime env config", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.match(html, /<div class="friends-promo-card" data-friend-ad-caption>/);
  assert.match(app, /import \{ SHOW_FRIEND_AD_CAPTION \} from "\.\/env-config\.js";/);
  assert.match(app, /function applyFriendAdCaptionVisibility\(\)/);
  assert.match(app, /caption\.hidden = !isVisible;/);
  assert.match(app, /applyFriendAdCaptionVisibility\(\);/);
  assert.equal(packageJson.scripts.env, "node scripts/env-config.mjs");
});

test("open chat list keeps added group rooms before stock room", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const openChatStart = html.indexOf('class="preview-slide open-chat-preview"');
  const shoppingStart = html.indexOf('class="preview-slide shopping-preview"');
  const openChatMarkup = html.slice(openChatStart, shoppingStart);
  const stockRoomIndex = openChatMarkup.indexOf("<strong>주식 단타방</strong>");
  const renamedRooms = [
    ["레이드 공대팟", "20", "확인했습니다"],
    ["맛있는 케이크를 먹으러", "5", "맛있겠다~"],
    ["앤솔로지 마감방", "12", "모두 수고하셨습니다!"],
    ["아파트 단톡방", "55", "플라스틱 발판 교체건에 대한 투표입니다! 공지 확인해주시고 많은 참여 바랍니다!"],
  ];

  assert.equal(chatListRowsByTitle(openChatMarkup, "어쩌구 저쩌구1").length, 0);
  assert.ok(stockRoomIndex > -1);

  for (const [name, memberCount, message] of renamedRooms) {
    const row = chatListRowByTitle(openChatMarkup, name);
    const roomIndex = openChatMarkup.indexOf(`<strong>${name}</strong>`);

    assert.ok(roomIndex > -1);
    assert.ok(roomIndex < stockRoomIndex);
    assert.match(row, /class="avatar group-avatar group-4"/);
    assert.equal((row.match(/<span class="group-avatar-item"><\/span>/g) ?? []).length, 4);
    assert.match(row, new RegExp(`<span class="room-member-count">${memberCount}<\\/span>`));
    assert.match(row, new RegExp(`<span>${escapeRegExp(message)}<\\/span>`));
    assert.doesNotMatch(row, /class="unread-badge"/);
  }

  assert.doesNotMatch(openChatMarkup, /이러쿵 저러쿵2/);
});

test("shopping preview uses home ranking tabs, summary cards, and today pick products", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const shoppingStart = html.indexOf('class="preview-slide shopping-preview"');
  const moreStart = html.indexOf('class="preview-slide more-preview"');
  const shoppingMarkup = html.slice(shoppingStart, moreStart);

  assert.match(shoppingMarkup, /class="shopping-tab is-active"[^>]*>홈<\/button>/);
  assert.match(shoppingMarkup, /class="shopping-tab"[^>]*>랭킹<\/button>/);
  assert.doesNotMatch(shoppingMarkup, /쟁쟁한특가|더블할인/);
  for (const label of ["최근 본 상품", "찜한 상품", "더보기", "주문내역"]) {
    assert.match(shoppingMarkup, new RegExp(escapeRegExp(label)));
  }
  assert.match(shoppingMarkup, /class="shopping-pick-title"[\s\S]*오늘의 PICK/);
  assert.match(shoppingMarkup, /class="shopping-pick-carousel"[\s\S]*class="shop-card"/);
  assert.match(shoppingMarkup, /class="shopping-summary-track"/);
  assert.doesNotMatch(shoppingMarkup, /shopping-service|선물하기|톡딜|라이브쇼핑|브랜드딜|FOR ME/);

  for (let index = 0; index < 4; index += 1) {
    assert.match(shoppingMarkup, new RegExp(`data-shopping-image-index="${index}"`));
  }
  for (const badge of ["단독", "요즘인기", "베스트"]) {
    assert.match(shoppingMarkup, new RegExp(`<span class="shop-badge">${escapeRegExp(badge)}<\\/span>`));
  }

  assert.match(css, /\.shopping-screen\s*\{[\s\S]*var\(--preview-main-image, none\)[\s\S]*var\(--preview-main-bg, #ffdddd\);/);
  assert.doesNotMatch(css, /#050505/);
  assert.match(css, /\.shopping-tabs\s*\{[\s\S]*display: flex;/);
  assert.match(css, /\.shopping-summary-card\s*\{[\s\S]*background: rgba\(255, 255, 255, 0\.9\);/);
  assert.match(css, /\.shopping-summary-track\s*\{[\s\S]*overflow-x: auto;/);
  assert.match(css, /\.shopping-pick-title strong\s*\{[\s\S]*font-size: 19px;/);
  assert.match(css, /\.shopping-pick-carousel\s*\{[\s\S]*grid-auto-flow: column;[\s\S]*grid-auto-columns: minmax\(214px, 86%\);[\s\S]*overflow-x: auto;[\s\S]*touch-action: pan-x;[\s\S]*user-select: none;/);
  assert.match(css, /\.shopping-pick-carousel\.is-dragging\s*\{[\s\S]*cursor: grabbing;/);
  assert.match(css, /\.shop-card\s*\{[\s\S]*position: relative;[\s\S]*min-height: 338px;[\s\S]*overflow: hidden;/);
  assert.match(css, /\.shop-card::before\s*\{[\s\S]*linear-gradient\(180deg, rgba\(0, 0, 0, 0\) 64%, rgba\(0, 0, 0, 0\.3\) 86%, rgba\(0, 0, 0, 0\.52\) 100%\)/);
  assert.match(css, /\.shop-thumb\s*\{[\s\S]*position: absolute;[\s\S]*inset: 0;[\s\S]*height: 100%;/);
  assert.match(css, /\.shop-card::after\s*\{[\s\S]*inset: auto 0 0;[\s\S]*height: 25%;[\s\S]*backdrop-filter: blur\(10px\);[\s\S]*mask-image: linear-gradient\(180deg, transparent 0%, #000 42%, #000 100%\);/);
  assert.match(css, /\.shop-card-content\s*\{[\s\S]*position: absolute;[\s\S]*bottom: 14px;[\s\S]*z-index: 2;[\s\S]*gap: 4px;/);
  assert.match(css, /\.shop-card \.shop-badge\s*\{[\s\S]*position: relative;[\s\S]*display: inline-flex;[\s\S]*align-items: center;[\s\S]*justify-content: center;[\s\S]*height: 28px;[\s\S]*padding: 1px 12px 0;[\s\S]*border-radius: 999px;[\s\S]*line-height: 1;[\s\S]*transform: translateY\(2px\);/);
  assert.match(css, /\.shop-card \.shop-badge::after\s*\{/);
  assert.match(app, /enableHorizontalDragScroll\("\.shopping-pick-carousel"\);/);
  assert.match(app, /scroller\.scrollLeft = startScrollLeft - deltaX;/);
});

test("preview segment controls use the same pressed color data as downloadable themes", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const themeModel = await readFile(new URL("../src/theme-model.js", import.meta.url), "utf8");
  const friendSegmentCss = css.match(/\.friend-segment\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const shoppingTabCss = css.match(/\.shopping-tab\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const moreSegmentCss = css.match(/\.more-segment\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const shoppingTabActiveCss = css.match(/\.shopping-tab\.is-active\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const moreSegmentActiveCss = css.match(/\.more-segment\.is-active\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const friendSegmentActiveCss = css.match(/\.friend-segment\.is-active\s*\{[\s\S]*?\}/)?.[0] ?? "";

  assert.match(themeModel, /\["MainViewStyle-Primary", "-ios-text-color", "titleText"\]/);
  assert.match(themeModel, /\["MainViewStyle-Primary", "-ios-selected-background-color", "bodyPressed"\]/);
  assert.match(themeModel, /theme_title_color:\s*"titleText"/);
  assert.match(themeModel, /theme_body_cell_pressed_color:\s*"bodyPressed"/);
  assert.match(themeModel, /theme_body_cell_border_color:\s*"bodyBorder"/);
  assert.match(themeModel, /theme_title_pressed_color:\s*"titlePressed"/);
  assert.match(app, /setPreviewColorVariable\("--preview-title", colors\.titleText\);/);
  assert.match(app, /setPreviewColorVariable\("--preview-body-border", colors\.bodyBorder\);/);
  assert.match(app, /setPreviewColorVariable\("--preview-selected-bg", colors\.bodyPressed\);/);
  assert.match(app, /setPreviewColorVariable\("--preview-selected-text", colors\.titlePressed\);/);

  for (const segmentCss of [friendSegmentCss, shoppingTabCss, moreSegmentCss]) {
    assert.match(segmentCss, /border: 1px solid var\(--preview-body-border, #26664242\);/);
    assert.match(segmentCss, /color: var\(--preview-title, #664242\);/);
    assert.doesNotMatch(segmentCss, /--preview-header|color-mix/);
  }
  assert.match(friendSegmentCss, /background: transparent;/);
  assert.match(moreSegmentCss, /background: transparent;/);
  assert.match(shoppingTabCss, /background: transparent;/);

  for (const segmentCss of [friendSegmentActiveCss, shoppingTabActiveCss, moreSegmentActiveCss]) {
    assert.match(segmentCss, /background: var\(--preview-selected-bg, #ffb3b3\);/);
    assert.match(segmentCss, /color: var\(--preview-selected-text, #b06b6b\);/);
    assert.doesNotMatch(segmentCss, /--preview-header|--preview-main-bg/);
  }
});

test("shopping preview keeps the status bar common and applies the main background below it", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const shoppingPreviewCss = css.match(/\.shopping-preview\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const shoppingHeaderCss = css.match(/\.shopping-preview \.phone-header\s*\{[\s\S]*?\}/)?.[0] ?? "";

  assert.doesNotMatch(css, /\.shopping-preview \.phone-status/);
  assert.doesNotMatch(shoppingPreviewCss, /--preview-main-bg|--preview-main-image/);
  assert.match(shoppingHeaderCss, /--preview-main-image/);
  assert.match(shoppingHeaderCss, /--preview-main-bg/);
  assert.doesNotMatch(shoppingHeaderCss, /--preview-tab-bg/);
});

test("section title color is visible on preview section headings", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const friendsSectionLabelCss = css.match(/\.friends-section-label\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const shoppingPickTitleCss = css.match(/\.shopping-pick-title strong\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const shoppingPickInfoCss = css.match(/\.shopping-pick-title span\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const moreSectionHeadingCss = css.match(/\.more-section-heading\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const themeListSectionTitleCss = css.match(/\.theme-list-screen \.section-title\s*\{[\s\S]*?\}/)?.[0] ?? "";

  for (const sectionCss of [
    friendsSectionLabelCss,
    shoppingPickTitleCss,
    shoppingPickInfoCss,
    moreSectionHeadingCss,
    themeListSectionTitleCss,
  ]) {
    assert.match(sectionCss, /--preview-section-title/);
  }
  assert.doesNotMatch(css, /--preview-section(?!-title)/);
});

test("preview color variables use the same color keys as downloadable themes", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const themeModel = await readFile(new URL("../src/theme-model.js", import.meta.url), "utf8");
  const previewColorBindings = new Map(
    [...app.matchAll(/setPreviewColorVariable\("([^"]+)", colors\.([A-Za-z0-9]+)\);/g)].map((match) => [
      match[2],
      match[1],
    ]),
  );
  const previewColorKeys = [...new Set(PREVIEW_PAGES.flatMap((page) => page.colorKeys))];

  for (const key of previewColorKeys) {
    assert.ok(previewColorBindings.has(key), `${key} has a preview CSS variable`);
    assert.match(
      themeModel,
      new RegExp(`\\["[^"]+", "[^"]+", "${key}"\\]`),
      `${key} has an iOS download color binding`,
    );
    assert.match(
      themeModel,
      new RegExp(`:\\s*"${key}"`),
      `${key} has an Android download color binding`,
    );
  }

  assert.equal(previewColorBindings.get("tabBackground"), "--preview-tab-bg");
  assert.equal(previewColorBindings.get("unreadCount"), "--preview-unread-count");
  assert.equal(previewColorBindings.get("inputMenuButton"), "--preview-input-menu-button");
  assert.match(app, /setPreviewColorVariable\("--preview-input-menu-button", colors\.inputMenuButton\);/);
  assert.match(css, /\.input-bar-content > button:first-child\s*\{[\s\S]*background: var\(--preview-input-menu-button, #0a000000\);/);
  assert.match(css, /\.unread-badge\s*\{[\s\S]*background: var\(--preview-unread-count, #ff7f7f\);/);
  assert.match(themeModel, /\["MessageCellStyle-Send", "-ios-unread-text-color", "unreadCount"\]/);
  assert.match(themeModel, /\["InputBarStyle-Chat", "-ios-button-normal-background-color", "#000000"\]/);
  assert.match(themeModel, /\["InputBarStyle-Chat", "-ios-button-normal-background-alpha", "0\.04"\]/);
  assert.match(themeModel, /theme_chatroom_input_bar_menu_button_color:\s*"inputMenuButton"/);
  assert.match(themeModel, /theme_chatroom_unread_count_color:\s*"unreadCount"/);
  assert.match(themeModel, /theme_tab_lightbannerbadge_background_color:\s*"unreadCount"/);
  assert.match(themeModel, /theme_tab_bannerbadge_background_color:\s*"unreadCount"/);
});

test("reading log ad background image is replaceable and stays preview-only", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const iosTemplate = await readFile(new URL("../assets/templates/ios/KakaoTalkTheme.css", import.meta.url), "utf8");
  const androidThemeColors = await readFile(
    new URL("../assets/templates/android-source/src/main/theme/values/colors.xml", import.meta.url),
    "utf8",
  );
  const androidThemeStrings = await readFile(
    new URL("../assets/templates/android-source/src/main/theme/values/strings.xml", import.meta.url),
    "utf8",
  );
  const imageStat = await stat(new URL("../assets/preview/more-ad-images/readingLogAd.png", import.meta.url));

  assert.equal(imageStat.isFile(), true);
  assert.match(css, /url\("\.\/assets\/preview\/more-ad-images\/readingLogAd\.png"\)/);
  for (const downloadableSource of [iosTemplate, androidThemeColors, androidThemeStrings]) {
    assert.doesNotMatch(downloadableSource, /readingLogAd|more-ad-images|shopping-preview|shopping-screen|#050505/);
  }
});

test("friend preview profile image files are sequentially replaceable", async () => {
  for (let index = 1; index <= 7; index += 1) {
    const imagePath = `../assets/preview/profile-images/profileImage_${String(index).padStart(2, "0")}.png`;
    const imageStat = await stat(new URL(imagePath, import.meta.url));

    assert.equal(imageStat.isFile(), true);
  }
});

test("group chat preview avatars use replaceable Unsplash image tiles", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const iosTemplate = await readFile(new URL("../assets/templates/ios/KakaoTalkTheme.css", import.meta.url), "utf8");
  const androidThemeColors = await readFile(
    new URL("../assets/templates/android-source/src/main/theme/values/colors.xml", import.meta.url),
    "utf8",
  );
  const groupAvatarItemCss = css.match(/\.avatar\.group-avatar \.group-avatar-item\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const groupTwoAvatarCss = css.match(/\.avatar\.group-avatar\.group-2\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const groupTwoCss = css.match(/\.avatar\.group-avatar\.group-2 \.group-avatar-item\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const groupTwoFirstCss =
    css.match(/\.avatar\.group-avatar\.group-2 \.group-avatar-item:nth-child\(1\)\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const groupTwoSecondCss =
    css.match(/\.avatar\.group-avatar\.group-2 \.group-avatar-item:nth-child\(2\)\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const groupFourCss = css.match(/\.avatar\.group-avatar\.group-4 \.group-avatar-item\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const groupFourFirstCss =
    css.match(/\.avatar\.group-avatar\.group-4 \.group-avatar-item:nth-child\(1\)\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const groupFourSecondCss =
    css.match(/\.avatar\.group-avatar\.group-4 \.group-avatar-item:nth-child\(2\)\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const groupFourThirdCss =
    css.match(/\.avatar\.group-avatar\.group-4 \.group-avatar-item:nth-child\(3\)\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const groupFourFourthCss =
    css.match(/\.avatar\.group-avatar\.group-4 \.group-avatar-item:nth-child\(4\)\s*\{[\s\S]*?\}/)?.[0] ?? "";

  assert.match(app, /const groupAvatarImages = \[/);
  assert.match(app, /applyGroupAvatarImages\(\);/);
  assert.match(app, /--group-avatar-image/);

  for (let index = 1; index <= 12; index += 1) {
    const imagePath = `../assets/preview/group-avatar-images/groupAvatar_${String(index).padStart(2, "0")}.jpg`;
    const appImagePath = `./assets/preview/group-avatar-images/groupAvatar_${String(index).padStart(2, "0")}.jpg`;
    const imageStat = await stat(new URL(imagePath, import.meta.url));

    assert.equal(imageStat.isFile(), true);
    assert.match(app, new RegExp(escapeRegExp(appImagePath)));
  }

  assert.match(groupAvatarItemCss, /background:\s*var\(--group-avatar-image, none\) center \/ cover no-repeat,/);
  assert.doesNotMatch(groupAvatarItemCss, /linear-gradient|radial-gradient/);
  assert.doesNotMatch(css, /\.avatar\.group-avatar \.group-avatar-item:nth-child\(\d\)\s*\{[\s\S]*?background:/);
  assert.match(groupAvatarItemCss, /border: 0;/);
  assert.match(groupAvatarItemCss, /box-shadow: none;/);
  assert.doesNotMatch(groupAvatarItemCss, /preview-main-bg|color-mix/);
  assert.match(groupAvatarItemCss, /border-radius: 5px;/);
  assert.match(groupTwoAvatarCss, /width: 40px;/);
  assert.match(groupTwoAvatarCss, /height: 40px;/);
  assert.match(groupTwoCss, /width: 19px;/);
  assert.match(groupTwoCss, /height: 19px;/);
  assert.match(groupTwoCss, /border-radius: 6px;/);
  assert.match(groupTwoFirstCss, /top: 0;/);
  assert.match(groupTwoFirstCss, /left: 0;/);
  assert.match(groupTwoSecondCss, /right: 0;/);
  assert.match(groupTwoSecondCss, /bottom: 0;/);
  assert.doesNotMatch(groupTwoSecondCss, /border-width:/);
  assert.match(groupFourCss, /width: 16px;/);
  assert.match(groupFourCss, /height: 16px;/);
  assert.match(groupFourCss, /border-radius: 5px;/);
  assert.match(groupFourFirstCss, /top: 0;/);
  assert.match(groupFourFirstCss, /left: 0;/);
  assert.match(groupFourSecondCss, /top: 0;/);
  assert.match(groupFourSecondCss, /right: 0;/);
  assert.match(groupFourThirdCss, /bottom: 0;/);
  assert.match(groupFourThirdCss, /left: 0;/);
  assert.match(groupFourFourthCss, /right: 0;/);
  assert.match(groupFourFourthCss, /bottom: 0;/);
  assert.doesNotMatch(groupFourFirstCss + groupFourSecondCss + groupFourThirdCss + groupFourFourthCss, /left: 1px|right: 1px|bottom: 1px/);
  assert.doesNotMatch(iosTemplate, /group-avatar|groupAvatar|--group-avatar-image|preview-main-bg/);
  assert.doesNotMatch(androidThemeColors, /group-avatar|groupAvatar|--group-avatar-image|preview-main-bg/);
});

test("shopping preview image files are sequentially replaceable", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

  for (let index = 0; index < 4; index += 1) {
    assert.match(html, new RegExp(`data-shopping-image-index="${index}"`));
  }

  assert.match(css, /\.shop-thumb\s*\{[\s\S]*--shopping-preview-image/);
  assert.match(app, /const shoppingPreviewImages = \[/);

  for (let index = 1; index <= 4; index += 1) {
    const imagePath = `../assets/preview/shopping-images/shoppingImage_${String(index).padStart(2, "0")}.png`;
    const appImagePath = `./assets/preview/shopping-images/shoppingImage_${String(index).padStart(2, "0")}.png`;
    const imageStat = await stat(new URL(imagePath, import.meta.url));

    assert.equal(imageStat.isFile(), true);
    assert.match(app, new RegExp(escapeRegExp(appImagePath)));
  }

  assert.match(app, /applyShoppingPreviewImages\(\);/);
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

test("theme list uses one-line rows for basic, official, and user themes", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const previewStart = html.indexOf('class="preview-slide theme-list-preview"');
  const previewMarkup = html.slice(previewStart);
  const tabletThemeListCss = css.match(/\.phone-preview\.is-tablet \.theme-list-screen\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const headerEnd = previewMarkup.indexOf('class="theme-list-screen"');
  const headerMarkup = previewMarkup.slice(0, headerEnd);
  const basicIndex = previewMarkup.indexOf("<div class=\"section-title theme-basic-section\">기본</div>");
  const officialIndex = previewMarkup.indexOf("공식 테마");
  const officialRowIndex = previewMarkup.indexOf("<strong>공식 테마</strong>");
  const systemIndex = previewMarkup.indexOf("<strong>시스템 설정 모드</strong>");
  const userSectionIndex = previewMarkup.indexOf("사용자 테마");
  const activeIndex = previewMarkup.indexOf("data-preview-theme-name");
  const activeVersionIndex = previewMarkup.indexOf("data-preview-theme-version");
  const userThemeIndex = previewMarkup.indexOf("<strong>사용자테마</strong>");
  const officialSectionMarkup = previewMarkup.slice(officialIndex, userSectionIndex);
  const systemRowStart = previewMarkup.lastIndexOf('<div class="theme-list-row theme-mode-row">', systemIndex);
  const systemRowEnd = previewMarkup.indexOf('<div class="theme-list-row theme-mode-row">', systemIndex);
  const systemRowMarkup = previewMarkup.slice(systemRowStart, systemRowEnd);
  const selectedChoices = previewMarkup.match(/class="theme-choice selected"/g) ?? [];

  assert.ok(previewStart > -1);
  assert.doesNotMatch(headerMarkup, /내 테마/);
  assert.match(headerMarkup, />관리<\/button>/);
  assert.ok(basicIndex > -1);
  assert.ok(systemIndex > basicIndex);
  assert.ok(officialIndex > -1);
  assert.ok(officialIndex > systemIndex);
  assert.ok(officialRowIndex > officialIndex);
  assert.ok(userSectionIndex > officialIndex);
  assert.ok(userSectionIndex > officialRowIndex);
  assert.ok(activeIndex > userSectionIndex);
  assert.ok(activeVersionIndex > activeIndex);
  assert.ok(userThemeIndex > activeIndex);
  assert.equal(selectedChoices.length, 1);
  assert.doesNotMatch(systemRowMarkup, /class="theme-choice selected"/);
  assert.match(systemRowMarkup, /<strong>시스템 설정 모드<\/strong>[\s\S]*class="theme-choice" aria-hidden="true"/);
  assert.equal(officialSectionMarkup.match(/class="theme-list-row"/g)?.length, 1);
  assert.match(officialSectionMarkup, /class="theme-list-row"[\s\S]*<strong>공식 테마<\/strong>[\s\S]*class="theme-download"/);
  assert.doesNotMatch(officialSectionMarkup, /앱 아이콘 변경/);
  assert.doesNotMatch(officialSectionMarkup, /여름이야기/);
  assert.doesNotMatch(officialSectionMarkup, /비밀의 숲/);
  assert.match(previewMarkup, /class="theme-list-row active-theme-row"[\s\S]*data-preview-theme-name[\s\S]*data-preview-theme-version[\s\S]*class="theme-choice selected"/);
  assert.doesNotMatch(previewMarkup, /현재 편집 중/);
  assert.doesNotMatch(previewMarkup, /class="theme-list-card"/);
  assert.doesNotMatch(previewMarkup, /겨울이야기/);
  assert.match(css, /\.theme-list-row\s*\{[\s\S]*grid-template-columns: 58px minmax\(0, 1fr\) auto;/);
  assert.match(css, /\.theme-list-screen\s*\{[\s\S]*overflow-y: auto;/);
  assert.match(css, /\.phone-preview\.is-tablet \.theme-list-preview \.theme-basic-section,\s*\.phone-preview\.is-tablet \.theme-list-preview \.theme-mode-row\s*\{[\s\S]*display: none;/);
  assert.match(previewMarkup, /class="theme-preview-card chat-mode-preview light-mode-preview"[\s\S]*mode-preview-title[\s\S]*Chats[\s\S]*mode-avatar one[\s\S]*mode-line one[\s\S]*mode-alert/);
  assert.match(previewMarkup, /class="theme-preview-card chat-mode-preview dark-mode-preview"[\s\S]*mode-preview-title[\s\S]*Chats[\s\S]*mode-avatar three[\s\S]*mode-line three[\s\S]*mode-alert/);
  assert.match(css, /\.chat-mode-preview\s*\{[\s\S]*width: 48px;[\s\S]*height: 64px;/);
  assert.match(css, /\.mode-avatar\s*\{[\s\S]*border-radius: 4px;/);
  assert.match(css, /\.mode-avatar\.one\s*\{[\s\S]*top: 17px;[\s\S]*background: #8ad4e7;/);
  assert.match(css, /\.mode-avatar\.two\s*\{[\s\S]*top: 29px;[\s\S]*background: #7fb7e4;/);
  assert.match(css, /\.mode-avatar\.three\s*\{[\s\S]*top: 41px;[\s\S]*background: #91aee8;/);
  assert.match(css, /\.mode-line\.one\s*\{[\s\S]*top: 20px;/);
  assert.match(css, /\.mode-alert\s*\{[\s\S]*right: 7px;[\s\S]*top: 20px;[\s\S]*background: #e96b5f;/);
  assert.match(css, /\.dark-mode-preview \.mode-line\s*\{[\s\S]*background: #3a3a3a;/);
  assert.match(tabletThemeListCss, /display: block;/);
  assert.doesNotMatch(tabletThemeListCss, /grid-template-columns/);
});

test("preview includes an Android loading screen generated from the theme icon", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const model = await readFile(new URL("../src/theme-model.js", import.meta.url), "utf8");

  assert.match(html, /class="preview-slide splash-preview" aria-label="로딩화면 프리뷰"/);
  assert.match(html, /class="splash-screen"[\s\S]*class="splash-icon"/);
  assert.doesNotMatch(html, /class="splash-apply-button"/);
  assert.doesNotMatch(html, />적용하기<\/div>/);
  assert.match(css, /\.splash-screen\s*\{[\s\S]*background: var\(--preview-main-bg, #ffdddd\);/);
  assert.match(css, /\.splash-icon\s*\{[\s\S]*background: var\(--preview-theme-icon, none\) center \/ contain no-repeat;/);
  assert.equal(PREVIEW_CSS_IMAGE_VARIABLES["--preview-splash-image"], undefined);
  assert.equal(PREVIEW_CSS_IMAGE_VARIABLES["--preview-theme-icon"], 'url("./assets/template-images/ios/Images/commonIcoTheme.png")');
  assert.doesNotMatch(css, /\.splash-apply-button/);
  assert.match(app, /applyPreviewDefaultImages/);
  assert.match(app, /const androidSplashImageSizes = \{/);
  assert.match(app, /function createGeneratedSplashUpload\(\)/);
  assert.match(app, /function renderSplashImageToPngBytes/);
  assert.match(app, /const androidUploads = generatedSplashUpload \? \{ \.\.\.uploads, splashImage: generatedSplashUpload \} : uploads;/);
  assert.equal(PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY.splashImage, undefined);
  assert.deepEqual(PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY.themeIcon, ["--preview-theme-icon"]);
  assert.match(model, /label: "로딩 화면"/);
  assert.match(model, /"src\/main\/theme\/drawable-xxhdpi\/theme_splash_image\.png"/);
});

test("passcode preview follows the reference lock screen copy and keypad actions", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const passcodeStart = html.indexOf('class="preview-slide passcode-preview"');
  const themeListStart = html.indexOf('class="preview-slide theme-list-preview"');
  const passcodeMarkup = html.slice(passcodeStart, themeListStart);

  assert.match(passcodeMarkup, /<div class="passcode-intro">[\s\S]*<strong>암호입력<\/strong>[\s\S]*<span>암호를 입력해주세요<\/span>/);
  assert.match(passcodeMarkup, /data-passcode-action="reset"[^>]*>취소<\/button>/);
  assert.match(passcodeMarkup, /data-passcode-action="delete"[^>]*aria-label="뒤로"[^>]*>\s*뒤로\s*<\/button>/);
  assert.doesNotMatch(passcodeMarkup, /class="backspace-icon"/);
  assert.doesNotMatch(passcodeMarkup, />리셋<\/button>/);
  assert.doesNotMatch(passcodeMarkup, />지우기<\/button>/);
  assert.match(css, /\.passcode-screen\s*\{[\s\S]*grid-template-rows: minmax\(230px, 0\.76fr\) auto minmax\(0, 1fr\);/);
  assert.match(css, /\.passcode-intro\s*\{[\s\S]*gap: 14px;/);
  assert.match(css, /\.keypad\s*\{[\s\S]*grid-template-columns: repeat\(3, 64px\);/);
  assert.match(css, /\.keypad button\s*\{[\s\S]*background: transparent;/);
  assert.doesNotMatch(css, /\.backspace-icon/);
});

test("tablet passcode preview defines a landscape layout that fits the keypad", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.phone-preview\.is-tablet \.passcode-screen\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(css, /\.phone-preview\.is-tablet \.passcode-screen\s*\{[\s\S]*gap: 24px;/);
  assert.match(css, /\.phone-preview\.is-tablet \.passcode-screen\s*\{[\s\S]*padding: 32px;/);
  assert.match(css, /\.phone-preview\.is-tablet \.passcode-intro\s*\{[\s\S]*grid-column: 1;/);
  assert.match(css, /\.phone-preview\.is-tablet \.keypad\s*\{[\s\S]*grid-column: 2;/);
  assert.match(css, /\.phone-preview\.is-tablet \.keypad\s*\{[\s\S]*width: min\(100%, 260px\);/);
});

test("chat bubbles use 9-slice template images instead of stretching the full asset", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

  assert.match(css, /border-image-source: var\(--preview-send-image, none\);/);
  assert.match(css, /border-image-source: var\(--preview-receive-image, none\);/);
  assert.match(css, /border-image-source: var\(--preview-send-additional-image, none\);/);
  assert.match(css, /border-image-source: var\(--preview-receive-additional-image, none\);/);
  assert.equal(
    PREVIEW_CSS_IMAGE_VARIABLES["--preview-send-image"],
    'image-set(url("./assets/template-images/ios/Images/chatroomBubbleSend01@3x.png") 3x)',
  );
  assert.equal(
    PREVIEW_CSS_IMAGE_VARIABLES["--preview-receive-image"],
    'image-set(url("./assets/template-images/ios/Images/chatroomBubbleReceive01@3x.png") 3x)',
  );
  assert.equal(
    PREVIEW_CSS_IMAGE_VARIABLES["--preview-send-additional-image"],
    'image-set(url("./assets/template-images/ios/Images/chatroomBubbleSend02@3x.png") 3x)',
  );
  assert.equal(
    PREVIEW_CSS_IMAGE_VARIABLES["--preview-receive-additional-image"],
    'image-set(url("./assets/template-images/ios/Images/chatroomBubbleReceive02@3x.png") 3x)',
  );
  assert.match(css, /\.bubble\s*\{[\s\S]*--preview-bubble-slice: 17 17 17 17;[\s\S]*--preview-bubble-border-width: 10px;/);
  assert.match(css, /border-width: var\(--preview-bubble-border-width\);/);
  assert.doesNotMatch(css, /\.send-bubble\s*\{[\s\S]*--preview-bubble-border-width:/);
  assert.doesNotMatch(css, /\.receive-bubble\s*\{[\s\S]*--preview-bubble-border-width:/);
  assert.doesNotMatch(css, /\.receive-bubble\s*\{[\s\S]*--preview-bubble-slice:/);
  assert.match(css, /border-image-slice: var\(--preview-bubble-slice\) fill;/);
  assert.match(css, /border-image-repeat: stretch;/);
  assert.doesNotMatch(css, /background:[\s\S]*--preview-send-image[\s\S]*100% 100% no-repeat/);
  assert.match(app, /function appendUploadLabel/);
  assert.match(app, /formatUploadSizeLines\(target\)/);
  assert.match(app, /"--preview-send-additional-image": \["sendBubbleTailless"\]/);
  assert.match(app, /"--preview-receive-additional-image": \["receiveBubbleTailless"\]/);
  assert.doesNotMatch(css, /border-bottom-(?:right|left)-radius:\s*6px/);
});

test("bubble uploads preview the same generated iOS variant used for downloads", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

  assert.match(app, /function createPreviewUrlFromBytes/);
  assert.match(app, /function setPreviewBubbleImage/);
  assert.match(app, /image-set\(url\("\$\{url\}"\) \$\{target\.previewScale\}x\)/);
  assert.match(app, /IMAGE_TARGETS\[key\]\?\.previewIos \?\? IMAGE_TARGETS\[key\]\?\.ios\?\.\[0\]/);
});

test("tab icon uploads use a 3x source and generate 2x plus 3x outputs", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const model = await readFile(new URL("../src/theme-model.js", import.meta.url), "utf8");

  assert.match(app, /const tabIconUploadKeys = new Set\(TAB_ICON_IMAGE_KEYS\);/);
  assert.match(app, /shouldGenerateUploadVariants\(key\)/);
  assert.match(app, /tabIconUploadKeys\.has\(key\)/);
  assert.match(app, /"Images\/maintabIcoNow@2x\.png": \[76, 76\]/);
  assert.match(app, /"Images\/maintabIcoNow@3x\.png": \[114, 114\]/);
  assert.match(app, /"Images\/maintabIcoCall@2x\.png": \[76, 76\]/);
  assert.match(app, /"Images\/maintabIcoPiccoma@3x\.png": \[114, 114\]/);
  assert.match(app, /createUploadRecord\(key, file, bytes, file\.type\)/);
  assert.match(app, /createUploadImageVariants\(key, image, \{ tintColor, splashBackgroundColor \}\)/);
  assert.match(model, /previewIos: ios3x/);
  assert.match(model, /displaySize: \[114, 114\]/);
});

test("upload panel hides unsupported additional Android structure inputs", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const previewPages = await readFile(new URL("../src/preview-pages.js", import.meta.url), "utf8");
  const model = await readFile(new URL("../src/theme-model.js", import.meta.url), "utf8");

  assert.match(app, /const hiddenUploadKeys = new Set\(\[[\s\S]*"addFriendButton"[\s\S]*"addFriendButtonPressed"[\s\S]*"profileFullImage"[\s\S]*\]\);/);
  assert.match(app, /const visibleAdditionalImageKeys = ADDITIONAL_IMAGE_KEYS\.filter\(\(key\) => !hiddenUploadKeys\.has\(key\)\);/);
  assert.match(app, /\.\.\.visibleAdditionalImageKeys/);
  assert.doesNotMatch(app, /const uploadKeys = \[[\s\S]*\.\.\.ADDITIONAL_IMAGE_KEYS/);
  assert.match(previewPages, /\.\.\.ADDITIONAL_IMAGE_KEYS\.filter\(\(key\) => key\.startsWith\("themeIcon"\)\)/);
  assert.match(model, /label: "친구 추가 버튼 - 기본"/);
  assert.match(model, /label: "기본 프로필 전체 이미지"/);
  assert.match(model, /label: "Android 런처 전경"/);
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
