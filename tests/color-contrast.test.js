import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CONTRAST_CONTEXTS,
  compositeColors,
  contrastRatio,
  evaluateContrastContext,
  evaluateContrastPair,
  evaluateThemeContrast,
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

const AUDITED_CONTEXT_INVENTORY = Object.freeze({
  home: [
    "home-status",
    "home-header-title",
    "home-header-actions",
    "home-segment-default",
    "home-segment-selected",
    "home-promo-title",
    "home-promo-secondary",
    "home-section",
    "home-profile-name",
    "home-secondary",
    "home-tab-icons-default",
    "home-tab-icon-selected",
  ],
  "chat-list": [
    "chat-list-status",
    "chat-list-header-title",
    "chat-list-header-actions",
    "chat-list-title",
    "chat-list-member-count",
    "chat-list-secondary",
    "chat-list-time",
    "chat-list-unread",
    "chat-list-tab-icons-default",
    "chat-list-tab-icon-selected",
  ],
  "open-chat": [
    "open-chat-status",
    "open-chat-header-title",
    "open-chat-header-actions",
    "open-chat-title",
    "open-chat-member-count",
    "open-chat-secondary",
    "open-chat-time",
    "open-chat-unread",
    "open-chat-tab-icons-default",
    "open-chat-tab-icon-selected",
  ],
  shopping: [
    "shopping-status",
    "shopping-header-title",
    "shopping-header-actions",
    "shopping-tab-default",
    "shopping-tab-selected",
    "shopping-summary-title",
    "shopping-summary-secondary",
    "shopping-summary-heart",
    "shopping-order-glyph",
    "shopping-pick-title",
    "shopping-pick-info",
    "shopping-carousel-default",
    "shopping-carousel-hover",
    "shopping-carousel-pressed",
    "shopping-product-badge",
    "shopping-product-title",
    "shopping-product-price",
    "shopping-tab-icons-default",
    "shopping-tab-icon-selected",
  ],
  more: [
    "more-status",
    "more-header-title",
    "more-header-actions",
    "more-segment-default",
    "more-segment-selected",
    "more-service-icon",
    "more-service-title",
    "more-page-dot-default",
    "more-page-dot-selected",
    "more-ad-title",
    "more-ad-description",
    "more-ad-mark",
    "more-ad-footer-title",
    "more-ad-footer-link",
    "more-section",
    "more-tab-icons-default",
    "more-tab-icon-selected",
  ],
  chat: [
    "chat-status",
    "chat-header-title",
    "chat-header-actions",
    "chat-date",
    "chat-sender",
    "chat-time",
    "chat-send-bubble-normal",
    "chat-send-bubble-additional",
    "chat-receive-bubble-normal",
    "chat-receive-bubble-additional",
    "chat-receive-bubble-typing",
    "chat-input",
    "chat-input-menu",
    "chat-send-button",
  ],
  "bubble-detail": [
    "bubble-detail-status",
    "bubble-detail-header",
    "bubble-detail-action",
    "bubble-detail-editor-crop",
    "bubble-detail-stretch-guide",
    "bubble-detail-padding-guide",
    "bubble-detail-fit-legend",
    "bubble-detail-fit-default",
    "bubble-detail-fit-selected",
    "bubble-detail-control-legend",
    "bubble-detail-control-value",
  ],
  passcode: [
    "passcode-status",
    "passcode-title",
    "passcode-description",
    "passcode-keypad",
    "passcode-cancel",
    "passcode-delete",
    "passcode-dot-default",
    "passcode-dot-selected",
  ],
  splash: ["splash-status", "splash-theme-icon"],
  "theme-list": [
    "theme-list-status",
    "theme-list-back",
    "theme-list-header",
    "theme-list-manage",
    "theme-list-section",
    "theme-list-title-default",
    "theme-list-secondary-default",
    "theme-list-title-selected",
    "theme-list-secondary-selected",
    "theme-list-choice-default",
    "theme-list-choice-selected",
    "theme-list-download",
    "theme-list-user-icon",
  ],
});

const mainImage = Object.freeze({ mainBackground: "cleared" });
const tabSurfaceImages = (...iconKeys) => Object.freeze({
  mainBackground: "cleared",
  tabBackground: "cleared",
  ...Object.fromEntries(iconKeys.map((key) => [key, "bundled"])),
});

