import { describe, expect, it } from "vitest";
import {
  applyCareerResult, applyDecay, dailySeed, FORECAST_STEPS, gaussian, generateDailyDay, generateDay, getSignals,
  isRetired, isValidStep, mulberry32, perfectDayBonus, pick, playDay, QUESTION_TYPES, repForCall, resolveDay,
  scoreDay, seasonForIndex, shuffle, SOURCES, STARTING_SOURCES, stakePreview, type Day, type SourceId, type Step,
} from "../src/engine";

const ALL_SOURCES = Object.keys(SOURCES) as SourceId[];

describe("rng", () => {
  it("same seed, same sequence", () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });
  it("dailySeed is stable and date-sensitive", () => {
    expect(dailySeed("2026-11-23")).toBe(dailySeed("2026-11-23"));
    expect(dailySeed("2026-11-23")).not.toBe(dailySeed("2026-11-24"));
    expect(() => dailySeed("23/11/2026")).toThrow();
  });
  it("helpers are deterministic and well-formed", () => {
    expect(shuffle(mulberry32(1), [1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(shuffle(mulberry32(1), [1, 2, 3, 4, 5])).toEqual(shuffle(mulberry32(1), [1, 2, 3, 4, 5]));
    expect(["a", "b"]).toContain(pick(mulberry32(3), ["a", "b"]));
    const r = mulberry32(9);
    const xs = Array.from({ length: 20000 }, () => gaussian(r));
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(Math.abs(mean)).toBeLessThan(0.03);
  });
});

describe("determinism", () => {
  it("same seed gives identical days, signals and outcomes", () => {
    const a = generateDailyDay("2026-11-23"), b = generateDailyDay("2026-11-23");
    expect(a).toEqual(b);
    expect(getSignals(a, ALL_SOURCES)).toEqual(getSignals(b, ALL_SOURCES));
    expect(resolveDay(a)).toEqual(resolveDay(b));
  });
  it("different dates give different days", () => {
    expect(generateDailyDay("2026-11-23").state).not.toEqual(generateDailyDay("2026-11-24").state);
  });
  it("signal readings don't depend on which other sources are unlocked", () => {
    const d = generateDailyDay("2026-07-04");
    const all = getSignals(d, ALL_SOURCES).find((s) => s.source === "barometer");
    const one = getSignals(d, ["barometer"])[0];
    expect(one).toEqual(all);
  });
});

describe("signals", () => {
  it("returns only unlocked sources; upgrades locked at start", () => {
    const d = generateDailyDay("2026-03-01");
    expect(getSignals(d, STARTING_SOURCES).map((s) => s.source).sort()).toEqual(
      ["barometer", "cowsLyingDown", "farmersKnee", "hygrometer", "skyReading"],
    );
    expect(STARTING_SOURCES).not.toContain("upstreamRadio");
    expect(STARTING_SOURCES).not.toContain("weatherBalloon");
  });
  it("low-noise sources track their variable", () => {
    for (let i = 0; i < 50; i++) {
      const d = generateDay(i * 7919, "autumn");
      const [baro] = getSignals(d, ["barometer"]);
      expect(Math.abs(baro!.value - d.state.pressureTrend)).toBeLessThan(5 * SOURCES.barometer.noiseSd);
    }
  });
});

describe("questions", () => {
  it("exactly 3 unique types with valid probabilities", () => {
    for (let i = 0; i < 500; i++) {
      const d = generateDay(i, "spring");
      expect(d.questions).toHaveLength(3);
      expect(new Set(d.questions.map((q) => q.type)).size).toBe(3);
      for (const q of d.questions) {
        expect(QUESTION_TYPES).toContain(q.type);
        expect(q.trueProbability).toBeGreaterThan(0);
        expect(q.trueProbability).toBeLessThan(1);
      }
    }
  });
});

describe("forecast input", () => {
  it("accepts only the five steps", () => {
    for (const s of FORECAST_STEPS) expect(isValidStep(s)).toBe(true);
    for (const bad of [0, 1, 0.2, 0.55, 0.69999, -0.1, NaN, "0.5", undefined]) expect(isValidStep(bad)).toBe(false);
  });
  it("scoring rejects invalid steps", () => {
    expect(() => repForCall(0.6 as Step, true)).toThrow();
    const d = generateDay(1, "summer");
    const f = Object.fromEntries(d.questions.map((q) => [q.id, 0.5]));
    f[d.questions[0]!.id] = 0.8;
    expect(() => playDay(d, f, "zen")).toThrow(/Invalid forecast step/);
  });
});

describe("scoring table", () => {
  const table: [Step, number, number][] = [
    // call, rep if event happens, rep if it doesn't
    [0.5, 0, 0],
    [0.7, 16, -24],
    [0.3, -24, 16],
    [0.9, 24, -56],
    [0.1, -56, 24],
  ];
  it.each(table)("call %s: yes %s / no %s", (p, yes, no) => {
    expect(repForCall(p, true)).toBe(yes);
    expect(repForCall(p, false)).toBe(no);
    expect(stakePreview(p)).toEqual({ ifYes: yes, ifNo: no });
  });
  it("design-doc honesty example: true 64%", () => {
    const ev = (p: Step) => 0.64 * repForCall(p, true) + 0.36 * repForCall(p, false);
    expect(ev(0.5)).toBeCloseTo(0);
    expect(ev(0.7)).toBeCloseTo(1.6);
    expect(ev(0.9)).toBeCloseTo(-4.8);
  });
});

describe("perfect day bonus", () => {
  const right = (p: Step) => ({ forecast: p, outcome: p > 0.5 });
  it.each([
    [[0.7, 0.3, 0.7], 10],
    [[0.9, 0.3, 0.7], 20],
    [[0.9, 0.1, 0.7], 30],
    [[0.9, 0.1, 0.9], 40],
  ] as [Step[], number][])("%j → %i", (calls, bonus) => {
    expect(perfectDayBonus(calls.map(right))).toBe(bonus);
  });
  it("blocked by any 0.5", () => {
    expect(perfectDayBonus([right(0.9), right(0.9), { forecast: 0.5, outcome: true }])).toBe(0);
  });
  it("blocked by any wrong side", () => {
    expect(perfectDayBonus([right(0.9), right(0.9), { forecast: 0.7, outcome: false }])).toBe(0);
  });
});

describe("day totals and modes", () => {
  function maxDay(mode: "daily" | "career" | "zen") {
    const d: Day = generateDay(123, "winter");
    const { resolution } = playDay(d, Object.fromEntries(d.questions.map((q) => [q.id, 0.5])), mode);
    const outcomes = Object.fromEntries(resolution.results.map((r) => [r.questionId, r.outcome]));
    const forecasts = Object.fromEntries(d.questions.map((q) => [q.id, outcomes[q.id] ? 0.9 : 0.1]));
    return scoreDay(d.questions, forecasts, outcomes, mode);
  }
  it("max day is +114 in career", () => expect(maxDay("career").total).toBe(114));
  it("daily and zen get no trickle", () => {
    expect(maxDay("daily").total).toBe(112);
    expect(maxDay("zen").total).toBe(112);
  });
  it("career trickle applies even on an all-50% day", () => {
    const d = generateDay(5, "spring");
    const { score } = playDay(d, Object.fromEntries(d.questions.map((q) => [q.id, 0.5])), "career");
    expect(score.total).toBe(2);
  });
});

describe("resolution", () => {
  it("rain before noon never happens without rain today; closeness in [0,1]", () => {
    for (let i = 0; i < 2000; i++) {
      const day = generateDay(i, "autumn");
      const r = resolveDay(day);
      for (const x of r.results) {
        expect(x.closeness).toBeGreaterThanOrEqual(0);
        expect(x.closeness).toBeLessThanOrEqual(1);
      }
      const rt = r.results.find((x) => x.questionId === "rainToday");
      const rb = r.results.find((x) => x.questionId === "rainBeforeNoon");
      if (rt && rb && rb.outcome) expect(rt.outcome).toBe(true);
    }
  });
  it("timeline covers 6am–9pm and agrees with outcomes", () => {
    for (let i = 0; i < 2000; i++) {
      const d = generateDay(i * 31, seasonForIndex(i));
      const { results, timeline } = resolveDay(d);
      expect(timeline.map((h) => h.hour)).toEqual(Array.from({ length: 16 }, (_, k) => k + 6));
      for (const q of d.questions) {
        const o = results.find((r) => r.questionId === q.id)!.outcome;
        if (q.type === "rainToday") expect(timeline.some((h) => h.rain > 0)).toBe(o);
        if (q.type === "rainBeforeNoon") expect(timeline.some((h) => h.rain > 0 && h.hour < 12)).toBe(o);
        if (q.type === "highAbove") expect(Math.max(...timeline.map((h) => h.temperature)) > q.threshold!).toBe(o);
        if (q.type === "windAbove") expect(Math.max(...timeline.map((h) => h.wind)) > q.threshold!).toBe(o);
        if (q.type === "fogAtDawn") expect(timeline[0]!.fog).toBe(o);
      }
    }
  });
  it("outcome frequency matches true probability (calibration)", () => {
    let sumP = 0, hits = 0, n = 0;
    for (let i = 0; i < 5000; i++) {
      const d = generateDay(1_000_000 + i, "spring");
      const r = resolveDay(d);
      for (const q of d.questions) {
        sumP += q.trueProbability;
        hits += r.results.find((x) => x.questionId === q.id)!.outcome ? 1 : 0;
        n++;
      }
    }
    expect(Math.abs(hits / n - sumP / n)).toBeLessThan(0.015);
  });
});

describe("rating, decay, retirement", () => {
  it("grace day: missing one day costs nothing", () => {
    expect(applyDecay(500, "2026-11-01", "2026-11-02")).toBe(500); // played yesterday
    expect(applyDecay(500, "2026-11-01", "2026-11-03")).toBe(500); // missed 1
    expect(applyDecay(500, "2026-11-01", "2026-11-04")).toBe(495); // missed 2
    expect(applyDecay(500, "2026-11-01", "2026-11-11")).toBe(460); // missed 9 → 8 charged
  });
  it("floors at 300", () => {
    expect(applyDecay(320, "2026-01-01", "2026-12-31")).toBe(300);
    expect(applyDecay(1000, "2020-01-01", "2026-12-31")).toBe(300);
  });
  it("no decay at or below 300", () => {
    expect(applyDecay(300, "2026-01-01", "2026-12-31")).toBe(300);
    expect(applyDecay(200, "2026-01-01", "2026-12-31")).toBe(200);
  });
  it("decay never causes retirement", () => {
    for (const r of [151, 200, 301, 500, 1000]) expect(isRetired(applyDecay(r, "2000-01-01", "2026-12-31"))).toBe(false);
  });
  it("retirement at exactly 150", () => {
    expect(isRetired(151)).toBe(false);
    expect(isRetired(150)).toBe(true);
    expect(isRetired(0)).toBe(true);
  });
  it("career result clamps to 0..1000 and flags retirement", () => {
    const s = (total: number) => ({ questions: [], perfectBonus: 0, trickle: 0, total });
    expect(applyCareerResult(990, s(114)).rating).toBe(1000);
    expect(applyCareerResult(206, s(-56))).toEqual({ rating: 150, retired: true });
    expect(applyCareerResult(20, s(-56)).rating).toBe(0);
  });
});
