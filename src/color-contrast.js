/**
 * A normalized color. RGB channels use the 0–255 range and alpha uses 0–1.
 *
 * @typedef {object} RgbaColor
 * @property {number} r
 * @property {number} g
 * @property {number} b
 * @property {number} a
 */

/**
 * @typedef {object} ContrastEvaluation
 * @property {"pass" | "fail" | "unknown"} status
 * @property {number | null} ratio Unrounded contrast ratio, or null when unresolved.
 * @property {number} required
 */

const SIX_DIGIT_HEX = /^#([0-9a-f]{6})$/i;
const EIGHT_DIGIT_HEX = /^#([0-9a-f]{8})$/i;

const byteFromHex = (hex, start) => Number.parseInt(hex.slice(start, start + 2), 16);

/**
 * Parses a CSS hexadecimal color. Eight digits are interpreted as #RRGGBBAA.
 * Unsupported or malformed values return null.
 *
 * @param {unknown} value
 * @returns {RgbaColor | null}
 */
export function parseCssHex(value) {
  if (typeof value !== "string") {
    return null;
  }

  const opaqueMatch = value.match(SIX_DIGIT_HEX);
  if (opaqueMatch) {
    const hex = opaqueMatch[1];
    return {
      r: byteFromHex(hex, 0),
      g: byteFromHex(hex, 2),
      b: byteFromHex(hex, 4),
      a: 1,
    };
  }

  const alphaMatch = value.match(EIGHT_DIGIT_HEX);
  if (!alphaMatch) {
    return null;
  }

  const hex = alphaMatch[1];
  return {
    r: byteFromHex(hex, 0),
    g: byteFromHex(hex, 2),
    b: byteFromHex(hex, 4),
    a: byteFromHex(hex, 6) / 255,
  };
}

/**
 * Parses a KakaoTalk theme hexadecimal color. Eight digits are interpreted as
 * #AARRGGBB, unlike CSS hexadecimal colors. Unsupported or malformed values
 * return null.
 *
 * @param {unknown} value
 * @returns {RgbaColor | null}
 */
export function parseThemeArgb(value) {
  if (typeof value !== "string") {
    return null;
  }

  const opaqueMatch = value.match(SIX_DIGIT_HEX);
  if (opaqueMatch) {
    const hex = opaqueMatch[1];
    return {
      r: byteFromHex(hex, 0),
      g: byteFromHex(hex, 2),
      b: byteFromHex(hex, 4),
      a: 1,
    };
  }

  const alphaMatch = value.match(EIGHT_DIGIT_HEX);
  if (!alphaMatch) {
    return null;
  }

  const hex = alphaMatch[1];
  return {
    r: byteFromHex(hex, 2),
    g: byteFromHex(hex, 4),
    b: byteFromHex(hex, 6),
    a: byteFromHex(hex, 0) / 255,
  };
}

const isChannel = (value, maximum) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= maximum;

/** @param {unknown} color */
const isRgbaColor = (color) =>
  color !== null &&
  typeof color === "object" &&
  isChannel(color.r, 255) &&
  isChannel(color.g, 255) &&
  isChannel(color.b, 255) &&
  isChannel(color.a, 1);

/**
 * Alpha-composites a normalized foreground color over a normalized background.
 * Returns null when either input is not a valid RGBA color.
 *
 * @param {RgbaColor} foreground
 * @param {RgbaColor} background
 * @returns {RgbaColor | null}
 */
export function compositeColors(foreground, background) {
  if (!isRgbaColor(foreground) || !isRgbaColor(background)) {
    return null;
  }

  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const compositeChannel = (foregroundChannel, backgroundChannel) =>
    (foregroundChannel * foreground.a +
      backgroundChannel * background.a * (1 - foreground.a)) /
    alpha;

  return {
    r: compositeChannel(foreground.r, background.r),
    g: compositeChannel(foreground.g, background.g),
    b: compositeChannel(foreground.b, background.b),
    a: alpha,
  };
}

const linearizeSrgbChannel = (channel) => {
  const srgb = channel / 255;
  return srgb <= 0.04045
    ? srgb / 12.92
    : ((srgb + 0.055) / 1.055) ** 2.4;
};

/**
 * Calculates WCAG relative luminance for normalized RGB channels. Alpha is not
 * applied; translucent colors must be composited onto a known background first.
 *
 * @param {RgbaColor} color
 * @returns {number | null}
 */
export function relativeLuminance(color) {
  if (!isRgbaColor(color)) {
    return null;
  }

  return (
    0.2126 * linearizeSrgbChannel(color.r) +
    0.7152 * linearizeSrgbChannel(color.g) +
    0.0722 * linearizeSrgbChannel(color.b)
  );
}

/**
 * Calculates the unrounded WCAG contrast ratio between two opaque colors.
 * Invalid or translucent inputs return null.
 *
 * @param {RgbaColor} first
 * @param {RgbaColor} second
 * @returns {number | null}
 */
export function contrastRatio(first, second) {
  if (!isRgbaColor(first) || !isRgbaColor(second)) {
    return null;
  }
  if (first.a !== 1 || second.a !== 1) {
    return null;
  }

  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Evaluates foreground contrast against a known background using an unrounded
 * ratio. A translucent foreground is first composited over the background. If
 * the background itself is translucent, or any input is invalid, the pair is
 * unresolved and returns an `unknown` status.
 *
 * @param {RgbaColor} foreground
 * @param {RgbaColor} background
 * @param {number} [required=4.5]
 * @returns {ContrastEvaluation}
 */
export function evaluateContrastPair(foreground, background, required = 4.5) {
  const unknown = { status: "unknown", ratio: null, required };
  if (
    !isRgbaColor(foreground) ||
    !isRgbaColor(background) ||
    background.a !== 1 ||
    typeof required !== "number" ||
    !Number.isFinite(required) ||
    required <= 0
  ) {
    return unknown;
  }

  const resolvedForeground = compositeColors(foreground, background);
  const ratio = contrastRatio(resolvedForeground, background);
  if (ratio === null) {
    return unknown;
  }

  return {
    status: ratio >= required ? "pass" : "fail",
    ratio,
    required,
  };
}
