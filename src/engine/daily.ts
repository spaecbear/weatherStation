import { DAILY } from "./config";
import { addDays, daysBetween } from "./dates";
import { generateDailyDay, playDay, type PlayResult } from "./day";
import { isBold, isCorrectSide } from "./scoring";
import type { Day, QuestionType, Step } from "./types";

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

/** Streak as shown today: it survives until a full UTC day is missed. */
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

const OUTCOME_EMOJI: Record<QuestionType, [yes: string, no: string]> = {
  rainToday: ["🌧️", "☀️"],
  rainBeforeNoon: ["🌦️", "🌤️"],
  highAbove: ["🔥", "☁️"],
  windAbove: ["💨", "🍃"],
  fogAtDawn: ["🌫️", "🌅"],
};

/** Clipboard share text. Shows what the weather did and how many calls landed, never the calls. */
export function shareCard(date: string, day: Day, result: PlayResult): string {
  const outcomes = new Map(result.resolution.results.map((r) => [r.questionId, r.outcome]));
  const grid = day.questions.map((q) => OUTCOME_EMOJI[q.type][outcomes.get(q.id) ? 0 : 1]).join("");
  const qs = result.score.questions;
  const right = qs.filter((q) => isCorrectSide(q.forecast, q.outcome)).length;
  const bold = qs.filter((q) => isBold(q.forecast)).length;
  const verdict = result.score.perfectBonus > 0 ? "Perfect Forecast" : "";
  return [
    `Weather Station #${dailyNumber(date)}`,
    `${grid} ${right}/${qs.length}${verdict ? ` ${verdict}` : ""}`,
    `Bold calls: ${bold}`,
  ].join("\n");
}
