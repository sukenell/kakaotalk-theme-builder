import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("upload panel starts with the original image download link", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const linkIndex = html.indexOf('id="original-image-download"');
  const uploadControlsIndex = html.indexOf('id="upload-controls"');

  assert.ok(linkIndex > -1);
  assert.ok(linkIndex < uploadControlsIndex);
  assert.match(
    html,
    /<a[^>]+id="original-image-download"[^>]+href="https:\/\/cs\.kakao\.com\/helps_html\/1073209428"[^>]*>\s*원본 이미지 다운로드\s*<\/a>/,
  );
});

test("theme mode controls are not shown because generated themes use one palette", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.equal(html.includes("data-theme-style"), false);
  assert.equal(html.includes("테마 모드"), false);
});
