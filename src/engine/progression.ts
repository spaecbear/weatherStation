import { CAREER, EQUIPMENT, FOLK, FORECAST_STEPS, MONEY, RADAR, ROTATING_FOLK, SOURCES, type EquipmentId, type SourceId } from "./config";
import { generateDay, resolveDay } from "./day";
import { mulberry32, subSeed } from "./rng";
import { folkSaysRain, isFolk, readSignal } from "./signals";
import type { Day, DayEvents, QuestionScore, Signal, Step } from "./types";
import { seasonForIndex } from "./weather";

// ---------- Money ----------

/** Career pay for a day: rep gain scaled, never below the floor. */
export const dayPay = (repTotal: number): number => Math.max(MONEY.floor, Math.round(MONEY.perRep * repTotal));

// ---------- Folklore journal ----------

export interface JournalEntry { samples: number; agreed: number }
export type Journal = Partial<Record<SourceId, JournalEntry>>;
export type Tier = "Unknown" | "Nonsense" | "Hunch" | "Decent" | "Trusty";
export const FOLK_SIGNS: SourceId[] = (Object.keys(SOURCES) as SourceId[]).filter(isFolk);

/** Record whether each folk sign seen today agreed with whether it rained. */
export function recordJournal(journal: Journal, signals: readonly Signal[], rained: boolean): Journal {
  const next: Journal = { ...journal };
  for (const s of signals) {
    if (!isFolk(s.source)) continue;
    const prev = next[s.source] ?? { samples: 0, agreed: 0 };
    next[s.source] = { samples: prev.samples + 1, agreed: prev.agreed + (folkSaysRain(s) === rained ? 1 : 0) };
  }
  return next;
}

export function tierForRate(rate: number): Exclude<Tier, "Unknown"> {
  const t = FOLK.tiers;
  return rate >= t.trusty ? "Trusty" : rate >= t.decent ? "Decent" : rate >= t.hunch ? "Hunch" : "Nonsense";
}

export function journalTier(e: JournalEntry | undefined): Tier {
  return !e || e.samples < FOLK.minSamples ? "Unknown" : tierForRate(e.agreed / e.samples);
}

/** True once a sign has enough samples that its tier is unlikely to change. */
export const journalSettled = (e: JournalEntry | undefined): boolean => (e?.samples ?? 0) >= FOLK.settledSamples;

const reliabilityCache = new Map<SourceId, number>();
/**
 * The sign's true long-run agreement rate with "rain today". Hidden from the
 * player; used by tests and the sim to check the journal converges on it.
 */
export function trueFolkReliability(source: SourceId, days = 20000): number {
  const hit = reliabilityCache.get(source);
  if (hit !== undefined && days === 20000) return hit;
  let agree = 0;
  for (let i = 0; i < days; i++) {
    const day = generateDay(subSeed(0xf01c, `rel:${i}`), seasonForIndex(i));
    agree += folkSaysRain(readSignal(day, source)) === resolveDay(day).events.rains ? 1 : 0;
  }
  const r = agree / days;
  if (days === 20000) reliabilityCache.set(source, r);
  return r;
}

// ---------- Calibration ----------

export type StepKey = "0.1" | "0.3" | "0.5" | "0.7" | "0.9";
export type Calibration = Record<StepKey, { n: number; yes: number }>;

export const emptyCalibration = (): Calibration =>
  Object.fromEntries(FORECAST_STEPS.map((s) => [String(s), { n: 0, yes: 0 }])) as Calibration;

export function addToCalibration(cal: Calibration, scores: readonly QuestionScore[]): Calibration {
  const next = structuredClone(cal);
  for (const q of scores) {
    const k = String(q.forecast) as StepKey;
    next[k] = { n: next[k].n + 1, yes: next[k].yes + (q.outcome ? 1 : 0) };
  }
  return next;
}

export function mergeCalibration(a: Calibration, b: Calibration): Calibration {
  const out = emptyCalibration();
  for (const k of Object.keys(out) as StepKey[]) out[k] = { n: a[k].n + b[k].n, yes: a[k].yes + b[k].yes };
  return out;
}

export interface CalibrationBar { step: Step; n: number; rate: number | null; needed: number }

/** One bar per step; `rate` is null until the step has CAREER.calibrationMin samples. */
export function calibrationBars(cal: Calibration): CalibrationBar[] {
  return FORECAST_STEPS.map((step) => {
    const { n, yes } = cal[String(step) as StepKey];
    const ok = n >= CAREER.calibrationMin;
    return { step, n, rate: ok ? yes / n : null, needed: ok ? 0 : CAREER.calibrationMin - n };
  });
}

// ---------- Equipment ----------

export interface Workshop { equipment: EquipmentId[]; brokenEquipment: EquipmentId[]; money: number }

export function canBuy(w: Workshop, id: EquipmentId): boolean {
  return !w.equipment.includes(id) && w.money >= EQUIPMENT[id].price;
}

export function buy<T extends Workshop>(w: T, id: EquipmentId): T {
  if (w.equipment.includes(id)) throw new Error(`Already own ${id}`);
  if (w.money < EQUIPMENT[id].price) throw new Error(`Not enough money for ${id}`);
  return { ...w, equipment: [...w.equipment, id], money: w.money - EQUIPMENT[id].price };
}

export function repair<T extends Workshop>(w: T, id: EquipmentId): T {
  if (!w.brokenEquipment.includes(id)) throw new Error(`${id} isn't broken`);
  if (w.money < RADAR.repairCost) throw new Error("Not enough money to repair");
  return { ...w, brokenEquipment: w.brokenEquipment.filter((e) => e !== id), money: w.money - RADAR.repairCost };
}

export const isStormy = (day: Day, ev: DayEvents) => ev.rains && day.state.frontStrength >= RADAR.stormyFront;

/** Seeded: does a working radar get knocked out today? */
export function radarBreaks(day: Day, ev: DayEvents): boolean {
  return isStormy(day, ev) && mulberry32(subSeed(day.seed, "radar-break"))() < RADAR.breakChance;
}

export { ROTATING_FOLK };
