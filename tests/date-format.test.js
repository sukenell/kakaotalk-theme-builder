import assert from "node:assert/strict";
import test from "node:test";

import { formatKoreanDate, formatKoreanTime } from "../src/date-format.js";

test("formatKoreanDate returns the preview date label", () => {
  assert.equal(formatKoreanDate(new Date(2026, 5, 18)), "2026년 6월 18일 목요일 >");
});

test("formatKoreanTime returns a zero-padded chat message time", () => {
  assert.equal(formatKoreanTime(new Date(2026, 5, 18, 9, 5)), "09:05");
  assert.equal(formatKoreanTime(new Date(2026, 5, 18, 23, 7)), "23:07");
});
