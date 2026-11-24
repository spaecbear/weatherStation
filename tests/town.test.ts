import { describe, expect, it } from "vitest";
import {
  addDays, buildCareerDay, buy, calendar, canBuy, careerDayAt, careerDaySources, careerLoadout, CAREER, CLIENTS, contractPay,
  FORECAST_STEPS, generateDay, getSignals, makeSeasonCall, newCareer, nextCareerDay, NOTEBOOK, playCareerDay, playDay,
  readerCalls, resolveDay, rivalCalls, SCENES, seasonCallAvailable, seasonCallOffer, seasonForIndex, SPECIALS, subSeed,
  TOWN, trustAfter, type CareerDayOutcome, type CareerState, type EquipmentId, type Step,
} from "../src/engine";

const D0 = "2027-03-01";

/** A bot plays one full in-game year: reads signals, buys kit, makes season calls. */
function playYear(seedBase = 2024): { c: CareerState; days: CareerDayOutcome[] } {
  let c = newCareer({ name: "Ada", hardcore: false, today: D0, seedBase });
  const days: CareerDayOutcome[] = [];
  for (let i = 0; i < TOWN.daysPerYear; i++) {
    const offer = seasonCallAvailable(c);
    if (offer) c = makeSeasonCall(c, (FORECAST_STEPS.reduce((b, s) => (Math.abs(s - offer.trueProbability) < Math.abs(b - offer.trueProbability) ? s : b))) as Step);
    for (const e of ["rainGauge", "upstreamRadio", "weatherBalloon", "radar"] as EquipmentId[]) if (canBuy(c, e)) c = buy(c, e);
    const day = nextCareerDay(c);
    const calls = readerCalls(day, getSignals(day, careerDaySources(c, day), careerLoadout(c).noise));
    const out = playCareerDay(c, calls, addDays(D0, i));
    expect(out.retired).toBe(false);
    days.push(out);
    c = out.career;
  }
  return { c, days };
}

describe("a full in-game year", () => {
  const { c, days } = playYear();

  it("every client posts work, including the fair and the ski lodge", () => {
    const seen = new Set(days.flatMap((d) => d.contracts.map((x) => x.client)));
    expect([...seen].sort()).toEqual(Object.keys(CLIENTS).sort());
  });

  it("all signature days happen in the right season, with headlines", () => {
    const specials = days.map((d, i) => ({ i, sp: nextSpecial(c, i) })).filter((x) => x.sp);
    expect(specials.map((x) => x.sp).sort()).toEqual(SPECIALS.map((s) => s.id).sort());
    for (const { i, sp } of specials) {
      expect(calendar(i).season).toBe(SPECIALS.find((s) => s.id === sp)!.season);
      expect(days[i]!.story.headlines.length).toBeGreaterThan(0);
    }
  });

  it("four long-range season calls are made and resolved", () => {
    const resolved = days.filter((d) => d.seasonCallResult);
    expect(resolved).toHaveLength(4);
  });

  it("the chalkboard tracks you vs the rival for each season", () => {
    expect(c.chalkHistory).toHaveLength(3);
    expect(c.chalk.seasonIndex).toBe(3);
    for (const b of [...c.chalkHistory, c.chalk]) expect(b.youWins + b.rivalWins + b.ties).toBe(CAREER.daysPerSeason);
  });

  it("at least one story beat per season, the finale lands, the notebook fills", () => {
    for (let s = 0; s < 4; s++) {
      const beats = days.slice(s * 28, s * 28 + 28).reduce((a, d) => a + d.story.scenes.length + d.story.pages.length, 0)
        + days.slice(s * 28, s * 28 + 28).filter((d, k) => nextSpecial(c, s * 28 + k)).length; // signature-day intro scene
      expect(beats, `season ${s}`).toBeGreaterThan(0);
    }
    expect(c.seenScenes).toContain("finale");
    expect(c.seenScenes).toContain("skeptic-4");
    expect(c.notebook.length).toBeGreaterThanOrEqual(NOTEBOOK.filter((p) => p.unlock.days !== undefined).length);
    expect(c.seenScenes.length).toBeGreaterThan(4);
    for (const id of c.seenScenes) expect(SCENES[id]).toBeDefined();
  });

  it("long shots show up during the year", () => {
    const longShots = days.flatMap((d, i) => careerDayAt(c, i).questions.filter((q) => q.longShot));
    expect(longShots.length).toBeGreaterThan(0);
  });

  it("the rival makes a decent but imperfect showing", () => {
    const rival = days.reduce((a, d) => a + d.rival.rep, 0) / days.length;
    expect(rival).toBeGreaterThan(0);
    expect(rival).toBeLessThan(40);
  });
});

