import { RATING } from "./config";
import { utcDayNumber } from "./dates";

export const clampRating = (r: number): number => Math.min(RATING.max, Math.max(RATING.min, r));

export const isRetired = (rating: number): boolean => rating <= RATING.retirementAt;

export function applyRep(rating: number, rep: number): number {
  return clampRating(rating + rep);
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
