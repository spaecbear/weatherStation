import { FORECAST_STEPS, SCORING } from "./config";
import type { DayScore, Mode, Question, QuestionScore, Step } from "./types";

export function isValidStep(p: unknown): p is Step {
  return typeof p === "number" && (FORECAST_STEPS as readonly number[]).includes(p);
}

export function assertStep(p: unknown): Step {
  if (!isValidStep(p)) throw new Error(`Invalid forecast step: ${String(p)}. Allowed: ${FORECAST_STEPS.join(", ")}`);
  return p;
}

export const isBold = (p: Step): boolean => p === 0.1 || p === 0.9;

export function repForCall(p: Step, outcome: boolean): number {
  assertStep(p);
  const o = outcome ? 1 : 0;
  const brier = 1 - (p - o) ** 2;
  // Round to 6 places first to strip float noise (e.g. 0.16000000000000003).
  const rep = Math.round(+(SCORING.repScale * (brier - SCORING.brierBaseline)).toFixed(6));
  return rep === 0 ? 0 : rep; // avoid -0
}

/** Stake preview for UI: what each outcome would pay. */
export function stakePreview(p: Step): { ifYes: number; ifNo: number } {
  return { ifYes: repForCall(p, true), ifNo: repForCall(p, false) };
}

export function isCorrectSide(p: Step, outcome: boolean): boolean {
  return p === 0.5 ? false : p > 0.5 === outcome;
}

export function perfectDayBonus(calls: { forecast: Step; outcome: boolean }[]): number {
  if (calls.length === 0 || !calls.every((c) => isCorrectSide(c.forecast, c.outcome))) return 0;
  return SCORING.perfectDayBase + SCORING.perfectDayPerBold * calls.filter((c) => isBold(c.forecast)).length;
}

export function trickleFor(mode: Mode): number {
  return mode === "career" ? SCORING.participationTrickle : 0;
}

export function scoreDay(
  questions: readonly Question[],
  forecasts: Readonly<Record<string, number>>,
  outcomes: Readonly<Record<string, boolean>>,
  mode: Mode,
): DayScore {
  const scored: QuestionScore[] = questions.map((q) => {
    const forecast = assertStep(forecasts[q.id]);
    const outcome = outcomes[q.id];
    if (outcome === undefined) throw new Error(`Missing outcome for ${q.id}`);
    return { questionId: q.id, forecast, outcome, rep: repForCall(forecast, outcome) };
  });
  const perfectBonus = perfectDayBonus(scored);
  const trickle = trickleFor(mode);
  const total = scored.reduce((a, q) => a + q.rep, 0) + perfectBonus + trickle;
  return { questions: scored, perfectBonus, trickle, total };
}
