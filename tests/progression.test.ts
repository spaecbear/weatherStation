import { describe, expect, it } from "vitest";
import {
  addDays, addToCalibration, buy, calibrationBars, canBuy, careerDaySources, careerLoadout, dayPay, emptyCalibration, EQUIPMENT,
  FOLK, FOLK_SIGNS, folkSaysRain, folkSignsForDay, generateDay, getSignals, journalTier, loadoutFor, newCareer, nextCareerDay,
  playCareerDay, radarBreaks, RADAR, readSignal, recordJournal, repair, resolveDay, ROTATING_FOLK, seasonForIndex, SOURCES,
  STARTING_SOURCES, tierForRate, trueFolkReliability, type CareerState, type Journal, type Step,
} from "../src/engine";
import { memoryStore } from "../src/storage/kv";
import { KEYS, Saves } from "../src/storage/saves";

const D0 = "2026-11-01";

describe("money", () => {
  it("pays rep gain with a floor", () => {
    expect(dayPay(114)).toBe(57);
    expect(dayPay(30)).toBe(15);
    expect(dayPay(2)).toBe(5);
    expect(dayPay(-102)).toBe(5);
  });
  it("career days add pay", () => {
    const c = newCareer({ name: "A", hardcore: false, today: D0, seedBase: 3 });
    const out = playCareerDay(c, Object.fromEntries(nextCareerDay(c).questions.map((q) => [q.id, 0.5 as Step])), D0);
    expect(out.pay).toBe(5 + out.contracts.reduce((a, x) => a + x.pay, 0));
    expect(out.career.money).toBe(out.pay);
  });
});

describe("equipment", () => {
  it("loadouts unlock sources and the rain gauge sharpens the hygrometer", () => {
    expect(loadoutFor([]).sources).toEqual(STARTING_SOURCES);
    const all = loadoutFor(["rainGauge", "upstreamRadio", "weatherBalloon", "radar"]);
    expect(all.sources).toEqual(expect.arrayContaining(["upstreamRadio", "weatherBalloon", "radar"]));
    expect(all.noise.hygrometer).toBeLessThan(SOURCES.hygrometer.noiseSd);
    expect(loadoutFor(["radar"], ["radar"]).sources).not.toContain("radar"); // broken
  });
  it("rain gauge measurably lowers hygrometer error on the same days", () => {
    let base = 0, upgraded = 0;
    const n = 3000;
    for (let i = 0; i < n; i++) {
      const d = generateDay(i, seasonForIndex(i));
      base += Math.abs(readSignal(d, "hygrometer").value - d.state.humidity);
      upgraded += Math.abs(readSignal(d, "hygrometer", EQUIPMENT.rainGauge.noise!.hygrometer).value - d.state.humidity);
    }
    expect(upgraded / n).toBeLessThan((base / n) * 0.5);
  });
  it("buy, can't double-buy, can't overspend; repair costs money", () => {
    const w = { equipment: [] as never[], brokenEquipment: [] as never[], money: 600 };
    expect(canBuy(w, "radar")).toBe(true);
    const w2 = buy(w, "radar");
    expect(w2.money).toBe(600 - EQUIPMENT.radar.price);
    expect(() => buy(w2, "radar")).toThrow(/Already/);
    expect(() => buy({ ...w, money: 10 }, "rainGauge")).toThrow(/money/);
    const broken = { ...w2, brokenEquipment: ["radar" as const] };
    expect(repair(broken, "radar")).toMatchObject({ brokenEquipment: [], money: w2.money - RADAR.repairCost });
    expect(() => repair({ ...broken, money: 0 }, "radar")).toThrow();
  });
  it("radar only breaks on stormy days, sometimes, deterministically", () => {
    let stormy = 0, broke = 0;
    for (let i = 0; i < 4000; i++) {
      const d = generateDay(i, "autumn");
      const ev = resolveDay(d).events;
      const b = radarBreaks(d, ev);
      expect(radarBreaks(d, ev)).toBe(b);
      if (ev.rains && d.state.frontStrength >= RADAR.stormyFront) stormy++;
      else expect(b).toBe(false);
      if (b) broke++;
    }
    expect(broke / stormy).toBeGreaterThan(RADAR.breakChance - 0.06);
    expect(broke / stormy).toBeLessThan(RADAR.breakChance + 0.06);
  });
  it("a career radar that breaks disappears until repaired", () => {
    let c: CareerState = { ...newCareer({ name: "A", hardcore: false, today: D0, seedBase: 11 }), equipment: ["radar"], money: 1000 };
    for (let i = 0; i < 400; i++) {
      const day = nextCareerDay(c);
      const out = playCareerDay(c, Object.fromEntries(day.questions.map((q) => [q.id, 0.5 as Step])), addDays(D0, i));
      c = out.career;
      if (out.radarBroke) {
        expect(careerLoadout(c).sources).not.toContain("radar");
        c = repair(c, "radar");
        expect(careerLoadout(c).sources).toContain("radar");
        return;
      }
    }
    throw new Error("radar never broke in 400 days");
  });
});

