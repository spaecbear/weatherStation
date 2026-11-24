import { describe, expect, it } from "vitest";
import {
  addDays, applyRep, currentRating, currentStreak, dailyNumber, dailyResult, generateDailyDay, hasPlayedDaily,
  isCareerRetired, newCareer, newDailyState, nextCareerDay, playCareerDay, RATING, shareCard, submitDaily, succeed,
  townTalk, type CareerState, type Day, type Step,
} from "../src/engine";

const D0 = "2026-11-01";
const callsFor = (day: Day, p: Step) => Object.fromEntries(day.questions.map((q) => [q.id, p])) as Record<string, Step>;

/** Force a career's rating (as if earned) on a given date. */
function withRating(c: CareerState, rating: number, date: string): CareerState {
  return { ...c, forecaster: { ...c.forecaster, ratingAtLastPlay: rating, lastPlayedDate: date } };
}

/** Bold calls that are guaranteed wrong, to drive a forecaster into retirement. */
function wrongCalls(c: CareerState): Record<string, Step> {
  const day = nextCareerDay(c);
  const probe = playCareerDay(c, callsFor(day, 0.5), D0);
  return Object.fromEntries(probe.result.resolution.results.map((r) => [r.questionId, r.outcome ? 0.1 : 0.9])) as Record<string, Step>;
}

describe("daily", () => {
  it("numbering and seed come from the UTC date", () => {
    expect(dailyNumber("2026-01-01")).toBe(1);
    expect(dailyNumber("2026-05-22")).toBe(142);
    expect(generateDailyDay("2026-05-22")).toEqual(generateDailyDay("2026-05-22"));
  });
  it("one attempt per day", () => {
    const day = generateDailyDay(D0);
    const s = submitDaily(newDailyState(), D0, callsFor(day, 0.7));
    expect(hasPlayedDaily(s, D0)).toBe(true);
    expect(() => submitDaily(s, D0, callsFor(day, 0.3))).toThrow(/already/);
    expect(dailyResult(s, D0)!.result.score.questions.every((q) => q.forecast === 0.7)).toBe(true);
  });
  it("streak grows on consecutive days, shows 0 after a miss, restarts at 1", () => {
    let s = newDailyState();
    for (let i = 0; i < 3; i++) {
      const d = addDays(D0, i);
      s = submitDaily(s, d, callsFor(generateDailyDay(d), 0.5));
    }
    expect(s.streak).toBe(3);
    expect(currentStreak(s, addDays(D0, 3))).toBe(3); // haven't played today yet
    expect(currentStreak(s, addDays(D0, 4))).toBe(0); // missed a whole day
    s = submitDaily(s, addDays(D0, 4), callsFor(generateDailyDay(addDays(D0, 4)), 0.5));
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(3);
  });
  it("share card: number, emoji grid, x/3, bold count; never the calls", () => {
    // Find a perfect day with 2 bold calls.
    for (let i = 0; i < 200; i++) {
      const date = addDays("2026-03-01", i);
      const day = generateDailyDay(date);
      const probe = dailyResult(submitDaily(newDailyState(), date, callsFor(day, 0.5)), date)!;
      const outcomes = probe.result.resolution.results.map((r) => r.outcome);
      const steps: Step[] = outcomes.map((o, k) => (k < 2 ? (o ? 0.9 : 0.1) : o ? 0.7 : 0.3));
      const calls = Object.fromEntries(day.questions.map((q, k) => [q.id, steps[k]!])) as Record<string, Step>;
      const { result } = dailyResult(submitDaily(newDailyState(), date, calls), date)!;
      const card = shareCard(date, day, result);
      const lines = card.split("\n");
      expect(lines[0]).toBe(`Weather Station #${dailyNumber(date)}`);
      expect(lines[1]).toMatch(/ 3\/3 Perfect Forecast$/);
      expect(lines[2]).toBe("Bold calls: 2");
      expect(card).not.toMatch(/%|0\.\d/);
      expect(lines[1]!.startsWith("🟩🟩🟩")).toBe(true);
      // spoiler-free: no weather emoji, and the same card whatever the weather did
      expect(card).not.toMatch(/[☀🌧🌦🌤🔥☁💨🍃🌫🌅🧊🌱❄🌈🌌🌑⛈🌥]/u);
      const flipped = { ...result, score: { ...result.score, questions: result.score.questions.map((q) => ({ ...q, outcome: !q.outcome, forecast: ({ 0.1: 0.9, 0.3: 0.7, 0.5: 0.5, 0.7: 0.3, 0.9: 0.1 } as Record<number, Step>)[q.forecast]! })) } };
      expect(shareCard(date, day, flipped)).toBe(card);
      return;
    }
  });
});

