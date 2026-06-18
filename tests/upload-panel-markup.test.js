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

  assert.match(html, /id="app-name"[^>]+value="마이 테마"/);
  assert.doesNotMatch(html, />com\.<\/span>/);
  assert.doesNotMatch(html, />\.kakaotalk\.theme<\/span>/);
  assert.match(html, /<button id="download-ios"[^>]*>IOS<\/button>/);
  assert.match(html, /<button id="download-android"[^>]*>Android<\/button>/);
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
