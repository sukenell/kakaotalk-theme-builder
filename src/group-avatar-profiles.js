export const DEFAULT_GROUP_AVATAR_PROFILE_RATE = 0.28;

export function shouldUseDefaultGroupAvatarProfile(random = Math.random) {
  const value = random();

  return Number.isFinite(value) && value >= 0 && value < DEFAULT_GROUP_AVATAR_PROFILE_RATE;
}

export function getDefaultGroupAvatarItemIndex(itemCount, random = Math.random) {
  const count = Math.max(0, Math.floor(Number(itemCount)));

  if (count < 1) {
    return -1;
  }

  const value = random();
  const normalizedValue = Number.isFinite(value) ? value : 0;
  const boundedValue = Math.min(0.999999, Math.max(0, normalizedValue));

  return Math.floor(boundedValue * count);
}
