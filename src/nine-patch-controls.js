export const MINIMUM_NINE_PATCH_CONTENT_SIZE = {
  x: 40,
  y: 18,
};
export const NINE_PATCH_REFERENCE_SIZE = {
  width: 124,
  height: 114,
};
export const MAX_NINE_PATCH_GUIDE_POSITION = 300;
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

export function updateNinePatchPair(pair, index, value, { max, minSpan = 0, containPair } = {}) {
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

  if (Array.isArray(containPair) && containPair.length >= 2) {
    const requiredPair = [
      clampNinePatchPosition(containPair[0], limit),
      clampNinePatchPosition(containPair[1], limit),
    ];
    if (requiredPair[0] > requiredPair[1]) {
      requiredPair[1] = requiredPair[0];
    }
    if (nextPair[0] > requiredPair[0]) {
      nextPair[0] = requiredPair[0];
    }
    if (nextPair[1] < requiredPair[1]) {
      nextPair[1] = requiredPair[1];
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

function getNinePatchPairExtent(pair, fallback) {
  const normalizedPair = normalizeNinePatchPair(pair, fallback);
  return Math.max(normalizedPair[0], normalizedPair[1]);
}

export function getNinePatchReferenceSizeForMarkers(settings, minimumReferenceSize = NINE_PATCH_REFERENCE_SIZE) {
  const requestedMinimum = normalizeNinePatchReferenceSize(minimumReferenceSize);
  const storedReference = normalizeNinePatchReferenceSize(settings?.referenceSize, requestedMinimum);
  const minimum = {
    width: Math.max(requestedMinimum.width, storedReference.width),
    height: Math.max(requestedMinimum.height, storedReference.height),
  };

  return {
    width: Math.max(
      minimum.width,
      getNinePatchPairExtent(settings?.stretchX, defaultNinePatchMarkers.stretchX) + 2,
      getNinePatchPairExtent(settings?.paddingX, defaultNinePatchMarkers.paddingX) + 2,
    ),
    height: Math.max(
      minimum.height,
      getNinePatchPairExtent(settings?.stretchY, defaultNinePatchMarkers.stretchY) + 2,
      getNinePatchPairExtent(settings?.paddingY, defaultNinePatchMarkers.paddingY) + 2,
    ),
  };
}

export function getNinePatchAxisControlMax(axis, referenceSize = NINE_PATCH_REFERENCE_SIZE) {
  const reference = normalizeNinePatchReferenceSize(referenceSize);
  const referenceMax = (axis === "x" ? reference.width : reference.height) - 2;
  return Math.max(MAX_NINE_PATCH_GUIDE_POSITION, referenceMax);
}

function clampNinePatchPairToBounds(pair, max, fallback, containPair) {
  const limit = Math.max(1, Number.isFinite(max) ? Math.round(max) : 1);
  const nextPair = normalizeNinePatchPair(pair, fallback).map((position) => clampNinePatchPosition(position, limit));
  if (nextPair[0] > nextPair[1]) {
    nextPair[1] = nextPair[0];
  }

  if (Array.isArray(containPair)) {
    return updateNinePatchPair(nextPair, 0, nextPair[0], { max: limit, containPair });
  }

  return nextPair;
}

export function rebaseNinePatchSettingsForReferenceSize(
  settings,
  nextReferenceSize,
  previousReferenceSize = settings?.referenceSize ?? NINE_PATCH_REFERENCE_SIZE,
) {
  const nextReference = getNinePatchReferenceSizeForMarkers(settings, nextReferenceSize);
  const maxX = nextReference.width - 2;
  const maxY = nextReference.height - 2;

  return {
    ...settings,
    stretchX: clampNinePatchPairToBounds(
      settings?.stretchX,
      maxX,
      defaultNinePatchMarkers.stretchX,
      defaultNinePatchMarkers.stretchX,
    ),
    stretchY: clampNinePatchPairToBounds(
      settings?.stretchY,
      maxY,
      defaultNinePatchMarkers.stretchY,
      defaultNinePatchMarkers.stretchY,
    ),
    paddingX: clampNinePatchPairToBounds(settings?.paddingX, maxX, defaultNinePatchMarkers.paddingX),
    paddingY: clampNinePatchPairToBounds(settings?.paddingY, maxY, defaultNinePatchMarkers.paddingY),
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
