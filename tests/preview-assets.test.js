import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PREVIEW_IMAGE_FOLDERS } from "../src/preview-assets.js";

test("preview default image paths are centralized outside stylesheet fallbacks", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

  assert.doesNotMatch(css, /assets\/templates\/(?:ios|android-source)\/[^")]+\.png/);
  assert.match(app, /from "\.\/preview-assets\.js"/);
});

test("preview default images are sourced from the replacement image root", () => {
  assert.deepEqual(PREVIEW_IMAGE_FOLDERS, {
    iosImages: "assets/template-images/ios/Images",
    androidDrawableXxhdpi: "assets/template-images/android-source/src/main/theme/drawable-xxhdpi",
  });
});
