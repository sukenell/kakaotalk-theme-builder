import assert from "node:assert/strict";
import test from "node:test";

import { applyPasscodeAction } from "../src/passcode-preview.js";

test("applyPasscodeAction fills, deletes, and resets passcode preview slots", () => {
  assert.equal(applyPasscodeAction(0, "digit"), 1);
  assert.equal(applyPasscodeAction(3, "digit"), 4);
  assert.equal(applyPasscodeAction(4, "digit"), 4);
  assert.equal(applyPasscodeAction(2, "delete"), 1);
  assert.equal(applyPasscodeAction(0, "delete"), 0);
  assert.equal(applyPasscodeAction(3, "reset"), 0);
});
