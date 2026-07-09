export const MINIMUM_NINE_PATCH_CONTENT_SIZE = {
  x: 40,
  y: 18,
};
export const NINE_PATCH_REFERENCE_SIZE = {
  width: 124,
  height: 114,
};
export const DEFAULT_NINE_PATCH_PADDING = {
  paddingX: [41, 81],
  paddingY: [38, 75],
};
export const DEFAULT_BUBBLE_CONTENT_INSET_PX = 10;

export function clampNinePatchPosition(value, max) {
  return Math.max(1, Math.min(max, Number.isFinite(value) ? Math.round(value) : 1));
}

export function updateNinePatchPair(pair, index, value, { max, minSpan = 0 }) {
  const limit = Math.max(1, Number.isFinite(max) ? Math.round(max) : 1);
  const requiredSpan = Math.max(0, Math.min(limit - 1, Number.isFinite(minSpan) ? Math.round(minSpan) : 0));
  const nextPair = [
    clampNinePatchPosition(pair?.[0], limit),
    clampNinePatchPosition(pair?.[1], limit),
  ];

  nextPair[index === 0 ? 0 : 1] = clampNinePatchPosition(value, limit);

  if (nextPair[0] > nextPair[1]) {
    nextPair[index === 0 ? 1 : 0] = nextPair[index === 0 ? 0 : 1];
  }

  if (requiredSpan > 0 && nextPair[1] - nextPair[0] < requiredSpan) {
    if (index === 0) {
      nextPair[0] = Math.min(nextPair[0], limit - requiredSpan);
      nextPair[1] = nextPair[0] + requiredSpan;
    } else {
      nextPair[1] = Math.max(nextPair[1], 1 + requiredSpan);
      nextPair[0] = nextPair[1] - requiredSpan;
    }
  }

  return nextPair;
}

export function normalizeNinePatchPair(value, fallback) {
  if (!Array.isArray(value) || value.length < 2) {
    return [...fallback];
  }

  const first = Number(value[0]);
  const second = Number(value[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return [...fallback];
  }

  return [Math.round(first), Math.round(second)];
}

export function getNinePatchContentInsets(
  layout,
  { referenceSize = NINE_PATCH_REFERENCE_SIZE, fallbackPadding = DEFAULT_NINE_PATCH_PADDING } = {},
) {
  const paddingX = normalizeNinePatchPair(layout?.paddingX, fallbackPadding.paddingX);
  const paddingY = normalizeNinePatchPair(layout?.paddingY, fallbackPadding.paddingY);
  const innerWidth = referenceSize.width - 2;
  const innerHeight = referenceSize.height - 2;

  return {
    top: Math.max(1, paddingY[0] - 1),
    right: Math.max(1, innerWidth - paddingX[1]),
    bottom: Math.max(1, innerHeight - paddingY[1]),
    left: Math.max(1, paddingX[0] - 1),
  };
}

export function getScaledNinePatchContentInsets(
  layout,
  {
    referenceSize = NINE_PATCH_REFERENCE_SIZE,
    fallbackPadding = DEFAULT_NINE_PATCH_PADDING,
    defaultInsetPx = DEFAULT_BUBBLE_CONTENT_INSET_PX,
  } = {},
) {
  const insets = getNinePatchContentInsets(layout, { referenceSize, fallbackPadding });
  const defaultInsets = getNinePatchContentInsets(fallbackPadding, { referenceSize, fallbackPadding });

  return Object.fromEntries(
    Object.entries(insets).map(([side, value]) => [
      side,
      Math.max(1, Math.round((value / defaultInsets[side]) * defaultInsetPx)),
    ]),
  );
}
