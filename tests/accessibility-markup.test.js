import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

function openingTag(tagName, id) {
  return html.match(new RegExp(`<${tagName}\\b[^>]*\\bid="${id}"[^>]*>`))?.[0] ?? "";
}

function sectionOpeningTag(className) {
  return html.match(new RegExp(`<section\\b[^>]*\\bclass="[^"]*\\b${className}\\b[^"]*"[^>]*>`))?.[0] ?? "";
}

function labelMarkup(controlId) {
  return html.match(new RegExp(`<label\\b[^>]*\\bfor="${controlId}"[^>]*>[\\s\\S]*?<\\/label>`))?.[0] ?? "";
}

test("page has one named h1 and named settings, upload, and preview regions", () => {
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<h1\b[^>]*class="visually-hidden"[^>]*>\s*카톡 테마 만들기 by reha\s*<\/h1>/);

  for (const [className, headingId, headingText] of [
    ["settings-panel", "settings-heading", "테마 설정"],
    ["upload-panel", "upload-heading", "이미지 업로드"],
    ["preview-panel", "preview-heading", "테마 미리보기"],
  ]) {
    const section = sectionOpeningTag(className);

    assert.match(section, new RegExp(`aria-labelledby="${headingId}"`));
    assert.doesNotMatch(section, /aria-label=/);
    assert.match(
      html,
      new RegExp(`<h2\\b[^>]*\\bid="${headingId}"[^>]*\\bclass="visually-hidden"[^>]*>\\s*${headingText}\\s*<\\/h2>`),
    );
  }
});

test("visually hidden headings are removed from the app grid without leaving the accessibility tree", () => {
  const rule = css.match(/\.visually-hidden\s*\{[\s\S]*?\}/)?.[0] ?? "";

  assert.match(rule, /position:\s*absolute(?:\s*!important)?;/);
  assert.match(rule, /width:\s*1px;/);
  assert.match(rule, /height:\s*1px;/);
  assert.match(rule, /overflow:\s*hidden;/);
  assert.match(rule, /clip(?:-path)?:/);
  assert.match(rule, /white-space:\s*nowrap;/);
});

test("theme information fieldset has a real legend and visible required guidance", () => {
  assert.match(
    html,
    /<fieldset\b[^>]*class="field-group"[^>]*>\s*<legend>테마 정보<\/legend>/,
  );
  assert.match(html, /class="required-guidance"[^>]*>[\s\S]*필수 입력 항목[\s\S]*<\/p>/);
});

test("theme id, author, and version use concise explicit labels", () => {
  for (const [controlId, labelText] of [
    ["theme-id-segment", "테마 ID"],
    ["additional-author-name", "제작자"],
    ["version", "버전"],
  ]) {
    const label = labelMarkup(controlId);

    assert.ok(label, `${controlId} has an explicit label`);
    assert.match(label, new RegExp(`>${labelText}(?:\\s*<[^>]+>[^<]*<\\/[^>]+>)?\\s*<\\/label>$`));
    assert.doesNotMatch(label, /<(?:input|p)\b/);
  }
});

test("required theme id and version fields reference persistent help and hidden errors", () => {
  const themeId = openingTag("input", "theme-id-segment");
  const version = openingTag("input", "version");

  assert.match(themeId, /\brequired(?:="")?(?:\s|>)/);
  assert.match(themeId, /\bpattern="\[A-Za-z\]\+"/);
  assert.match(themeId, /\baria-describedby="theme-id-help theme-id-error"/);
  assert.match(html, /<p\b[^>]*\bid="theme-id-help"[^>]*\bclass="field-help"[^>]*>[^<]+<\/p>/);
  assert.match(html, /<p\b[^>]*\bid="theme-id-error"[^>]*\bclass="field-error"[^>]*\bhidden[^>]*>[^<]+<\/p>/);

  assert.match(version, /\brequired(?:="")?(?:\s|>)/);
  assert.match(version, /\baria-describedby="version-help version-error"/);
  assert.match(html, /<p\b[^>]*\bid="version-help"[^>]*\bclass="field-help"[^>]*>[^<]+<\/p>/);
  assert.match(html, /<p\b[^>]*\bid="version-error"[^>]*\bclass="field-error"[^>]*\bhidden[^>]*>[^<]+<\/p>/);
});

test("language and download names expose their intended meaning", () => {
  assert.match(html, /<span\b[^>]*\blang="lzh"[^>]*>舍利子 色不異空 空不異色 色卽是空 空卽是色 受想行識 亦復如是<\/span>/);
  assert.match(html, /<button\b[^>]*\bid="download-ios"[^>]*\baria-label="iOS 테마 다운로드"[^>]*>IOS<\/button>/);
  assert.match(html, /<button\b[^>]*\bid="download-android"[^>]*\baria-label="Android 소스 다운로드"[^>]*>Android<\/button>/);
});
