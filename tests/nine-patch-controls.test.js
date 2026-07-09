import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_BUBBLE_CONTENT_INSET_PX,
  DEFAULT_NINE_PATCH_PADDING,
  MAX_NINE_PATCH_GUIDE_POSITION,
  MINIMUM_NINE_PATCH_CONTENT_SIZE,
  NINE_PATCH_REFERENCE_SIZE,
  getNinePatchAxisControlMax,
  getNinePatchReferenceSizeForSource,
  getNinePatchReferenceSizeForMarkers,
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

test("nine-patch stretch pairs keep the default range and can only expand outward", () => {
  assert.deepEqual(
    updateNinePatchPair([41, 81], 0, 80, {
      max: 122,
      containPair: DEFAULT_NINE_PATCH_PADDING.paddingX,
    }),
    [41, 81],
  );
  assert.deepEqual(
    updateNinePatchPair([41, 81], 1, 50, {
      max: 122,
      containPair: DEFAULT_NINE_PATCH_PADDING.paddingX,
    }),
    [41, 81],
  );
  assert.deepEqual(
    updateNinePatchPair([41, 81], 0, 20, {
      max: 122,
      containPair: DEFAULT_NINE_PATCH_PADDING.paddingX,
    }),
    [20, 81],
  );
  assert.deepEqual(
    updateNinePatchPair([41, 81], 1, 100, {
      max: 122,
      containPair: DEFAULT_NINE_PATCH_PADDING.paddingX,
    }),
    [41, 100],
  );
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

  assert.deepEqual(expanded.stretchX, DEFAULT_NINE_PATCH_PADDING.paddingX);
  assert.deepEqual(expanded.stretchY, DEFAULT_NINE_PATCH_PADDING.paddingY);
  assert.deepEqual(expanded.paddingX, DEFAULT_NINE_PATCH_PADDING.paddingX);
  assert.deepEqual(expanded.paddingY, DEFAULT_NINE_PATCH_PADDING.paddingY);
  assert.equal(expanded.paddingX[1] - expanded.paddingX[0], 40);
  assert.equal(expanded.paddingY[1] - expanded.paddingY[0], 37);
  assert.deepEqual(getScaledNinePatchContentInsets(expanded), {
    top: 10,
    right: 24,
    bottom: 20,
    left: 10,
  });
});

test("nine-patch content pairs can expand past four times the default span for large images", () => {
  const referenceSize = getNinePatchReferenceSizeForSource({ width: 520, height: 450 });
  assert.deepEqual(referenceSize, { width: 522, height: 452 });

  const paddingX = updateNinePatchPair(DEFAULT_NINE_PATCH_PADDING.paddingX, 1, 201, {
    max: referenceSize.width - 2,
    minSpan: MINIMUM_NINE_PATCH_CONTENT_SIZE.x,
  });
  const paddingY = updateNinePatchPair(DEFAULT_NINE_PATCH_PADDING.paddingY, 1, 186, {
    max: referenceSize.height - 2,
    minSpan: MINIMUM_NINE_PATCH_CONTENT_SIZE.y,
  });

  assert.equal(paddingX[1] - paddingX[0], 160);
  assert.equal(paddingY[1] - paddingY[0], 148);
});

test("nine-patch controls expose a 300px maximum for default-size bubbles", () => {
  assert.equal(MAX_NINE_PATCH_GUIDE_POSITION, 300);
  assert.equal(getNinePatchAxisControlMax("x", NINE_PATCH_REFERENCE_SIZE), 300);
  assert.equal(getNinePatchAxisControlMax("y", NINE_PATCH_REFERENCE_SIZE), 300);

  const largeReference = getNinePatchReferenceSizeForSource({ width: 520, height: 450 });
  assert.equal(getNinePatchAxisControlMax("x", largeReference), 520);
  assert.equal(getNinePatchAxisControlMax("y", largeReference), 450);
});

test("nine-patch reference size expands to contain guide values up to the control maximum", () => {
  const layout = {
    stretchX: [41, 300],
    stretchY: [38, 75],
    paddingX: [41, 300],
    paddingY: [38, 75],
    referenceSize: NINE_PATCH_REFERENCE_SIZE,
  };

  assert.deepEqual(getNinePatchReferenceSizeForMarkers(layout), {
    width: 302,
    height: 114,
  });

  const rebased = rebaseNinePatchSettingsForReferenceSize(layout, NINE_PATCH_REFERENCE_SIZE);
  assert.deepEqual(rebased.stretchX, [41, 300]);
  assert.deepEqual(rebased.paddingX, [41, 300]);
  assert.deepEqual(rebased.referenceSize, {
    width: 302,
    height: 114,
  });
});