const EXPECTED_IMAGE_DEPENDENCIES = Object.freeze({
  "home-header-title": mainImage,
  "home-header-actions": Object.freeze({ mainBackground: "cleared", headerSearch: "bundled", headerFriendTab: "bundled", headerSettings: "bundled" }),
  "home-segment-default": mainImage,
  "home-promo-title": mainImage,
  "home-promo-secondary": mainImage,
  "home-section": mainImage,
  "home-profile-name": mainImage,
  "home-secondary": mainImage,
  "home-tab-icons-default": tabSurfaceImages("tabChatIcon", "tabOpenChatIcon", "tabShoppingIcon", "tabMoreIcon"),
  "home-tab-icon-selected": tabSurfaceImages("tabFriendIconSelected"),

  "chat-list-header-title": mainImage,
  "chat-list-header-actions": Object.freeze({ mainBackground: "cleared", headerSearch: "bundled", headerCompose: "bundled", headerSettings: "bundled" }),
  "chat-list-title": mainImage,
  "chat-list-member-count": mainImage,
  "chat-list-secondary": mainImage,
  "chat-list-time": mainImage,
  "chat-list-tab-icons-default": tabSurfaceImages("tabFriendIcon", "tabOpenChatIcon", "tabShoppingIcon", "tabMoreIcon"),
  "chat-list-tab-icon-selected": tabSurfaceImages("tabChatIconSelected"),

  "open-chat-header-title": mainImage,
  "open-chat-header-actions": Object.freeze({ mainBackground: "cleared", headerSearch: "bundled", headerCompose: "bundled", headerSettings: "bundled" }),
  "open-chat-title": mainImage,
  "open-chat-member-count": mainImage,
  "open-chat-secondary": mainImage,
  "open-chat-time": mainImage,
  "open-chat-tab-icons-default": tabSurfaceImages("tabFriendIcon", "tabChatIcon", "tabShoppingIcon", "tabMoreIcon"),
  "open-chat-tab-icon-selected": tabSurfaceImages("tabOpenChatIconSelected"),

  "shopping-header-title": mainImage,
  "shopping-header-actions": Object.freeze({ mainBackground: "cleared", headerSearch: "bundled", headerShopping: "bundled", headerSettings: "bundled" }),
  "shopping-tab-default": mainImage,
  "shopping-summary-title": mainImage,
  "shopping-summary-secondary": mainImage,
  "shopping-summary-heart": Object.freeze({ shoppingImage_01: "bundled", shoppingImage_02: "bundled", shoppingImage_03: "bundled", shoppingImage_04: "bundled" }),
  "shopping-pick-title": mainImage,
  "shopping-pick-info": mainImage,
  "shopping-carousel-default": mainImage,
  "shopping-product-badge": Object.freeze({ shoppingImage_01: "bundled", shoppingImage_02: "bundled", shoppingImage_03: "bundled", shoppingImage_04: "bundled" }),
  "shopping-product-title": Object.freeze({ shoppingImage_01: "bundled", shoppingImage_02: "bundled", shoppingImage_03: "bundled", shoppingImage_04: "bundled" }),
  "shopping-product-price": Object.freeze({ shoppingImage_01: "bundled", shoppingImage_02: "bundled", shoppingImage_03: "bundled", shoppingImage_04: "bundled" }),
  "shopping-tab-icons-default": tabSurfaceImages("tabFriendIcon", "tabChatIcon", "tabOpenChatIcon", "tabMoreIcon"),
  "shopping-tab-icon-selected": tabSurfaceImages("tabShoppingIconSelected"),

  "more-header-title": mainImage,
  "more-header-actions": Object.freeze({ mainBackground: "cleared", headerSearch: "bundled", headerScan: "bundled", headerSettings: "bundled" }),
  "more-segment-default": mainImage,
  "more-service-icon": mainImage,
  "more-service-title": mainImage,
  "more-page-dot-default": mainImage,
  "more-page-dot-selected": mainImage,
  "more-ad-title": Object.freeze({ readingLogAd: "bundled" }),
  "more-ad-description": Object.freeze({ readingLogAd: "bundled" }),
  "more-ad-mark": Object.freeze({ readingLogAd: "bundled" }),
  "more-ad-footer-title": mainImage,
  "more-ad-footer-link": mainImage,
  "more-section": mainImage,
  "more-tab-icons-default": tabSurfaceImages("tabFriendIcon", "tabChatIcon", "tabOpenChatIcon", "tabShoppingIcon"),
  "more-tab-icon-selected": tabSurfaceImages("tabMoreIconSelected"),

  "chat-date": Object.freeze({ chatBackground: "cleared" }),
  "chat-sender": Object.freeze({ chatBackground: "cleared" }),
  "chat-time": Object.freeze({ chatBackground: "cleared" }),
  "chat-send-bubble-normal": Object.freeze({ chatBackground: "cleared", sendBubbleNormal: "bundled" }),
  "chat-send-bubble-additional": Object.freeze({ chatBackground: "cleared", sendBubbleTailless: "bundled" }),
  "chat-receive-bubble-normal": Object.freeze({ chatBackground: "cleared", receiveBubbleNormal: "bundled" }),
  "chat-receive-bubble-additional": Object.freeze({ chatBackground: "cleared", receiveBubbleTailless: "bundled" }),
  "chat-receive-bubble-typing": Object.freeze({ chatBackground: "cleared", receiveBubbleNormal: "bundled" }),

  "bubble-detail-editor-crop": Object.freeze({ chatBackground: "cleared", sendBubbleNormal: "bundled" }),
  "bubble-detail-stretch-guide": Object.freeze({ chatBackground: "cleared", sendBubbleNormal: "bundled" }),
  "bubble-detail-padding-guide": Object.freeze({ chatBackground: "cleared", sendBubbleNormal: "bundled" }),
  "bubble-detail-fit-legend": Object.freeze({ chatBackground: "cleared" }),
  "bubble-detail-fit-default": Object.freeze({ chatBackground: "cleared" }),
  "bubble-detail-control-legend": Object.freeze({ chatBackground: "cleared" }),
  "bubble-detail-control-value": Object.freeze({ chatBackground: "cleared" }),

  "passcode-title": Object.freeze({ passcodeBackgroundImage: "cleared" }),
  "passcode-description": Object.freeze({ passcodeBackgroundImage: "cleared" }),
  "passcode-keypad": Object.freeze({ passcodeBackgroundImage: "cleared" }),
  "passcode-cancel": Object.freeze({ passcodeBackgroundImage: "cleared" }),
  "passcode-delete": Object.freeze({ passcodeBackgroundImage: "cleared" }),
  "passcode-dot-default": Object.freeze({ passcodeBackgroundImage: "cleared", passcodeDot: "bundled", passcodeDot2: "bundled", passcodeDot3: "bundled", passcodeDot4: "bundled" }),
  "passcode-dot-selected": Object.freeze({ passcodeBackgroundImage: "cleared", passcodeDotSelected: "bundled", passcodeDotSelected2: "bundled", passcodeDotSelected3: "bundled", passcodeDotSelected4: "bundled" }),
  "splash-status": Object.freeze({ splashImage: "cleared" }),
  "splash-theme-icon": Object.freeze({ splashImage: "cleared", themeIcon: "bundled" }),
  "theme-list-user-icon": Object.freeze({ themeIcon: "bundled" }),
});

