export const PASSCODE_LENGTH = 4;

export function applyPasscodeAction(currentCount, action) {
  const count = Math.max(0, Math.min(PASSCODE_LENGTH, Number(currentCount) || 0));

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
