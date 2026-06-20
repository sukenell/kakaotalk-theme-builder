import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PREVIEW_CSS_IMAGE_VARIABLES, PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY } from "../src/preview-assets.js";

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

  assert.match(html, /data-preview-device="phone"/);
  assert.match(html, /data-preview-device="tablet"/);
  assert.match(html, /본 사이트는 \[카카오톡\]과 관련이 없는 비공식 테마 제작 도구입니다\./);
  assert.match(html, /id="preview-previous"[\s\S]*<span class="arrow-icon arrow-left" aria-hidden="true"><\/span>[\s\S]*id="preview-next"[\s\S]*<span class="arrow-icon arrow-right" aria-hidden="true"><\/span>/);
  assert.doesNotMatch(html, /id="preview-previous"[^>]*>‹<\/button>/);
  assert.doesNotMatch(html, /id="preview-next"[^>]*>›<\/button>/);
  assert.match(css, /\.arrow-icon\s*\{[\s\S]*mask: url\("data:image\/svg\+xml,/);
  assert.doesNotMatch(css, /\.preview-arrow::before/);
  assert.doesNotMatch(css, /\.preview-arrow::after/);

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

test("chat preview includes default profile and extra basic/additional bubble samples", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const chatStart = html.indexOf('class="preview-slide chat-preview"');
  const passcodeStart = html.indexOf('class="preview-slide passcode-preview"');
  const chatMarkup = html.slice(chatStart, passcodeStart);

  assert.match(chatMarkup, /class="message-group receive"[\s\S]*<div class="avatar default-profile"><\/div>[\s\S]*<span class="sender">친구<\/span>[\s\S]*<p class="bubble receive-bubble short">좋아\.<\/p>[\s\S]*<p class="bubble receive-bubble additional-bubble">/);
  assert.match(chatMarkup, /class="message-group send"[\s\S]*<p class="bubble send-bubble">기본 말풍선\.<\/p>[\s\S]*<p class="bubble send-bubble additional-bubble">추가 말풍선\.<\/p>/);
  assert.match(chatMarkup, /<time class="message-time" data-preview-time>00:00<\/time>/);
  assert.match(css, /\.message-group\.receive\s*\{[\s\S]*align-items: start;/);
  assert.match(css, /\.message-stack\s*\{[\s\S]*align-items: flex-start;/);
  assert.match(css, /\.sender\s*\{[^}]*margin: 3px 0 4px 2px;/);
  assert.match(css, /\.message-group\.send \.message-stack\s*\{[\s\S]*align-items: flex-end;/);
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

  assert.match(app, /const clearableBackgroundImageKeys = new Set\(\[[\s\S]*"mainBackground"[\s\S]*"chatBackground"[\s\S]*"passcodeBackgroundImage"/);
  assert.match(app, /clearButton\.dataset\.uploadClear = key;/);
  assert.match(app, /clearButton\.textContent = "삭제";/);
  assert.match(app, /uploads\[key\] = \{ cleared: true \};/);
  assert.match(app, /documentRoot\.style\.setProperty\(variableName, "none"\);/);
});

test("friends preview follows the reference friends layout", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const previewStart = html.indexOf('class="preview-slide home-preview"');
  const headerStart = html.indexOf('class="phone-header main-header"');
  const screenStart = html.indexOf('class="main-screen"');
  const bottomTabsStart = html.indexOf('class="bottom-tabs"');
  const headerMarkup = html.slice(headerStart, screenStart);
  const screenMarkup = html.slice(screenStart, bottomTabsStart);
  const segmentIndex = screenMarkup.indexOf('class="friend-segment-tabs"');
  const bannerIndex = screenMarkup.indexOf('class="friends-promo-card"');
  const updatedIndex = screenMarkup.indexOf('class="updated-friends-section"');
  const favoriteIndex = screenMarkup.indexOf('class="favorite-friends-section"');
  const allFriendsIndex = screenMarkup.indexOf('class="all-friends-section"');

  assert.ok(previewStart > -1);
  assert.ok(headerStart > -1);
  assert.ok(screenStart > headerStart);
  assert.match(headerMarkup, /class="home-owner-title"[\s\S]*<div class="avatar header-avatar"><\/div>[\s\S]*<strong>나<\/strong>/);
  assert.doesNotMatch(headerMarkup, /<strong>친구<\/strong>/);
  for (const label of ["검색", "친구 추가", "음악", "설정"]) {
    assert.match(headerMarkup, new RegExp(`aria-label="${label}"`));
  }
  assert.ok(segmentIndex > -1);
  assert.ok(bannerIndex > segmentIndex);
  assert.ok(updatedIndex > bannerIndex);
  assert.ok(favoriteIndex > updatedIndex);
  assert.match(screenMarkup, /class="friend-segment is-active"[^>]*>친구<\/button>/);
  assert.match(screenMarkup, /class="friend-segment"[^>]*>소식<\/button>/);
  assert.match(screenMarkup, /class="friends-promo-card"[\s\S]*새로운 친구 이야기를 확인해 보세요/);
  assert.match(screenMarkup, /class="updated-friends-section"[\s\S]*업데이트한 친구 1[\s\S]*<strong>고양이<\/strong>/);
  assert.doesNotMatch(screenMarkup, /소식 만들기/);
  assert.doesNotMatch(screenMarkup, /create-story-button/);
  assert.match(screenMarkup, /class="favorite-friends-section"[\s\S]*즐겨찾는 친구 6/);
  assert.ok(allFriendsIndex > favoriteIndex);
  assert.match(screenMarkup, /class="all-friends-section"[\s\S]*친구 999/);
  for (const name of [
    "요정하우",
    "여왕이 친구",
    "위대한 못 고양이",
    "힘힘이 친구",
    "고독이 친구",
    "행복자 친구",
    "토끼 친구",
    "구름 친구",
    "민트 친구",
  ]) {
    assert.match(screenMarkup, new RegExp(`<strong>${name}<\\/strong>`));
  }
  for (const status of [
    "오늘도 좋은 하루",
    "반짝이는 오후",
    "잠시 쉬어가는 중",
    "새로운 소식 업데이트",
    "조용한 하루",
    "행복 수집 중",
    "산책 다녀오는 중",
    "커피 한 잔의 여유",
    "답장은 천천히",
  ]) {
    assert.match(screenMarkup, new RegExp(`<span>${status}<\\/span>`));
  }
  assert.doesNotMatch(screenMarkup, />카카오톡 친구<\/span>/);
  assert.doesNotMatch(screenMarkup, /펑/);
  assert.doesNotMatch(screenMarkup, /생일인 친구/);
  assert.doesNotMatch(screenMarkup, /추천친구/);
  assert.doesNotMatch(screenMarkup, /채널/);
  assert.match(css, /\.main-header \.home-owner-title strong\s*\{[^}]*font-size: 18px;/);
  assert.match(css, /\.friend-header-actions\s*\{[\s\S]*grid-template-columns: repeat\(4, 28px\);[\s\S]*gap: 12px;/);
  assert.match(css, /\.main-screen\s*\{[\s\S]*overflow-y: auto;[\s\S]*padding: 0 16px 12px;/);
  assert.match(css, /\.friend-segment\.is-active\s*\{[\s\S]*background: var\(--preview-selected-bg, #ffb3b3\);[\s\S]*color: var\(--preview-selected-text, #b06b6b\);/);
  assert.match(css, /\.avatar\.header-avatar\s*\{[\s\S]*width: 34px;[\s\S]*height: 34px;/);
  assert.match(css, /\.friends-promo-card\s*\{[\s\S]*background: rgba\(255, 255, 255, 0\.94\);/);
  assert.match(css, /\.friends-promo-card\s*\{[\s\S]*min-height: 78px;/);
  assert.match(css, /\.favorite-profile-row\s*\{[\s\S]*grid-template-columns: 50px minmax\(0, 1fr\);/);
  assert.match(css, /\.favorite-profile-row \.avatar\s*\{[\s\S]*width: 44px;[\s\S]*height: 44px;/);
  assert.match(app, /\["bodyPressed", "선택 배경"\]/);
  assert.match(app, /\["titlePressed", "선택 텍스트"\]/);
  assert.match(app, /documentRoot\.style\.setProperty\("--preview-selected-bg", colors\.bodyPressed\);/);
  assert.match(app, /documentRoot\.style\.setProperty\("--preview-selected-text", colors\.titlePressed\);/);
});

test("friends and chat list headers use Flaticon image icons", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  for (const [className, url] of [
    ["search-action", "https://cdn-icons-png.flaticon.com/512/622/622669.png"],
    ["add-action", "https://cdn-icons-png.flaticon.com/512/748/748137.png"],
    ["music-action", "https://cdn-icons-png.flaticon.com/512/727/727245.png"],
    ["settings-action", "https://cdn-icons-png.flaticon.com/512/484/484613.png"],
    ["chat-compose-icon", "https://cdn-icons-png.flaticon.com/512/1159/1159633.png"],
  ]) {
    assert.match(css, new RegExp(`\\.${className}\\s*\\{[\\s\\S]*background-image: url\\("${url.replaceAll("/", "\\/")}"\\);`));
  }

  assert.match(css, /\.friend-header-actions button\s*\{[\s\S]*width: 28px;[\s\S]*height: 28px;/);
  assert.match(css, /\.friend-action-icon,\s*\.chat-compose-icon\s*\{[\s\S]*width: 20px;[\s\S]*height: 20px;/);
  assert.match(css, /\.chat-list-header > strong\s*\{[^}]*font-size: 18px;/);
  assert.match(css, /\.main-header \.friend-header-actions\s*\{[\s\S]*grid-template-columns: repeat\(4, 28px\);[\s\S]*gap: 12px;/);
  assert.match(css, /\.chat-list-actions\s*\{[\s\S]*grid-template-columns: repeat\(3, 28px\);[\s\S]*gap: 12px;/);
  assert.match(css, /\.phone-header \.chat-list-actions\s*\{[\s\S]*grid-template-columns: repeat\(3, 28px\);[\s\S]*gap: 12px;/);
  assert.match(css, /\.chat-list-actions button\s*\{[\s\S]*width: 28px;[\s\S]*height: 28px;/);
  assert.doesNotMatch(css, /\.search-action::before/);
  assert.doesNotMatch(css, /\.search-action::after/);
  assert.doesNotMatch(css, /\.add-action::before/);
  assert.doesNotMatch(css, /\.music-action::before/);
  assert.doesNotMatch(css, /\.settings-action::before/);
  assert.doesNotMatch(css, /\.chat-compose-icon::before/);
  assert.doesNotMatch(css, /\.chat-compose-icon::after/);
});

test("bottom tab preview removes text labels and uses the template icon display size", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const bottomTabsStart = html.indexOf('class="bottom-tabs"');
  const homeEnd = html.indexOf("</article>", bottomTabsStart);
  const bottomTabsMarkup = html.slice(bottomTabsStart, homeEnd);

  assert.match(bottomTabsMarkup, /aria-label="친구"/);
  assert.match(bottomTabsMarkup, /aria-label="대화"/);
  assert.match(bottomTabsMarkup, /aria-label="오픈채팅"/);
  assert.match(bottomTabsMarkup, /aria-label="쇼핑"/);
  assert.match(bottomTabsMarkup, /aria-label="더보기"/);
  for (const label of ["친구", "대화", "오픈채팅", "쇼핑", "더보기"]) {
    assert.doesNotMatch(bottomTabsMarkup, new RegExp(`>${label}<\\/span>`));
  }
  assert.match(bottomTabsMarkup, /class="tab-friends is-selected"/);
  assert.match(css, /\.tab-icon\s*\{[\s\S]*width: 38px;[\s\S]*height: 38px;/);
  assert.match(app, /PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY/);
  assert.deepEqual(PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY.tabFriendIcon, ["--preview-tab-friends-icon"]);
  assert.deepEqual(PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY.tabFriendIconSelected, ["--preview-tab-friends-icon-selected"]);
  assert.notDeepEqual(PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY.tabFriendIcon, [
    "--preview-tab-friends-icon",
    "--preview-tab-friends-icon-selected",
  ]);
});

test("preview includes a chat list screen before the chat room", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const chatListStart = html.indexOf('class="preview-slide chat-list-preview"');
  const chatStart = html.indexOf('class="preview-slide chat-preview"');
  const chatListMarkup = html.slice(chatListStart, chatStart);
  const tabletChatListCss = css.match(/\.phone-preview\.is-tablet \.chat-list-screen\s*\{[\s\S]*?\}/)?.[0] ?? "";

  assert.ok(chatListStart > -1);
  assert.ok(chatStart > chatListStart);
  assert.match(chatListMarkup, /aria-label="대화 목록 프리뷰"/);
  assert.match(chatListMarkup, /class="phone-header chat-list-header"[\s\S]*<strong>대화<\/strong>/);
  assert.match(chatListMarkup, /class="chat-list-row"[\s\S]*data-preview-time/);
  assert.match(chatListMarkup, /class="tab-chat is-selected"/);
  assert.doesNotMatch(chatListMarkup, /class="tab-friends is-selected"/);
  assert.match(css, /\.chat-list-preview\s*\{[\s\S]*grid-template-rows: 30px 68px 1fr 68px;/);
  assert.match(css, /\.chat-list-row\s*\{[\s\S]*grid-template-columns: 48px minmax\(0, 1fr\) auto;/);
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
  assert.doesNotMatch(openChatMarkup, /지금 뜨는 오픈채팅/);
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
  assert.match(moreMarkup, /class="more-ad-card"[\s\S]*메이플 키우기[\s\S]*다운로드/);
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

test("preview includes an Android loading screen from the source splash layout", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const model = await readFile(new URL("../src/theme-model.js", import.meta.url), "utf8");

  assert.match(html, /class="preview-slide splash-preview" aria-label="로딩화면 프리뷰"/);
  assert.doesNotMatch(html, /class="splash-apply-button"/);
  assert.doesNotMatch(html, />적용하기<\/div>/);
  assert.match(css, /--preview-splash-image, none/);
  assert.equal(
    PREVIEW_CSS_IMAGE_VARIABLES["--preview-splash-image"],
    'url("./assets/template-images/android-source/src/main/theme/drawable-xxhdpi/theme_splash_image.png")',
  );
  assert.match(css, /\.splash-screen\s*\{[\s\S]*background:[\s\S]*center \/ cover no-repeat/);
  assert.doesNotMatch(css, /\.splash-apply-button/);
  assert.match(app, /applyPreviewDefaultImages/);
  assert.deepEqual(PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY.splashImage, ["--preview-splash-image"]);
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
  assert.match(app, /function formatUploadLabel/);
  assert.match(app, /\$\{target\.label\}\(\$\{width\}px x \$\{height\}px\)/);
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
  assert.match(app, /createUploadImageVariants\(key, file\)/);
  assert.match(model, /previewIos: ios3x/);
  assert.match(model, /displaySize: \[114, 114\]/);
});

test("upload panel includes additional Android structure inputs", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const previewPages = await readFile(new URL("../src/preview-pages.js", import.meta.url), "utf8");
  const model = await readFile(new URL("../src/theme-model.js", import.meta.url), "utf8");

  assert.match(app, /\.\.\.ADDITIONAL_IMAGE_KEYS/);
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
