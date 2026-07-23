import test from "node:test";
import assert from "node:assert/strict";
import { getNextReviewDate, getReviewIntervalDays } from "./scheduling.js";

const START = new Date("2026-07-22T15:30:00.000Z");

test("solved problems return in 21 days", () => {
  assert.equal(getReviewIntervalDays("solved"), 21);
  assert.equal(getNextReviewDate("solved", START).toISOString(), "2026-08-12T15:30:00.000Z");
});

test("almost-solved problems return in 7 days", () => {
  assert.equal(getNextReviewDate("almost", START).toISOString(), "2026-07-29T15:30:00.000Z");
});

test("not-close problems return the next day", () => {
  assert.equal(getNextReviewDate("not_close", START).toISOString(), "2026-07-23T15:30:00.000Z");
});

test("unknown outcomes are rejected", () => {
  assert.throws(() => getNextReviewDate("maybe", START), /Unknown attempt outcome/);
});
