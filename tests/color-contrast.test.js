import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CONTRAST_CONTEXTS,
  compositeColors,
  contrastRatio,
  evaluateContrastContext,
  evaluateContrastPair,
  parseCssHex,
  parseThemeArgb,
  relativeLuminance,
} from "../src/color-contrast.js";
import { PREVIEW_PAGES } from "../src/preview-pages.js";
import { defaultThemeState } from "../src/theme-model.js";

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

test("CONTRAST_CONTEXTS covers exactly every preview page with auditable fields", () => {
  const previewPageIds = PREVIEW_PAGES.map(({ id }) => id).sort();
  const contextPageIds = [...new Set(CONTRAST_CONTEXTS.map(({ pageId }) => pageId))].sort();

  assert.deepEqual(contextPageIds, previewPageIds);
  assert.ok(CONTRAST_CONTEXTS.length >= PREVIEW_PAGES.length * 2);

  const contextIds = new Set();
  for (const context of CONTRAST_CONTEXTS) {
    assert.equal(typeof context.id, "string");
    assert.ok(context.id.length > 0);
    assert.equal(contextIds.has(context.id), false, `duplicate context id: ${context.id}`);
    contextIds.add(context.id);

    assert.equal(typeof context.label, "string", `${context.id} has a label`);
    assert.match(context.selector, new RegExp(`^#preview-panel-${context.pageId}(?:\\s|$)`));
    assert.ok(["default", "hover", "pressed", "selected"].includes(context.state));
    assert.ok(["text", "large-text", "ui-component", "image"].includes(context.kind));
    assert.ok([3, 4.5].includes(context.required));
    assert.ok(["cleared", "bundled", "user", "none"].includes(context.imageState));
    assert.ok(Array.isArray(context.imageKeys));
    assert.equal(typeof context.evidence, "string");
    assert.ok(context.evidence.length > 0);

    assert.notEqual(Boolean(context.foregroundKey), Boolean(context.foreground), `${context.id} has one foreground source`);
    assert.equal(
      [context.backgroundKey, context.background, context.backgroundLayers].filter(Boolean).length,
      1,
      `${context.id} has one background source`,
    );
  }
});

test("default contrast contexts pass raw thresholds or stay unknown only for real image dependence", () => {
  const results = CONTRAST_CONTEXTS.map((context) => ({
    context,
    result: evaluateContrastContext(context, defaultThemeState.colors),
  }));
  const failures = results.filter(({ result }) => result.status === "fail");
  const unknown = results.filter(({ result }) => result.status === "unknown");

  assert.deepEqual(
    failures.map(({ context, result }) => ({ id: context.id, ratio: result.ratio, required: result.required })),
    [],
  );
  assert.ok(results.some(({ result }) => result.status === "pass"));
  assert.ok(unknown.length > 0, "bundled decorative/icon rasters remain manual evidence");

  for (const { context, result } of unknown) {
    assert.equal(result.ratio, null);
    assert.ok(context.imageKeys.length > 0, `${context.id} names the unresolved image dependency`);
    assert.ok(["bundled", "user"].includes(context.imageState));
    assert.match(context.evidence, /수동|manual|이미지|image/i);
  }
});

test("context evaluation composites ordered static layers without rounding", () => {
  const productText = CONTRAST_CONTEXTS.find(({ id }) => id === "shopping-product-title");
  assert.ok(productText);
  assert.deepEqual(productText.backgroundLayers, ["#FFFFFF", "#000000B8"]);

  const result = evaluateContrastContext(productText, defaultThemeState.colors);
  assert.equal(result.status, "pass");
  assert.ok(result.ratio >= 4.5);
  assert.ok(result.ratio < 10);
});

test("image-backed text contexts use a guaranteed backing instead of pretending the raster was computed", () => {
  const protectedContexts = CONTRAST_CONTEXTS.filter(({ id }) =>
    [
      "chat-send-bubble",
      "chat-receive-bubble",
      "bubble-detail-send-default",
      "bubble-detail-send-selected",
      "bubble-detail-receive-default",
      "bubble-detail-receive-selected",
      "shopping-product-title",
      "shopping-product-price",
    ].includes(id),
  );

  assert.equal(protectedContexts.length, 8);
  for (const context of protectedContexts) {
    assert.equal(context.imageState, "bundled");
    assert.ok(context.imageKeys.length > 0);
    assert.ok(context.background || context.backgroundLayers, `${context.id} has a backing or scrim`);
    assert.equal(evaluateContrastContext(context, defaultThemeState.colors).status, "pass");
    assert.match(context.evidence, /backing|scrim/i);
  }
});

test("static secondary gray is limited to opaque white-backed contexts", () => {
  const staticSecondaryContexts = CONTRAST_CONTEXTS.filter(({ foreground }) => foreground === "#687078");

  assert.deepEqual(
    staticSecondaryContexts.map(({ id }) => id).sort(),
    ["more-ad-mark", "theme-list-manage", "theme-list-secondary"],
  );
  for (const context of staticSecondaryContexts) {
    assert.equal(context.background, "#FFFFFF");
    assert.equal(evaluateContrastContext(context, defaultThemeState.colors).status, "pass");
  }
  assert.ok(contrastRatio(parseCssHex("#687078"), parseCssHex("#FFDEDE")) < 4.5);
});

test("the human-readable contrast ledger records every selector, state, threshold, and evidence mode", async () => {
  const ledger = await readFile(new URL("../docs/accessibility-contrast-ledger.md", import.meta.url), "utf8");

  assert.match(ledger, /자동 판정은 색상 토큰과 명시된 합성 레이어만 계산/);
  assert.match(ledger, /axe[^\n]*이미지[^\n]*판정하지/);
  assert.match(ledger, /cleared[^\n]*bundled[^\n]*user/i);
  for (const context of CONTRAST_CONTEXTS) {
    assert.match(ledger, new RegExp(`\\| ${context.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\|`));
    assert.match(ledger, new RegExp(context.selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
