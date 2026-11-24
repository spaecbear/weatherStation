import { DAILY } from "./config";
import { addDays, daysBetween } from "./dates";
import { generateDailyDay, playDay, type PlayResult } from "./day";
import { isBold, isCorrectSide } from "./scoring";
import type { Day, Step } from "./types";
import { addToCalibration, emptyCalibration, type Calibration } from "./progression";

export function dailyNumber(dateUtc: string): number {
  return daysBetween(DAILY.epoch, dateUtc) + 1;
}

export interface DailyEntry {
  calls: Record<string, Step>;
}

export interface DailyState {
  version: 1;
  /** Submitted calls keyed by date. Results are recomputed from the seed. */
  entries: Record<string, DailyEntry>;
  streak: number;
  bestStreak: number;
  lastPlayedDate: string | null;
}

export const newDailyState = (): DailyState => ({ version: 1, entries: {}, streak: 0, bestStreak: 0, lastPlayedDate: null });

export const hasPlayedDaily = (s: DailyState, today: string): boolean => today in s.entries;

/** Streak as shown today: it survives until a whole calendar day is missed. */
export function currentStreak(s: DailyState, today: string): number {
  if (!s.lastPlayedDate) return 0;
  const gap = daysBetween(s.lastPlayedDate, today);
  return gap <= 1 ? s.streak : 0;
}

/** Lock in today's daily. Throws if already played: one attempt per day. */
export function submitDaily(s: DailyState, today: string, calls: Record<string, Step>): DailyState {
  if (hasPlayedDaily(s, today)) throw new Error(`Daily for ${today} already submitted`);
  const streak = s.lastPlayedDate === addDays(today, -1) ? s.streak + 1 : 1;
  return {
    ...s,
    entries: { ...s.entries, [today]: { calls: { ...calls } } },
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    lastPlayedDate: today,
  };
}

export function dailyResult(s: DailyState, date: string): { day: Day; result: PlayResult } | null {
  const e = s.entries[date];
  if (!e) return null;
  const day = generateDailyDay(date);
  return { day, result: playDay(day, e.calls, "daily") };
}

/** One square per call: right side, wrong side, or a 50% pass. Says nothing about the weather itself. */
export const SHARE_SQUARES = { right: "🟩", wrong: "🟥", pass: "⬜" } as const;

/**
 * Clipboard share text. Spoiler-free: shows how many calls landed and how bold
 * they were, never what the weather did or what the calls were.
 */
export function shareCard(date: string, day: Day, result: PlayResult): string {
  const qs = result.score.questions;
  const grid = qs.map((q) => (q.forecast === 0.5 ? SHARE_SQUARES.pass : isCorrectSide(q.forecast, q.outcome) ? SHARE_SQUARES.right : SHARE_SQUARES.wrong)).join("");
  const right = qs.filter((q) => isCorrectSide(q.forecast, q.outcome)).length;
  const bold = qs.filter((q) => isBold(q.forecast)).length;
  const verdict = result.score.perfectBonus > 0 ? "Perfect Forecast" : "";
  return [
    `Weather Station #${dailyNumber(date)}`,
    `${grid} ${right}/${qs.length}${verdict ? ` ${verdict}` : ""}`,
    `Bold calls: ${bold}`,
  ].join("\n");
}

/** Calibration counts from every daily played (recomputed from the seeds). */
export function dailyCalibration(s: DailyState): Calibration {
  let cal = emptyCalibration();
  for (const date of Object.keys(s.entries)) cal = addToCalibration(cal, dailyResult(s, date)!.result.score.questions);
  return cal;
}