describe("career", () => {
  const fresh = () => newCareer({ name: "Ada", hardcore: false, today: D0, seedBase: 99 });

  it("starts at 500 and commits a played day", () => {
    const c = fresh();
    expect(currentRating(c, D0)).toBe(500);
    const out = playCareerDay(c, callsFor(nextCareerDay(c), 0.5), D0);
    expect(out.ratingAfter).toBe(502); // trickle only
    expect(out.career.forecaster.dayCount).toBe(1);
    expect(out.career.forecaster.history).toHaveLength(1);
    // the next day is a different, deterministic day
    expect(nextCareerDay(out.career).seed).not.toBe(nextCareerDay(c).seed);
    expect(nextCareerDay(out.career)).toEqual(nextCareerDay(playCareerDay(c, callsFor(nextCareerDay(c), 0.5), D0).career));
  });

  it("decay on open with a mocked clock: grace day, -5/day, floor, idempotent", () => {
    const c = withRating(fresh(), 400, D0);
    expect(currentRating(c, addDays(D0, 1))).toBe(400);
    expect(currentRating(c, addDays(D0, 2))).toBe(400); // grace
    expect(currentRating(c, addDays(D0, 3))).toBe(395);
    expect(currentRating(c, addDays(D0, 3))).toBe(395); // reopening doesn't double-charge
    expect(currentRating(c, addDays(D0, 400))).toBe(300);
    expect(isCareerRetired(c, addDays(D0, 4000))).toBe(false);
  });

  it("playing after an absence applies decay first, then rep", () => {
    const c = withRating(fresh(), 400, D0);
    const today = addDays(D0, 12); // 11 missed, 10 charged → 350
    const out = playCareerDay(c, callsFor(nextCareerDay(c), 0.5), today);
    expect(out.ratingBefore).toBe(350);
    expect(out.ratingAfter).toBe(352);
    expect(currentRating(out.career, addDays(today, 1))).toBe(352);
  });

  it("town talk: no numbers, quiet when nothing happened", () => {
    const c = withRating(fresh(), 500, D0);
    expect(townTalk(c, addDays(D0, 1))).toBeNull();
    expect(townTalk(c, addDays(D0, 2))).toMatch(/quiet/);
    expect(townTalk(c, addDays(D0, 4))).toMatch(/TV guy/);
    for (const n of [2, 4, 10, 30, 300]) expect(townTalk(c, addDays(D0, n)) ?? "").not.toMatch(/\d/);
  });

  it("retirement after a scored day at 150 or below", () => {
    const c = withRating(fresh(), 210, D0);
    const out = playCareerDay(c, wrongCalls(c), D0);
    expect(out.ratingAfter).toBeLessThanOrEqual(RATING.retirementAt);
    expect(out.retired).toBe(true);
    expect(() => playCareerDay(out.career, wrongCalls(out.career), D0)).toThrow(/retired/);
  });

  it("succession keeps journal + wall, resets forecaster, equipment, money, trust", () => {
    let c = withRating(fresh(), 210, D0);
    c = { ...c, journal: { swallowsLow: { samples: 40, agreed: 30 } }, equipment: ["upstreamRadio"], brokenEquipment: ["radar"], money: 120, trust: { ...c.trust, farmer: 3 } };
    const out = playCareerDay(c, wrongCalls(c), D0);
    expect(() => succeed(c, "Bram", D0)).toThrow(); // not retired yet
    const next = succeed(out.career, "Bram", addDays(D0, 1))!;
    expect(next.generation).toBe(2);
    expect(next.forecaster.name).toBe("Bram");
    expect(currentRating(next, addDays(D0, 1))).toBe(500);
    expect(next.forecaster.dayCount).toBe(0);
    expect(next.journal).toEqual(out.career.journal); // kept as-is
    expect(next.journal.swallowsLow!.samples).toBeGreaterThanOrEqual(40);
    expect(next.calibration).toEqual(out.career.calibration);
    expect(next.equipment).toEqual([]);
    expect(next.brokenEquipment).toEqual([]);
    expect(next.money).toBe(0);
    expect(Object.values(next.trust).every((t) => t === 0.5)).toBe(true); // wary of the apprentice
    expect(next.historyWall).toHaveLength(1);
    expect(next.historyWall[0]).toMatchObject({ name: "Ada", generation: 1, days: 1 });
    expect(next.historyWall[0]!.howWentOut).toMatch(/Retired by the council after 1 day\./);
    // the apprentice gets fresh days, not a replay of Ada's
    expect(nextCareerDay(next).seed).not.toBe(nextCareerDay(fresh()).seed);
  });

  it("hardcore: full wipe on retirement", () => {
    const c = withRating({ ...fresh(), hardcore: true, journal: { pineCones: { samples: 50, agreed: 40 } } }, 210, D0);
    const out = playCareerDay(c, wrongCalls(c), D0);
    expect(succeed(out.career, "Bram", D0)).toBeNull();
  });

  it("rating clamps", () => expect(applyRep(995, 114)).toBe(1000));
});
