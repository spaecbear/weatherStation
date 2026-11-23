import { WEIGHTS, TIMELINE, type Season } from "./config";
import { dailySeed, mulberry32, subSeed } from "./rng";
import { generateQuestions } from "./questions";
import { applyRep, isRetired } from "./rating";
import { scoreDay } from "./scoring";
import type { Day, DayScore, HourSnapshot, Mode, QuestionResolution, Resolution } from "./types";
import { expectedHigh, expectedPeakWind, generateState, logit, pFogAtDawn, pRain, pRainBeforeNoon, seasonForDate } from "./weather";

export function generateDay(seed: number, season: Season, date?: string): Day {
  const state = generateState(mulberry32(subSeed(seed, "state")), season);
  return { date, seed, state, questions: generateQuestions(seed, state) };
}

export function generateDailyDay(dateUtc: string): Day {
  return generateDay(dailySeed(dateUtc), seasonForDate(dateUtc), dateUtc);
}

const EPS = 1e-6;
const roll = (seed: number, label: string) => Math.min(1 - EPS, Math.max(EPS, mulberry32(subSeed(seed, `roll:${label}`))()));

/** 1 when the roll landed right on the flip point, 0 when as far as possible. */
function closeness(u: number, p: number): number {
  const dist = Math.abs(u - p);
  const room = u < p ? p : 1 - p;
  return Math.max(0, Math.min(1, 1 - dist / room));
}

/**
 * Resolve the day honestly: each event is `u < trueProbability` with a seeded uniform.
 * Rain today / rain before noon share one roll (P(before noon) ≤ P(rain)) so they stay consistent.
 * Continuous values (high temp, peak wind) are the logistic quantile of that same roll,
 * so `high > threshold` ⇔ `u < P(highAbove)` exactly.
 */
export function resolveDay(day: Day): Resolution {
  const s = day.state;
  const uRain = roll(day.seed, "rain");
  const uHigh = roll(day.seed, "high");
  const uWind = roll(day.seed, "wind");
  const uFog = roll(day.seed, "fog");

  const pR = pRain(s);
  const pRbn = pRainBeforeNoon(s);
  const pF = pFogAtDawn(s);
  const rains = uRain < pR;
  const rainsBeforeNoon = uRain < pRbn;
  const foggy = uFog < pF;
  const high = expectedHigh(s) + WEIGHTS.high.spread * logit(1 - uHigh);
  const peakWind = Math.max(0, expectedPeakWind(s) + WEIGHTS.wind.spread * logit(1 - uWind));

  const results: QuestionResolution[] = day.questions.map((q) => {
    switch (q.type) {
      case "rainToday":
        return { questionId: q.id, outcome: rains, closeness: closeness(uRain, pR) };
      case "rainBeforeNoon":
        return { questionId: q.id, outcome: rainsBeforeNoon, closeness: closeness(uRain, pRbn) };
      case "fogAtDawn":
        return { questionId: q.id, outcome: foggy, closeness: closeness(uFog, pF) };
      case "highAbove":
        return { questionId: q.id, outcome: high > q.threshold!, closeness: closeness(uHigh, q.trueProbability) };
      case "windAbove":
        return { questionId: q.id, outcome: peakWind > q.threshold!, closeness: closeness(uWind, q.trueProbability) };
    }
  });

  return { results, timeline: buildTimeline(day, { rains, rainsBeforeNoon, foggy, high, peakWind }) };
}

function buildTimeline(
  day: Day,
  ev: { rains: boolean; rainsBeforeNoon: boolean; foggy: boolean; high: number; peakWind: number },
): HourSnapshot[] {
  const s = day.state;
  const { startHour, endHour, peakTempHour, dawnLowOffset } = TIMELINE;
  const clampH = (h: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(h)));

  let rainStart = Infinity;
  let rainEnd = -Infinity;
  if (ev.rains) {
    rainStart = ev.rainsBeforeNoon ? clampH(s.frontArrivalHour, startHour, 11) : clampH(s.frontArrivalHour, 12, endHour);
    rainEnd = Math.min(endHour + 1, rainStart + 1 + Math.round(s.frontStrength * 6));
  }
  const rainRate = 0.5 + 4 * s.frontStrength;
  const windPeakHour = ev.rains ? rainStart : peakTempHour;
  const low = ev.high - dawnLowOffset;

  const out: HourSnapshot[] = [];
  for (let h = startHour; h <= endHour; h++) {
    // Diurnal curve: 0 at dawn, exactly 1 at peakTempHour, easing after.
    const shape = h <= peakTempHour
      ? Math.sin(((h - startHour) / (peakTempHour - startHour)) * (Math.PI / 2))
      : 1 - 0.5 * ((h - peakTempHour) / (endHour - peakTempHour));
    const raining = h >= rainStart && h < rainEnd;
    const hoursToRain = rainStart - h;
    let cloud = Math.min(0.9, 0.2 + 0.6 * s.humidity * s.frontStrength + 0.2 * s.humidity);
    if (raining) cloud = 1;
    else if (hoursToRain > 0 && hoursToRain <= 3) cloud = Math.max(cloud, 1 - hoursToRain * 0.15);
    const windShape = Math.max(0.4, 1 - Math.abs(h - windPeakHour) / 8);
    out.push({
      hour: h,
      cloudCover: +cloud.toFixed(2),
      rain: raining ? rainRate : 0,
      temperature: low + (ev.high - low) * shape,
      wind: ev.peakWind * windShape,
      fog: ev.foggy && h <= 8,
    });
  }
  return out;
}

export interface PlayResult {
  resolution: Resolution;
  score: DayScore;
}

export function playDay(day: Day, forecasts: Readonly<Record<string, number>>, mode: Mode): PlayResult {
  const resolution = resolveDay(day);
  const outcomes = Object.fromEntries(resolution.results.map((r) => [r.questionId, r.outcome]));
  return { resolution, score: scoreDay(day.questions, forecasts, outcomes, mode) };
}

/** Mode rules: daily = score only; career = rating/trickle/decay/retirement; zen = nothing persisted. */
export const MODE_RULES: Record<Mode, { affectsRating: boolean; trickle: boolean; persists: boolean }> = {
  daily: { affectsRating: false, trickle: false, persists: true },
  career: { affectsRating: true, trickle: true, persists: true },
  zen: { affectsRating: false, trickle: false, persists: false },
};

export function applyCareerResult(rating: number, score: DayScore): { rating: number; retired: boolean } {
  const next = applyRep(rating, score.total);
  return { rating: next, retired: isRetired(next) };
}
