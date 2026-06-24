export const DEFAULT_GROUP_AVATAR_PROFILE_COUNT = 3;

function normalizeRandomValue(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(0.999999, Math.max(0, value));
}

export function getDefaultGroupAvatarItemIndexes(
  itemCount,
  random = Math.random,
  defaultCount = DEFAULT_GROUP_AVATAR_PROFILE_COUNT,
) {
  const count = Math.max(0, Math.floor(Number(itemCount)));
  const targetCount = Math.min(count, Math.max(0, Math.floor(Number(defaultCount))));
  const indexes = Array.from({ length: count }, (_, index) => index);

  for (let index = 0; index < targetCount; index += 1) {
    const randomOffset = Math.floor(normalizeRandomValue(random()) * (count - index));
    const swapIndex = index + randomOffset;

    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
  }

  return new Set(indexes.slice(0, targetCount).sort((left, right) => left - right));
}
