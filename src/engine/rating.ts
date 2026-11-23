import { RATING } from "./config";

export const clampRating = (r: number): number => Math.min(RATING.max, Math.max(RATING.min, r));

export const isRetired = (rating: number): boolean => rating <= RATING.retirementAt;

export function applyRep(rating: number, rep: number): number {
  return clampRating(rating + rep);
}

const DAY_MS = 86_400_000;
function utcDayNumber(dateUtc: string): number {
  const t = Date.parse(`${dateUtc}T00:00:00Z`);
  if (Number.isNaN(t)) throw new Error(`Invalid date: ${dateUtc}`);
  return Math.floor(t / DAY_MS);
}

/** Whole days strictly between the last played day and today. */
export function missedDays(lastPlayedDate: string, today: string): number {
  return Math.max(0, utcDayNumber(today) - utcDayNumber(lastPlayedDate) - 1);
}

/**
 * Idle decay, computed on return. Never drops rating below the floor and
 * does nothing at or below it, so idling can never cause retirement.
 */
export function applyDecay(rating: number, lastPlayedDate: string, today: string): number {
  if (rating <= RATING.decayFloor) return rating;
  const charged = Math.max(0, missedDays(lastPlayedDate, today) - RATING.graceDays);
  return Math.max(RATING.decayFloor, rating - charged * RATING.decayPerMissedDay);
}
