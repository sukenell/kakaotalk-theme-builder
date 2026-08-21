import assert from "node:assert/strict";
import test from "node:test";

import {
  compositeColors,
  contrastRatio,
  evaluateContrastPair,
  parseCssHex,
  parseThemeArgb,
  relativeLuminance,
} from "../src/color-contrast.js";

const assertClose = (actual, expected, epsilon = 1e-12) => {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
};

test("parseCssHex reads CSS RRGGBB and RRGGBBAA channels", () => {
  assert.deepEqual(parseCssHex("#664242"), {
    r: 102,
    g: 66,
    b: 66,
    a: 1,
  });
  assert.deepEqual(parseCssHex("#66424226"), {
    r: 102,
    g: 66,
    b: 66,
    a: 38 / 255,
  });
});

test("parseThemeArgb reads theme RRGGBB and AARRGGBB without CSS ambiguity", () => {
  assert.deepEqual(parseThemeArgb("#664242"), {
    r: 102,
    g: 66,
    b: 66,
    a: 1,
  });

  const themeColor = parseThemeArgb("#26664242");
  const equivalentCssColor = parseCssHex("#66424226");

  assert.deepEqual(themeColor, {
    r: 102,
    g: 66,
    b: 66,
    a: 38 / 255,
  });
  assert.deepEqual(themeColor, equivalentCssColor);
});

test("hex parsers reject unsupported and malformed values", () => {
  const invalidValues = [
    "",
    "664242",
    "#642",
    "#66424",
    "#6642422",
    "#664242266",
    "#GG4242",
    " #664242",
    "#664242 ",
    null,
    undefined,
    0x664242,
  ];

  for (const value of invalidValues) {
    assert.equal(parseCssHex(value), null, `CSS parser accepted ${String(value)}`);
    assert.equal(
      parseThemeArgb(value),
      null,
      `theme parser accepted ${String(value)}`,
    );
  }
});

test("compositeColors alpha-composites foreground over background", () => {
  const foreground = Object.freeze({ r: 255, g: 0, b: 0, a: 0.5 });
  const background = Object.freeze({ r: 0, g: 0, b: 255, a: 0.5 });

  const result = compositeColors(foreground, background);

  assertClose(result.r, 170);
  assertClose(result.g, 0);
  assertClose(result.b, 85);
  assertClose(result.a, 0.75);
  assert.deepEqual(foreground, { r: 255, g: 0, b: 0, a: 0.5 });
  assert.deepEqual(background, { r: 0, g: 0, b: 255, a: 0.5 });
});

test("compositeColors resolves translucent foreground against opaque background", () => {
  assert.deepEqual(
    compositeColors(
      { r: 255, g: 0, b: 0, a: 0.5 },
      { r: 255, g: 255, b: 255, a: 1 },
    ),
    { r: 255, g: 127.5, b: 127.5, a: 1 },
  );
});

test("relativeLuminance follows the WCAG sRGB transfer function", () => {
  assert.equal(relativeLuminance({ r: 0, g: 0, b: 0, a: 1 }), 0);
  assert.equal(relativeLuminance({ r: 255, g: 255, b: 255, a: 1 }), 1);
  assertClose(
    relativeLuminance({ r: 119, g: 119, b: 119, a: 1 }),
    0.184474994500441,
  );
});

test("contrastRatio returns the unrounded black-on-white ratio", () => {
  assert.equal(
    contrastRatio(
      { r: 0, g: 0, b: 0, a: 1 },
      { r: 255, g: 255, b: 255, a: 1 },
    ),
    21,
  );
});

test("evaluateContrastPair compares the raw ratio at the 4.5 boundary", () => {
  const black = parseCssHex("#000000");
  const justBelow = evaluateContrastPair(
    parseCssHex("#747474"),
    black,
    4.5,
  );
  const justAbove = evaluateContrastPair(
    parseCssHex("#757575"),
    black,
    4.5,
  );

  assert.equal(Math.round(justBelow.ratio * 10) / 10, 4.5);
  assert.equal(justBelow.status, "fail");
  assert.equal(justBelow.required, 4.5);
  assert.ok(justBelow.ratio < 4.5);
  assert.equal(justAbove.status, "pass");
  assert.ok(justAbove.ratio > 4.5);
});

test("evaluateContrastPair compares the raw ratio at the 3.0 boundary", () => {
  const black = parseCssHex("#000000");
  const justBelow = evaluateContrastPair(
    parseCssHex("#595959"),
    black,
    3,
  );
  const justAbove = evaluateContrastPair(
    parseCssHex("#5A5A5A"),
    black,
    3,
  );

  assert.equal(Math.round(justBelow.ratio * 10) / 10, 3);
  assert.equal(justBelow.status, "fail");
  assert.equal(justBelow.required, 3);
  assert.ok(justBelow.ratio < 3);
  assert.equal(justAbove.status, "pass");
  assert.ok(justAbove.ratio > 3);
});

test("evaluateContrastPair reports invalid and unresolved pairs as unknown", () => {
  const opaqueBlack = { r: 0, g: 0, b: 0, a: 1 };
  const translucentWhite = { r: 255, g: 255, b: 255, a: 0.5 };

  assert.deepEqual(evaluateContrastPair(null, opaqueBlack, 4.5), {
    status: "unknown",
    ratio: null,
    required: 4.5,
  });
  assert.deepEqual(
    evaluateContrastPair(opaqueBlack, translucentWhite, 4.5),
    {
      status: "unknown",
      ratio: null,
      required: 4.5,
    },
  );
});

test("evaluateContrastPair resolves translucent foreground on an opaque background", () => {
  const result = evaluateContrastPair(
    { r: 0, g: 0, b: 0, a: 0.5 },
    { r: 255, g: 255, b: 255, a: 1 },
    4.5,
  );

  assert.equal(result.status, "fail");
  assert.equal(result.required, 4.5);
  assertClose(result.ratio, 3.976653024912438);
});
