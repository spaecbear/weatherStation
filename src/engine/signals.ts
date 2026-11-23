import { SOURCES, type SourceId } from "./config";
import { gaussian, mulberry32, subSeed } from "./rng";
import type { Day, Signal } from "./types";

export const STARTING_SOURCES: SourceId[] = (Object.keys(SOURCES) as SourceId[]).filter(
  (id) => SOURCES[id].unlockedAtStart,
);

/**
 * Each source has its own sub-seeded RNG, so a reading never changes
 * depending on which other sources are unlocked.
 */
export function readSignal(day: Day, source: SourceId): Signal {
  const def = SOURCES[source];
  const rng = mulberry32(subSeed(day.seed, `signal:${source}`));
  let value: number;
  if (def.reads === "none") {
    value = Math.min(1, Math.max(0, gaussian(rng, 0.5, def.noiseSd))); // fraction of cows lying down
  } else {
    value = day.state[def.reads] + gaussian(rng, 0, def.noiseSd);
    if (def.reads === "humidity" || def.reads === "frontStrength") value = Math.min(1, Math.max(0, value));
    if (def.reads === "upperWinds") value = Math.max(0, value);
  }
  return { source, label: def.label, reads: def.reads, value };
}

export function getSignals(day: Day, unlockedSources: readonly SourceId[]): Signal[] {
  return (Object.keys(SOURCES) as SourceId[])
    .filter((id) => unlockedSources.includes(id))
    .map((id) => readSignal(day, id));
}
