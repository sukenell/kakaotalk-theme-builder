import assert from "node:assert/strict";
import test from "node:test";

import { applyPasscodeAction, formatPasscodeStatus } from "../src/passcode-preview.js";

test("applyPasscodeAction fills, deletes, and resets passcode preview slots", () => {
  assert.equal(applyPasscodeAction(0, "digit"), 1);
  assert.equal(applyPasscodeAction(3, "digit"), 4);
  assert.equal(applyPasscodeAction(4, "digit"), 4);
  assert.equal(applyPasscodeAction(2, "delete"), 1);
  assert.equal(applyPasscodeAction(0, "delete"), 0);
  assert.equal(applyPasscodeAction(3, "reset"), 0);
});

test("formatPasscodeStatus reports only the normalized number of entered slots", () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4].map(formatPasscodeStatus),
    [
      "4자리 중 0자리 입력됨",
      "4자리 중 1자리 입력됨",
      "4자리 중 2자리 입력됨",
      "4자리 중 3자리 입력됨",
      "4자리 중 4자리 입력됨",
    ],
  );
  assert.equal(formatPasscodeStatus(-1), "4자리 중 0자리 입력됨");
  assert.equal(formatPasscodeStatus(5), "4자리 중 4자리 입력됨");
});
