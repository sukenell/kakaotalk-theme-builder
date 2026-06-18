import assert from "node:assert/strict";
import test from "node:test";

import { formatKoreanDate } from "../src/date-format.js";

test("formatKoreanDate returns the preview date label", () => {
  assert.equal(formatKoreanDate(new Date(2026, 5, 18)), "2026년 6월 18일 목요일 >");
});