function nextSpecial(c: CareerState, i: number) {
  return careerDayAt(c, i).special ?? null;
}

describe("town rules", () => {
  it("career days are deterministic and independent of trust or money", () => {
    const a = newCareer({ name: "A", hardcore: false, today: D0, seedBase: 9 });
    const b = { ...a, money: 9999, trust: { ...a.trust, farmer: 5 } };
    for (let i = 0; i < 60; i++) expect(careerDayAt(a, i)).toEqual(careerDayAt(b, i));
    expect(buildCareerDay(123, 5)).toEqual(buildCareerDay(123, 5));
  });

  it("contract pay keeps scoring proper: the honest step maximises expected pay", () => {
    for (const p of [0.1, 0.25, 0.42, 0.5, 0.6, 0.78, 0.93]) {
      const ev = (s: Step) => p * contractPay(40, 2, repFor(s, true)) + (1 - p) * contractPay(40, 2, repFor(s, false));
      const best = (FORECAST_STEPS as readonly Step[]).reduce((b, s) => (ev(s) > ev(b) + 1e-9 ? s : b));
      const nearest = (FORECAST_STEPS as readonly Step[]).reduce((b, s) => (Math.abs(s - p) < Math.abs(b - p) ? s : b));
      expect(Math.abs(best - nearest), `p=${p}`).toBeLessThanOrEqual(0.2 + 1e-9);
      expect(ev(nearest)).toBeGreaterThanOrEqual(ev(best) - 1.5); // within rounding of the best
      for (const s of FORECAST_STEPS) expect(contractPay(40, 2, repFor(s as Step, true))).toBeGreaterThanOrEqual(0);
    }
  });

  it("trust: hits build it, misses cost more for the fleet and wedding planner", () => {
    expect(trustAfter("farmer", 1, 24)).toBe(2);
    expect(trustAfter("farmer", 1, -24)).toBe(0);
    expect(trustAfter("fleet", 3, -24)).toBe(1.5);
    expect(trustAfter("wedding", 3, -24)).toBe(1);
    expect(trustAfter("skeptic", 5, 24)).toBe(5);
    expect(trustAfter("skeptic", 1, 0)).toBe(1);
  });

  it("the rival plays a reasonable game on ordinary days", () => {
    let rival = 0, n = 2000;
    for (let i = 0; i < n; i++) {
      const d = generateDay(subSeed(5, `r${i}`), seasonForIndex(i));
      rival += playDay(d, rivalCalls(d), "daily").score.total;
    }
    expect(rival / n).toBeGreaterThan(3);
  });

  it("season calls are honest: outcomes match the stated probability", () => {
    let sumP = 0, hits = 0;
    const N = 240;
    for (let s = 0; s < N; s++) {
      const dayAt = (i: number) => buildCareerDay(subSeed(777, `sc:${s}:${i}`), i);
      const seasonIndex = s % 4;
      const fromDay = s % TOWN.seasonCallDays;
      const offer = seasonCallOffer((i) => dayAt(i), seasonIndex, fromDay);
      const start = seasonIndex * CAREER.daysPerSeason;
      let rainy = 0;
      for (let i = 0; i < CAREER.daysPerSeason; i++) rainy += resolveDay(dayAt(start + i)).events.rains ? 1 : 0;
      sumP += offer.trueProbability;
      hits += rainy > offer.threshold ? 1 : 0;
      expect(offer.trueProbability).toBeGreaterThan(0.2);
      expect(offer.trueProbability).toBeLessThan(0.8);
    }
    expect(Math.abs(hits / N - sumP / N)).toBeLessThan(0.1);
  });
});

function repFor(s: Step, o: boolean) {
  return Math.round(100 * (1 - (s - (o ? 1 : 0)) ** 2 - 0.75));
}