const HEADER_ACTION_CONTEXT_IDS = Object.freeze([
  "home-header-actions",
  "chat-list-header-actions",
  "open-chat-header-actions",
  "shopping-header-actions",
  "more-header-actions",
]);

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
    assert.ok(Array.isArray(context.protectedImageKeys));
    assert.equal(typeof context.imageStates, "object", `${context.id} declares per-image default states`);
    assert.deepEqual(
      Object.keys(context.imageStates).sort(),
      [...context.imageKeys].sort(),
      `${context.id} has one state for every relevant image`,
    );
    for (const imageState of Object.values(context.imageStates)) {
      assert.ok(["cleared", "bundled", "user"].includes(imageState), `${context.id} has a valid image state`);
    }
    assert.equal(
      context.protectedImageKeys.every((key) => context.imageKeys.includes(key)),
      true,
      `${context.id} only protects declared image dependencies`,
    );
    assert.equal(
      Boolean(context.guarantee),
      context.protectedImageKeys.length > 0,
      `${context.id} pairs its guarantee with explicit protected image keys`,
    );
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

test("contrast ledger matches the explicit visible text and UI inventory for all ten panels", () => {
  assert.deepEqual(
    Object.keys(AUDITED_CONTEXT_INVENTORY).sort(),
    PREVIEW_PAGES.map(({ id }) => id).sort(),
  );

  for (const page of PREVIEW_PAGES) {
    assert.deepEqual(
      CONTRAST_CONTEXTS.filter(({ pageId }) => pageId === page.id).map(({ id }) => id).sort(),
      [...AUDITED_CONTEXT_INVENTORY[page.id]].sort(),
      `${page.id} inventory is exhaustive`,
    );
  }

  const removedFakeSampleIds = [
    "bubble-detail-send-default",
    "bubble-detail-send-selected",
    "bubble-detail-receive-default",
    "bubble-detail-receive-selected",
  ];
  for (const id of removedFakeSampleIds) {
    assert.equal(CONTRAST_CONTEXTS.some((context) => context.id === id), false, `${id} is not a rendered text context`);
  }
});