describe("folk signs", () => {
  it("2 rotating signs per day plus the knee and cows; deterministic", () => {
    const d = generateDay(5, "spring");
    expect(folkSignsForDay(d)).toHaveLength(FOLK.perDay);
    expect(folkSignsForDay(d)).toEqual(folkSignsForDay(generateDay(5, "spring")));
    for (const s of folkSignsForDay(d)) expect(ROTATING_FOLK).toContain(s);
    const c = newCareer({ name: "A", hardcore: false, today: D0, seedBase: 1 });
    const srcs = careerDaySources(c, nextCareerDay(c));
    expect(srcs).toEqual(expect.arrayContaining(["farmersKnee", "cowsLyingDown"]));
    expect(srcs.filter((s) => ROTATING_FOLK.includes(s))).toHaveLength(FOLK.perDay);
  });
  it("true reliabilities span the tiers and sit away from tier boundaries", () => {
    const rel = Object.fromEntries(FOLK_SIGNS.map((s) => [s, trueFolkReliability(s)]));
    const tiers = new Set(Object.values(rel).map(tierForRate));
    expect(tiers).toEqual(new Set(["Nonsense", "Hunch", "Decent", "Trusty"]));
    for (const r of Object.values(rel)) for (const cut of Object.values(FOLK.tiers)) expect(Math.abs(r - cut)).toBeGreaterThan(0.02);
    expect(tierForRate(rel.cowsLyingDown!)).toBe("Nonsense");
    expect(tierForRate(rel.frogsCroaking!)).toBe("Nonsense");
  });
  it("journal starts Unknown and converges on each sign's true reliability", () => {
    let j: Journal = {};
    expect(journalTier(j.pineCones)).toBe("Unknown");
    // ~4000 career days (a long career across generations; the journal survives succession).
    for (let i = 0; i < 4000; i++) {
      const d = generateDay(900_000 + i, seasonForIndex(Math.floor(i / 28)));
      const sigs = getSignals(d, [...STARTING_SOURCES, ...folkSignsForDay(d)]);
      j = recordJournal(j, sigs, resolveDay(d).events.rains);
      if (i === 3) for (const e of Object.values(j)) expect(journalTier(e)).toBe("Unknown");
    }
    for (const s of FOLK_SIGNS) {
      const e = j[s]!;
      expect(e.samples).toBeGreaterThan(1400);
      expect(journalTier(e)).toBe(tierForRate(trueFolkReliability(s)));
      expect(Math.abs(e.agreed / e.samples - trueFolkReliability(s))).toBeLessThan(0.025);
    }
  });
  it("folkSaysRain respects direction", () => {
    const d = generateDay(1, "spring");
    const s = readSignal(d, "spiderWebs");
    expect(folkSaysRain({ ...s, value: -2 })).toBe(true);
    expect(folkSaysRain({ ...s, value: 2 })).toBe(false);
    expect(() => folkSaysRain(readSignal(d, "barometer"))).toThrow();
  });
});

describe("calibration", () => {
  it("counts per step, bars only after 10 samples", () => {
    let cal = emptyCalibration();
    const q = (forecast: Step, outcome: boolean) => ({ questionId: "x", forecast, outcome, rep: 0 });
    for (let i = 0; i < 10; i++) cal = addToCalibration(cal, [q(0.7, i < 7), ...(i < 9 ? [q(0.3, i < 3)] : [])]);
    const bars = calibrationBars(cal);
    expect(bars.find((b) => b.step === 0.7)).toEqual({ step: 0.7, n: 10, rate: 0.7, needed: 0 });
    expect(bars.find((b) => b.step === 0.3)).toMatchObject({ n: 9, rate: null, needed: 1 });
    expect(bars.find((b) => b.step === 0.9)).toMatchObject({ n: 0, rate: null, needed: 10 });
  });
  it("career days feed calibration", () => {
    const c = newCareer({ name: "A", hardcore: false, today: D0, seedBase: 2 });
    const out = playCareerDay(c, Object.fromEntries(nextCareerDay(c).questions.map((q) => [q.id, 0.7 as Step])), D0);
    expect(out.career.calibration["0.7"].n).toBe(3);
  });
});

describe("save migration", () => {
  it("phase-3 saves load with phase-4 fields filled in", async () => {
    const c = newCareer({ name: "Old", hardcore: false, today: D0, seedBase: 1 }) as Partial<CareerState>;
    delete c.calibration; delete c.brokenEquipment;
    const loaded = await new Saves(memoryStore({ [KEYS.career]: JSON.stringify({ ...c, journal: {} }) })).loadCareer();
    expect(loaded!.calibration).toEqual(emptyCalibration());
    expect(loaded!.brokenEquipment).toEqual([]);
  });
});
