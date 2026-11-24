// A signal-reading forecaster: estimates the hidden state from what the station
// shows, then reads probabilities off the same model. Used by the sim to measure
// how much equipment helps (and later by the rival bot).
import { FORECAST_STEPS, SEASON_PARAMS, SOURCES } from "./config";
import { makeQuestion } from "./questions";
import type { Day, HiddenState, Signal, Step } from "./types";

type Est = "pressureTrend" | "humidity" | "frontStrength" | "frontArrivalHour" | "upperWinds" | "tempBaseline";

/** Precision-weighted blend of the seasonal prior and each instrument reading. Folk signs are ignored. */
export function estimateState(day: Day, signals: readonly Signal[]): HiddenState {
  const sp = SEASON_PARAMS[day.state.season];
  const prior: Record<Est, [number, number]> = {
    pressureTrend: sp.pressureTrend,
    humidity: sp.humidity,
    frontStrength: sp.frontStrength,
    frontArrivalHour: [13, 5],
    upperWinds: sp.upperWinds,
    tempBaseline: sp.tempBaseline,
  };
  const est = {} as Record<Est, number>;
  for (const v of Object.keys(prior) as Est[]) {
    let w = 1 / prior[v][1] ** 2;
    let sum = prior[v][0] * w;
    for (const s of signals) {
      if (s.reads !== v || SOURCES[s.source].folk) continue;
      const wi = 1 / s.noiseSd ** 2;
      sum += s.value * wi;
      w += wi;
    }
    est[v] = sum / w;
  }
  return {
    season: day.state.season,
    ...est,
    windSpeed: sp.windSpeed[0], // no instrument reads surface wind directly
  };
}

export const nearestStep = (p: number): Step =>
  FORECAST_STEPS.reduce((best, s) => (Math.abs(s - p) < Math.abs(best - p) ? s : best)) as Step;

/** Calls a reader bot would make from these signals. */
export function readerCalls(day: Day, signals: readonly Signal[]): Record<string, Step> {
  const s = estimateState(day, signals);
  return Object.fromEntries(day.questions.map((q) => [q.id, nearestStep(makeQuestion(q.type, s, q.threshold).trueProbability)]));
}
