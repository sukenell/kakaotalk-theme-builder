import assert from "node:assert/strict";
import test from "node:test";

import { MINIMUM_NINE_PATCH_CONTENT_SIZE, updateNinePatchPair } from "../src/nine-patch-controls.js";

test("nine-patch padding pairs keep a readable content width", () => {
  assert.equal(MINIMUM_NINE_PATCH_CONTENT_SIZE.x, 40);

  assert.deepEqual(
    updateNinePatchPair([41, 81], 0, 80, {
      max: 122,
      minSpan: MINIMUM_NINE_PATCH_CONTENT_SIZE.x,
    }),
    [80, 120],
  );
  assert.deepEqual(
    updateNinePatchPair([41, 81], 0, 120, {
      max: 122,
      minSpan: MINIMUM_NINE_PATCH_CONTENT_SIZE.x,
    }),
    [82, 122],
  );
  assert.deepEqual(
    updateNinePatchPair([41, 81], 1, 10, {
      max: 122,
      minSpan: MINIMUM_NINE_PATCH_CONTENT_SIZE.x,
    }),
    [1, 41],
  );
});

test("nine-patch padding pairs keep a one-line content height", () => {
  assert.equal(MINIMUM_NINE_PATCH_CONTENT_SIZE.y, 18);

  assert.deepEqual(
    updateNinePatchPair([38, 75], 1, 42, {
      max: 112,
      minSpan: MINIMUM_NINE_PATCH_CONTENT_SIZE.y,
    }),
    [24, 42],
  );
});

test("nine-patch stretch pairs can still collapse to a single guide", () => {
  assert.deepEqual(updateNinePatchPair([20, 80], 0, 90, { max: 122 }), [90, 90]);
});
