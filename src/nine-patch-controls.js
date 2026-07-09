export const MINIMUM_NINE_PATCH_CONTENT_SIZE = {
  x: 40,
  y: 18,
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
