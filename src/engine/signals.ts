import { EQUIPMENT, FOLK, ROTATING_FOLK, SOURCES, type EquipmentId, type SourceId } from "./config";
import { gaussian, mulberry32, shuffle, subSeed } from "./rng";
import type { Day, Signal } from "./types";
import { pRain } from "./weather";

export const STARTING_SOURCES: SourceId[] = (Object.keys(SOURCES) as SourceId[]).filter((id) => SOURCES[id].unlockedAtStart);

/** What the station can read: which sources, and any noise overrides from upgrades. */
export interface Loadout {
  sources: SourceId[];
  noise: Partial<Record<SourceId, number>>;
}

export const BASE_LOADOUT: Loadout = { sources: STARTING_SOURCES, noise: {} };

/** Equipment you own and that isn't broken → loadout. */
export function loadoutFor(owned: readonly EquipmentId[], broken: readonly EquipmentId[] = []): Loadout {
  const sources = [...STARTING_SOURCES];
  const noise: Partial<Record<SourceId, number>> = {};
  for (const id of owned) {
    if (broken.includes(id)) continue;
    const e = EQUIPMENT[id];
    if (e.unlocks && !sources.includes(e.unlocks)) sources.push(e.unlocks);
    Object.assign(noise, e.noise);
  }
  return { sources, noise };
}

/** The rotating townsfolk omens around today. Deterministic per day. */
export function folkSignsForDay(day: Day): SourceId[] {
  return shuffle(mulberry32(subSeed(day.seed, "folk")), ROTATING_FOLK).slice(0, FOLK.perDay);
}

/** Everything the player sees today: their loadout plus today's folk signs. */
export function sourcesForDay(day: Day, loadout: Loadout): SourceId[] {
  return [...loadout.sources, ...folkSignsForDay(day).filter((s) => !loadout.sources.includes(s))];
}

/**
 * Each source has its own sub-seeded RNG, so a reading never changes
 * depending on which other sources are unlocked. Upgrades scale the same
 * draw, so a better instrument reads the same day more precisely.
 */
export function readSignal(day: Day, source: SourceId, noiseSd = SOURCES[source].noiseSd): Signal {
  const def = SOURCES[source];
  const z = gaussian(mulberry32(subSeed(day.seed, `signal:${source}`)));
  let value: number;
  if (def.reads === "none") {
    value = Math.min(1, Math.max(0, 0.5 + z * noiseSd));
  } else {
    const truth = def.reads === "rainChance" ? pRain(day.state) : day.state[def.reads];
    value = truth + z * noiseSd;
    if (def.reads === "humidity" || def.reads === "frontStrength" || def.reads === "rainChance") value = Math.min(1, Math.max(0, value));
    if (def.reads === "upperWinds") value = Math.max(0, value);
  }
  return { source, label: def.label, reads: def.reads, value, noiseSd };
}

export function getSignals(day: Day, sources: readonly SourceId[], noise: Loadout["noise"] = {}): Signal[] {
  return (Object.keys(SOURCES) as SourceId[]).filter((id) => sources.includes(id)).map((id) => readSignal(day, id, noise[id]));
}

export const isFolk = (id: SourceId): boolean => Boolean(SOURCES[id].folk);

/** For folk signs: does today's omen say rain? */
export function folkSaysRain(sig: Signal): boolean {
  const rule = SOURCES[sig.source].folk;
  if (!rule) throw new Error(`${sig.source} is not a folk sign`);
  return rule.rainWhen === "above" ? sig.value > rule.threshold : sig.value < rule.threshold;
}
