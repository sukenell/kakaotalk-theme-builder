import assert from "node:assert/strict";
import test from "node:test";

import { normalizeTintColor, tintImageDataPixels } from "../src/image-tint.js";

test("tintImageDataPixels recolors visible pixels while preserving alpha", () => {
  const imageData = {
    data: new Uint8ClampedArray([
      10, 20, 30, 0,
      40, 50, 60, 128,
      70, 80, 90, 255,
    ]),
  };

  tintImageDataPixels(imageData, "#336699");

  assert.deepEqual(Array.from(imageData.data), [
    10, 20, 30, 0,
    51, 102, 153, 128,
    51, 102, 153, 255,
  ]);
});

test("normalizeTintColor accepts browser color values and rejects invalid tint colors", () => {
  assert.equal(normalizeTintColor("#aabbcc"), "#AABBCC");
  assert.equal(normalizeTintColor("#ABC"), "#AABBCC");
  assert.equal(normalizeTintColor("not-a-color"), "");
  assert.equal(normalizeTintColor(""), "");
});
