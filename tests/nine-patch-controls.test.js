import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_BUBBLE_CONTENT_INSET_PX,
  DEFAULT_NINE_PATCH_PADDING,
  MAX_NINE_PATCH_GUIDE_POSITION,
  MINIMUM_NINE_PATCH_CONTENT_SIZE,
  NINE_PATCH_REFERENCE_SIZE,
  getDefaultNinePatchMarkersForReferenceSize,
  getNinePatchAxisControlMax,
  getNinePatchContentReferenceSizeForMarkers,
  getNinePatchReferenceSizeForSource,
  getNinePatchReferenceSizeForMarkers,
  getScaledNinePatchContentInsets,
  rebaseNinePatchSettingsForReferenceSize,
  updateNinePatchPair,
} from "../src/nine-patch-controls.js";

test("nine-patch padding pairs keep the default content width and can only expand outward", () => {
  assert.equal(MINIMUM_NINE_PATCH_CONTENT_SIZE.x, 40);

  assert.deepEqual(
    updateNinePatchPair([41, 81], 0, 80, {
      max: 122,
      minSpan: MINIMUM_NINE_PATCH_CONTENT_SIZE.x,
      containPair: DEFAULT_NINE_PATCH_PADDING.paddingX,
    }),
    [41, 81],
  );
  assert.deepEqual(
    updateNinePatchPair([41, 81], 0, 20, {
      max: 122,
      minSpan: MINIMUM_NINE_PATCH_CONTENT_SIZE.x,
      containPair: DEFAULT_NINE_PATCH_PADDING.paddingX,
    }),
    [20, 81],
  );
  assert.deepEqual(
    updateNinePatchPair([41, 81], 1, 10, {
      max: 122,
      minSpan: MINIMUM_NINE_PATCH_CONTENT_SIZE.x,
      containPair: DEFAULT_NINE_PATCH_PADDING.paddingX,
    }),
    [41, 81],
  );
  assert.deepEqual(
    updateNinePatchPair([41, 81], 1, 100, {
      max: 122,
      minSpan: MINIMUM_NINE_PATCH_CONTENT_SIZE.x,
      containPair: DEFAULT_NINE_PATCH_PADDING.paddingX,
    }),
    [41, 100],
  );
});

test("nine-patch padding pairs keep the default content height and can only expand outward", () => {
  assert.equal(MINIMUM_NINE_PATCH_CONTENT_SIZE.y, 18);

  assert.deepEqual(
    updateNinePatchPair([38, 75], 1, 42, {
      max: 112,
      minSpan: MINIMUM_NINE_PATCH_CONTENT_SIZE.y,
      containPair: DEFAULT_NINE_PATCH_PADDING.paddingY,
    }),
    [38, 75],
  );
  assert.deepEqual(
    updateNinePatchPair([38, 75], 0, 12, {
      max: 112,
      minSpan: MINIMUM_NINE_PATCH_CONTENT_SIZE.y,
      containPair: DEFAULT_NINE_PATCH_PADDING.paddingY,
    }),
    [12, 75],
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

test("nine-patch default markers are centered within the source image", () => {
  assert.deepEqual(getDefaultNinePatchMarkersForReferenceSize(NINE_PATCH_REFERENCE_SIZE), {
    stretchX: [41, 81],
    stretchY: [38, 75],
    paddingX: [41, 81],
    paddingY: [38, 75],
  });

  assert.deepEqual(getDefaultNinePatchMarkersForReferenceSize({ width: 257, height: 93 }), {
    stretchX: [108, 148],
    stretchY: [27, 64],
    paddingX: [108, 148],
    paddingY: [27, 64],
  });
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

test("larger bubble images center the default content guide without shrinking it", () => {
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

  assert.deepEqual(expanded.stretchX, [70, 110]);
  assert.deepEqual(expanded.stretchY, [57, 94]);
  assert.deepEqual(expanded.paddingX, [70, 110]);
  assert.deepEqual(expanded.paddingY, [57, 94]);
  assert.equal(expanded.paddingX[1] - expanded.paddingX[0], 40);
  assert.equal(expanded.paddingY[1] - expanded.paddingY[0], 37);
  assert.deepEqual(expanded.referenceSize, { width: 182, height: 152 });
});

test("larger bubble images preserve custom content guides that already contain the center", () => {
  const expanded = rebaseNinePatchSettingsForReferenceSize(
    {
      stretchX: [40, 140],
      stretchY: [30, 120],
      paddingX: [30, 150],
      paddingY: [20, 120],
      referenceSize: NINE_PATCH_REFERENCE_SIZE,
    },
    { width: 182, height: 152 },
  );

  assert.deepEqual(expanded.stretchX, [40, 140]);
  assert.deepEqual(expanded.stretchY, [30, 120]);
  assert.deepEqual(expanded.paddingX, [30, 150]);
  assert.deepEqual(expanded.paddingY, [20, 120]);
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
  assert.deepEqual(rebased.referenceSize, NINE_PATCH_REFERENCE_SIZE);
  assert.deepEqual(getNinePatchReferenceSizeForMarkers(rebased), {
    width: 302,
    height: 114,
  });
});

test("nine-patch content reference size ignores stretch-only expansion", () => {
  const stretchExpanded = {
    stretchX: [41, 300],
    stretchY: [38, 300],
    paddingX: DEFAULT_NINE_PATCH_PADDING.paddingX,
    paddingY: DEFAULT_NINE_PATCH_PADDING.paddingY,
    referenceSize: NINE_PATCH_REFERENCE_SIZE,
  };

  assert.deepEqual(getNinePatchReferenceSizeForMarkers(stretchExpanded), {
    width: 302,
    height: 302,
  });
  assert.deepEqual(getNinePatchContentReferenceSizeForMarkers(stretchExpanded), NINE_PATCH_REFERENCE_SIZE);

  assert.deepEqual(
    getNinePatchContentReferenceSizeForMarkers({
      ...stretchExpanded,
      paddingX: [41, 300],
      paddingY: [38, 300],
    }),
    {
      width: 302,
      height: 302,
    },
  );
});

test("nine-patch content insets stay anchored when only the stretch canvas grows", () => {
  const stretchExpanded = {
    stretchX: [41, 300],
    stretchY: [38, 300],
    paddingX: DEFAULT_NINE_PATCH_PADDING.paddingX,
    paddingY: DEFAULT_NINE_PATCH_PADDING.paddingY,
    referenceSize: NINE_PATCH_REFERENCE_SIZE,
  };

  assert.deepEqual(getScaledNinePatchContentInsets(stretchExpanded), {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
  });

  const contentExpanded = {
    ...stretchExpanded,
    paddingX: [41, 300],
    paddingY: [38, 300],
  };

  assert.deepEqual(getScaledNinePatchContentInsets(contentExpanded), {
    top: 10,
    right: 1,
    bottom: 1,
    left: 10,
  });
});
