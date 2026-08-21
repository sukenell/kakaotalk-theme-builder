export const PASSCODE_LENGTH = 4;

function normalizePasscodeCount(count) {
  const numericCount = Number(count);
  if (!Number.isFinite(numericCount)) {
    return 0;
  }

  return Math.max(0, Math.min(PASSCODE_LENGTH, Math.trunc(numericCount)));
}

export function formatPasscodeStatus(count) {
  return `${PASSCODE_LENGTH}자리 중 ${normalizePasscodeCount(count)}자리 입력됨`;
}

export function applyPasscodeAction(currentCount, action) {
  const count = normalizePasscodeCount(currentCount);

  if (action === "digit") {
    return Math.min(PASSCODE_LENGTH, count + 1);
  }

  if (action === "delete") {
    return Math.max(0, count - 1);
  }

  if (action === "reset") {
    return 0;
  }

  return count;
}
