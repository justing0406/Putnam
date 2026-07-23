import { OUTCOMES } from "./constants.js";

export const REVIEW_INTERVAL_DAYS = Object.freeze({
  [OUTCOMES.SOLVED]: 21,
  [OUTCOMES.ALMOST]: 7,
  [OUTCOMES.NOT_CLOSE]: 1,
});

export function getReviewIntervalDays(outcome) {
  const days = REVIEW_INTERVAL_DAYS[outcome];
  if (!days) {
    throw new TypeError(`Unknown attempt outcome: ${outcome}`);
  }
  return days;
}

export function getNextReviewDate(outcome, attemptedAt = new Date()) {
  const start = attemptedAt instanceof Date ? attemptedAt : new Date(attemptedAt);
  if (Number.isNaN(start.getTime())) {
    throw new TypeError("attemptedAt must be a valid date");
  }

  const result = new Date(start.getTime());
  result.setUTCDate(result.getUTCDate() + getReviewIntervalDays(outcome));
  return result;
}
