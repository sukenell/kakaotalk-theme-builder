import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_BUBBLE_CONTENT_INSET_PX,
  DEFAULT_NINE_PATCH_PADDING,
  MINIMUM_NINE_PATCH_CONTENT_SIZE,
  NINE_PATCH_REFERENCE_SIZE,
  getNinePatchReferenceSizeForSource,
  getScaledNinePatchContentInsets,
  rebaseNinePatchSettingsForReferenceSize,
  updateNinePatchPair,
} from "../src/nine-patch-controls.js";

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

test("nine-patch content insets match downloaded bubble padding scale", () => {
  assert.equal(DEFAULT_BUBBLE_CONTENT_INSET_PX, 10);
  assert.deepEqual(getScaledNinePatchContentInsets({ paddingX: [41, 81], paddingY: [38, 75] }), {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
  });
  assert.deepEqual(getScaledNinePatchContentInsets({ paddingX: [21, 101], paddingY: [11, 91] }), {
    top: 3,
    right: 5,
    bottom: 6,
    left: 5,
  });
});

test("larger bubble images expand guides outward without shrinking the base layout", () => {
  assert.deepEqual(getNinePatchReferenceSizeForSource({ width: 120, height: 105 }), NINE_PATCH_REFERENCE_SIZE);
  assert.deepEqual(getNinePatchReferenceSizeForSource({ width: 180, height: 150 }), {
    width: 182,
    height: 152,
  });

  const expanded = rebaseNinePatchSettingsForReferenceSize(
    {
      stretchX: DEFAULT_NINE_PATCH_PADDING.paddingX,
      stretchY: DEFAULT_NINE_PATCH_PADDING.paddingY,
      paddingX: DEFAULT_NINE_PATCH_PADDING.paddingX,
      paddingY: DEFAULT_NINE_PATCH_PADDING.paddingY,
      referenceSize: NINE_PATCH_REFERENCE_SIZE,
    },
    { width: 182, height: 152 },
  );

  assert.deepEqual(expanded.paddingX, [70, 110]);
  assert.deepEqual(expanded.paddingY, [57, 94]);
  assert.equal(expanded.paddingX[1] - expanded.paddingX[0], 40);
  assert.equal(expanded.paddingY[1] - expanded.paddingY[0], 37);
  assert.deepEqual(getScaledNinePatchContentInsets(expanded), {
    top: 15,
    right: 17,
    bottom: 15,
    left: 17,
  });
});