test("every context declares its complete default raster dependency set", () => {
  for (const context of CONTRAST_CONTEXTS) {
    const expectedStates = EXPECTED_IMAGE_DEPENDENCIES[context.id] ?? {};
    assert.deepEqual(context.imageStates, expectedStates, `${context.id} image dependency metadata`);
    assert.deepEqual([...context.imageKeys].sort(), Object.keys(expectedStates).sort(), `${context.id} image keys`);
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

test("effective image state overrides affect only relevant unprotected raster dependencies", () => {
  const mainSurface = CONTRAST_CONTEXTS.find(({ id }) => id === "home-section");
  const protectedProduct = CONTRAST_CONTEXTS.find(({ id }) => id === "shopping-product-title");
  assert.ok(mainSurface);
  assert.ok(protectedProduct);

  assert.equal(evaluateContrastContext(mainSurface, defaultThemeState.colors).status, "pass");
  assert.equal(
    evaluateContrastContext(mainSurface, defaultThemeState.colors, {
      imageStates: { mainBackground: "user" },
    }).status,
    "unknown",
  );
  assert.equal(
    evaluateContrastContext(mainSurface, defaultThemeState.colors, {
      imageStates: { mainBackground: "bundled" },
    }).status,
    "unknown",
  );
  assert.equal(
    evaluateContrastContext(mainSurface, defaultThemeState.colors, {
      imageStates: { chatBackground: "user" },
    }).status,
    "pass",
  );
  assert.equal(
    evaluateContrastContext(mainSurface, defaultThemeState.colors, {
      imageStates: { mainBackground: "cleared" },
    }).status,
    "pass",
  );
  assert.equal(
    evaluateContrastContext(protectedProduct, defaultThemeState.colors, {
      imageStates: { shoppingImage_01: "user" },
    }).status,
    "pass",
  );
});

test("header mask guarantees never exempt their raster-backed main surface", () => {
  for (const id of HEADER_ACTION_CONTEXT_IDS) {
    const context = CONTRAST_CONTEXTS.find(({ id: contextId }) => contextId === id);
    assert.ok(context, id);
    const protectedImageKeys = context.protectedImageKeys ?? [];

    for (const imageState of ["bundled", "user"]) {
      assert.equal(
        evaluateContrastContext(context, defaultThemeState.colors, {
          imageStates: { mainBackground: imageState },
        }).status,
        "unknown",
        `${id} ${imageState} main background stays unresolved`,
      );
    }

    for (const protectedKey of protectedImageKeys) {
      assert.equal(
        evaluateContrastContext(context, defaultThemeState.colors, {
          imageStates: { [protectedKey]: "user" },
        }).status,
        "pass",
        `${id} ${protectedKey} remains a currentColor mask`,
      );
    }

    assert.equal(
      evaluateContrastContext(context, defaultThemeState.colors, {
        imageStates: { readingLogAd: "user" },
      }).status,
      "pass",
      `${id} ignores unrelated image state`,
    );

    assert.deepEqual(
      [...protectedImageKeys].sort(),
      context.imageKeys.filter((key) => key !== "mainBackground").sort(),
      `${id} protects only its CSS mask assets`,
    );
  }
});

test("every backing and scrim guarantee names each protected dependency", () => {
  const guaranteedContexts = CONTRAST_CONTEXTS.filter(({ guarantee }) => guarantee);
  assert.ok(guaranteedContexts.length > HEADER_ACTION_CONTEXT_IDS.length);

  for (const context of guaranteedContexts) {
    if (HEADER_ACTION_CONTEXT_IDS.includes(context.id)) {
      continue;
    }
    assert.deepEqual(
      [...(context.protectedImageKeys ?? [])].sort(),
      [...context.imageKeys].sort(),
      `${context.id} protects every raster behind its opaque or worst-case backing`,
    );
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
      "chat-send-bubble-normal",
      "chat-send-bubble-additional",
      "chat-receive-bubble-normal",
      "chat-receive-bubble-additional",
      "chat-receive-bubble-typing",
      "chat-date",
      "shopping-summary-heart",
      "shopping-product-badge",
      "shopping-product-title",
      "shopping-product-price",
    ].includes(id),
  );

  assert.equal(protectedContexts.length, 10);
  for (const context of protectedContexts) {
    assert.ok(context.imageKeys.length > 0);
    assert.ok(context.background || context.backgroundLayers, `${context.id} has a backing or scrim`);
    assert.equal(evaluateContrastContext(context, defaultThemeState.colors).status, "pass");
    assert.match(context.evidence, /backing|scrim/i);
  }
});

test("static secondary gray is limited to opaque passing contexts and never the pink main surface", () => {
  const staticSecondaryContexts = CONTRAST_CONTEXTS.filter(({ foreground }) => foreground === "#687078");

  assert.deepEqual(
    staticSecondaryContexts.map(({ id }) => id).sort(),
    [
      "more-ad-mark",
      "theme-list-choice-default",
      "theme-list-manage",
      "theme-list-secondary-default",
      "theme-list-secondary-selected",
    ],
  );
  for (const context of staticSecondaryContexts) {
    assert.notEqual(context.background, "#FFDEDE");
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
    const row = ledger.split("\n").find((line) => line.startsWith(`| ${context.id} |`));
    assert.ok(row, `${context.id} has a ledger row`);
    assert.match(row, new RegExp(context.selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    if ((context.protectedImageKeys ?? []).length > 0) {
      assert.match(row, new RegExp(`보호 키: ${context.protectedImageKeys.join(", ")}`));
    }
  }
});

test("evaluateThemeContrast orders rich context and page results by PREVIEW_PAGES", () => {
  const contexts = [
    {
      id: "theme-list-pass",
      pageId: "theme-list",
      label: "테마 목록 통과",
      selector: "#theme-list-pass",
      foreground: "#000000",
      background: "#FFFFFF",
      required: 4.5,
      imageKeys: [],
      imageStates: {},
      protectedImageKeys: [],
    },
    {
      id: "chat-unknown",
      pageId: "chat",
      label: "채팅 이미지",
      selector: "#chat-unknown",
      foreground: "#000000",
      background: "#FFFFFF",
      required: 4.5,
      imageKeys: ["chatBackground"],
      imageStates: { chatBackground: "cleared" },
      protectedImageKeys: [],
    },
    {
      id: "home-fail",
      pageId: "home",
      label: "홈 미달",
      selector: "#home-fail",
      foregroundKey: "headerText",
      backgroundKey: "mainBackground",
      required: 4.5,
      imageKeys: [],
      imageStates: {},
      protectedImageKeys: [],
    },
  ];

  const report = evaluateThemeContrast({
    colors: { headerText: "#FFFFFF", mainBackground: "#FFFFFF" },
    imageStates: { chatBackground: "user" },
    contexts,
  });

  assert.deepEqual(report.results.map(({ id }) => id), ["home-fail", "chat-unknown", "theme-list-pass"]);
  assert.deepEqual(Object.keys(report.byPage), PREVIEW_PAGES.map(({ id }) => id));
  assert.deepEqual(report.byPage.home.results.map(({ id }) => id), ["home-fail"]);
  assert.equal(report.byPage.home.status, "fail");
  assert.equal(report.byPage.chat.status, "unknown");
  assert.equal(report.byPage["theme-list"].status, "pass");
  assert.equal(report.results[0].label, "홈 미달");
  assert.equal(report.results[0].selector, "#home-fail");
  assert.deepEqual(report.results[0].colorKeys, ["headerText", "mainBackground"]);
  assert.deepEqual(report.results[1].effectiveImageStates, { chatBackground: "user" });
  assert.equal(report.summary.total, 3);
  assert.equal(report.summary.passCount, 1);
  assert.equal(report.summary.failCount, 1);
  assert.equal(report.summary.unknownCount, 1);
  assert.equal(report.summary.worst, 1);
  assert.deepEqual(report.summary.failedPageIds, ["home"]);
  assert.deepEqual(report.summary.unknownPageIds, ["chat"]);
  assert.deepEqual(report.failedPageIds, ["home"]);
  assert.deepEqual(report.unknownPageIds, ["chat"]);
});

test("evaluateThemeContrast keeps the unrounded ratio at the AA boundary", () => {
  const contexts = [
    {
      id: "raw-boundary",
      pageId: "home",
      label: "반올림 전 경계",
      selector: "#raw-boundary",
      foreground: "#777777",
      background: "#FFFFFF",
      required: 4.5,
      imageKeys: [],
      imageStates: {},
      protectedImageKeys: [],
    },
  ];

  const report = evaluateThemeContrast({ colors: {}, contexts });
  const rawRatio = contrastRatio(parseCssHex("#777777"), parseCssHex("#FFFFFF"));

  assert.equal(report.results[0].status, "fail");
  assert.equal(report.results[0].ratio, rawRatio);
  assert.equal(report.summary.worst, rawRatio);
  assert.ok(report.summary.worst > 4.47 && report.summary.worst < 4.5);
  assert.notEqual(report.summary.worst, Number(report.summary.worst.toFixed(2)));
});

test("evaluateThemeContrast fans every token dependency out to all affected contexts", () => {
  const report = evaluateThemeContrast({
    colors: defaultThemeState.colors,
    contexts: CONTRAST_CONTEXTS,
  });
  const expectedMainBackgroundIds = CONTRAST_CONTEXTS.filter((context) =>
    context.foregroundKey === "mainBackground" ||
    context.backgroundKey === "mainBackground" ||
    context.backgroundLayers?.some((layer) => layer?.colorKey === "mainBackground"),
  ).map(({ id }) => id);

  assert.deepEqual(report.byColor.mainBackground.map(({ id }) => id), expectedMainBackgroundIds);
  assert.ok(report.byColor.headerText.some(({ pageId }) => pageId === "home"));
  assert.ok(report.byColor.headerText.some(({ pageId }) => pageId === "chat-list"));
  assert.ok(report.byColor.headerText.some(({ pageId }) => pageId === "theme-list"));
});

test("evaluateThemeContrast changes only contexts with the relevant unprotected image dependency", () => {
  const baseline = evaluateThemeContrast({
    colors: defaultThemeState.colors,
    contexts: CONTRAST_CONTEXTS,
  });
  const unrelated = evaluateThemeContrast({
    colors: defaultThemeState.colors,
    imageStates: { notAThemeImage: "user" },
    contexts: CONTRAST_CONTEXTS,
  });
  const userMainImage = evaluateThemeContrast({
    colors: defaultThemeState.colors,
    imageStates: { mainBackground: "user" },
    contexts: CONTRAST_CONTEXTS,
  });

  assert.deepEqual(unrelated, baseline);
  const changed = userMainImage.results.filter((result, index) =>
    result.status !== baseline.results[index].status || result.ratio !== baseline.results[index].ratio,
  );
  assert.ok(changed.length > 0);
  assert.equal(changed.every(({ imageKeys, protectedImageKeys }) =>
    imageKeys.includes("mainBackground") && !protectedImageKeys.includes("mainBackground")), true);
  assert.equal(changed.every(({ status }) => status === "unknown"), true);
});

test("evaluateThemeContrast keeps failed and unknown pages in preview order", () => {
  const colors = {
    ...defaultThemeState.colors,
    headerText: defaultThemeState.colors.mainBackground,
    titleText: defaultThemeState.colors.mainBackground,
  };
  const report = evaluateThemeContrast({
    colors,
    imageStates: { mainBackground: "user", chatBackground: "user" },
    contexts: CONTRAST_CONTEXTS,
  });
  const previewOrder = new Map(PREVIEW_PAGES.map(({ id }, index) => [id, index]));

  for (const pageIds of [report.summary.failedPageIds, report.summary.unknownPageIds]) {
    assert.deepEqual(pageIds, [...pageIds].sort((left, right) => previewOrder.get(left) - previewOrder.get(right)));
  }
  assert.ok(report.summary.failedPageIds.length > 1);
  assert.ok(report.summary.unknownPageIds.length > 1);
});
