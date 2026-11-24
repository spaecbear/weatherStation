import { describe, expect, it } from "vitest";
import {
  FROST_HIGH, generateDay, makeQuestion, QUESTION_POOLS, QUESTION_TYPES, resolveDay, seasonForIndex, seasonNorms,
  SNOW_HIGH, TIMELINE, type Day, type QuestionType,
} from "../src/engine";

/** A day asking every question type at once (ids are the types). */
function allTypes(seed: number, i: number): Day {
  const d = generateDay(seed, seasonForIndex(i));
  const n = seasonNorms(d.state.season);
  d.questions = QUESTION_TYPES.map((t: QuestionType) =>
    makeQuestion(t, d.state, t === "highAbove" ? Math.round(n.high) : t === "windAbove" ? Math.round(n.wind) : undefined));
  return d;
}

describe("phase 5 question types", () => {
  it("every type is calibrated: outcome frequency ≈ mean stated probability", () => {
    const sumP: Record<string, number> = {}, hits: Record<string, number> = {};
    const N = 12000;
    for (let i = 0; i < N; i++) {
      const d = allTypes(500_000 + i, i);
      const r = resolveDay(d);
      for (const q of d.questions) {
        sumP[q.type] = (sumP[q.type] ?? 0) + q.trueProbability;
        hits[q.type] = (hits[q.type] ?? 0) + (r.results.find((x) => x.questionId === q.id)!.outcome ? 1 : 0);
      }
    }
    for (const t of QUESTION_TYPES) {
      const p = sumP[t]! / N, f = hits[t]! / N;
      // 4 binomial standard errors, plus a little for the 2%/98% clamp
      expect(Math.abs(f - p), `${t}: freq ${f.toFixed(3)} vs P ${p.toFixed(3)}`).toBeLessThan(4 * Math.sqrt((p * (1 - p)) / N) + 0.006);
    }
  });

  it("outcomes are mutually consistent and the timeline shows them", () => {
    for (let i = 0; i < 3000; i++) {
      const d = allTypes(i * 7, i);
      const { results, timeline, events } = resolveDay(d);
      const o = (t: QuestionType) => results.find((r) => r.questionId === t)!.outcome;
      if (o("snowToday")) expect(o("rainToday")).toBe(true);
      if (o("snowToday")) expect(o("highAbove") && d.questions.find((q) => q.type === "highAbove")!.threshold! >= SNOW_HIGH).toBe(false);
      if (o("allDaySun")) expect(o("rainToday") || o("fogAtDawn")).toBe(false);
      if (o("doubleRainbow")) expect(o("rainToday")).toBe(true);
      if (o("hundredYearStorm")) expect(o("rainToday")).toBe(true);
      expect(o("frostAtDawn")).toBe(events.high <= FROST_HIGH);
      // timeline
      expect(timeline[0]!.temperature <= 32 + 1e-9).toBe(o("frostAtDawn"));
      expect(timeline.some((h) => h.snow)).toBe(o("snowToday"));
      expect(timeline.some((h) => h.rainbow)).toBe(o("doubleRainbow"));
      expect(timeline[timeline.length - 1]!.aurora ?? false).toBe(o("auroraNight"));
      if (o("allDaySun")) expect(timeline.every((h) => h.rain === 0 && !h.fog)).toBe(true);
      expect(timeline).toHaveLength(TIMELINE.endHour - TIMELINE.startHour + 1);
    }
  });

  it("seasonal pools: no snow in summer, no frost question in summer, 3 unique questions", () => {
    expect(QUESTION_POOLS.summer).not.toContain("snowToday");
    expect(QUESTION_POOLS.summer).not.toContain("frostAtDawn");
    for (let i = 0; i < 400; i++) {
      const d = generateDay(i, seasonForIndex(i));
      expect(new Set(d.questions.map((q) => q.type)).size).toBe(3);
      for (const q of d.questions) expect(QUESTION_POOLS[d.state.season]).toContain(q.type);
    }
  });
});
