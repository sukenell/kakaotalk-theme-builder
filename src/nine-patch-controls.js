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
const defaultNinePatchMarkers = {
  stretchX: DEFAULT_NINE_PATCH_PADDING.paddingX,
  stretchY: DEFAULT_NINE_PATCH_PADDING.paddingY,
  paddingX: DEFAULT_NINE_PATCH_PADDING.paddingX,
  paddingY: DEFAULT_NINE_PATCH_PADDING.paddingY,
};

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

export function normalizeNinePatchReferenceSize(value, fallback = NINE_PATCH_REFERENCE_SIZE) {
  const width = Number(value?.width);
  const height = Number(value?.height);

  return {
    width: Math.max(3, Number.isFinite(width) ? Math.round(width) : fallback.width),
    height: Math.max(3, Number.isFinite(height) ? Math.round(height) : fallback.height),
  };
}

export function getNinePatchReferenceSizeForSource(sourceSize, minimumReferenceSize = NINE_PATCH_REFERENCE_SIZE) {
  const minimum = normalizeNinePatchReferenceSize(minimumReferenceSize);
  const sourceWidth = Number(sourceSize?.width);
  const sourceHeight = Number(sourceSize?.height);

  return {
    width: Math.max(minimum.width, Number.isFinite(sourceWidth) ? Math.round(sourceWidth) + 2 : minimum.width),
    height: Math.max(minimum.height, Number.isFinite(sourceHeight) ? Math.round(sourceHeight) + 2 : minimum.height),
  };
}

function getNinePatchExpansionOffset(referenceSize, baseReferenceSize = NINE_PATCH_REFERENCE_SIZE) {
  const reference = normalizeNinePatchReferenceSize(referenceSize);
  const base = normalizeNinePatchReferenceSize(baseReferenceSize);

  return {
    x: Math.max(0, Math.round(((reference.width - 2) - (base.width - 2)) / 2)),
    y: Math.max(0, Math.round(((reference.height - 2) - (base.height - 2)) / 2)),
  };
}

function shiftNinePatchPair(pair, delta, max, fallback) {
  const sourcePair = normalizeNinePatchPair(pair, fallback);
  const span = Math.max(0, sourcePair[1] - sourcePair[0]);
  const limit = Math.max(1, Number.isFinite(max) ? Math.round(max) : 1);
  let start = sourcePair[0] + delta;
  let end = sourcePair[1] + delta;

  if (start < 1) {
    end += 1 - start;
    start = 1;
  }
  if (end > limit) {
    start -= end - limit;
    end = limit;
  }

  start = clampNinePatchPosition(start, limit);
  end = clampNinePatchPosition(end, limit);
  if (end - start < span) {
    end = Math.min(limit, start + span);
    start = Math.max(1, end - span);
  }

  return [start, end];
}

export function rebaseNinePatchSettingsForReferenceSize(
  settings,
  nextReferenceSize,
  previousReferenceSize = settings?.referenceSize ?? NINE_PATCH_REFERENCE_SIZE,
) {
  const nextReference = normalizeNinePatchReferenceSize(nextReferenceSize);
  const previousOffset = getNinePatchExpansionOffset(previousReferenceSize);
  const nextOffset = getNinePatchExpansionOffset(nextReference);
  const deltaX = nextOffset.x - previousOffset.x;
  const deltaY = nextOffset.y - previousOffset.y;
  const maxX = nextReference.width - 2;
  const maxY = nextReference.height - 2;

  return {
    ...settings,
    stretchX: shiftNinePatchPair(settings?.stretchX, deltaX, maxX, defaultNinePatchMarkers.stretchX),
    stretchY: shiftNinePatchPair(settings?.stretchY, deltaY, maxY, defaultNinePatchMarkers.stretchY),
    paddingX: shiftNinePatchPair(settings?.paddingX, deltaX, maxX, defaultNinePatchMarkers.paddingX),
    paddingY: shiftNinePatchPair(settings?.paddingY, deltaY, maxY, defaultNinePatchMarkers.paddingY),
    referenceSize: nextReference,
  };
}

export function getNinePatchContentInsets(
  layout,
  { referenceSize = NINE_PATCH_REFERENCE_SIZE, fallbackPadding = DEFAULT_NINE_PATCH_PADDING } = {},
) {
  const effectiveReferenceSize = normalizeNinePatchReferenceSize(layout?.referenceSize ?? referenceSize);
  const paddingX = normalizeNinePatchPair(layout?.paddingX, fallbackPadding.paddingX);
  const paddingY = normalizeNinePatchPair(layout?.paddingY, fallbackPadding.paddingY);
  const innerWidth = effectiveReferenceSize.width - 2;
  const innerHeight = effectiveReferenceSize.height - 2;

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
    defaultReferenceSize = NINE_PATCH_REFERENCE_SIZE,
    fallbackPadding = DEFAULT_NINE_PATCH_PADDING,
    defaultInsetPx = DEFAULT_BUBBLE_CONTENT_INSET_PX,
  } = {},
) {
  const insets = getNinePatchContentInsets(layout, { referenceSize, fallbackPadding });
  const defaultInsets = getNinePatchContentInsets(fallbackPadding, {
    referenceSize: defaultReferenceSize,
    fallbackPadding,
  });

  return Object.fromEntries(
    Object.entries(insets).map(([side, value]) => [
      side,
      Math.max(1, Math.round((value / defaultInsets[side]) * defaultInsetPx)),
    ]),
  );
}
