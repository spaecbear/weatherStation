// Thin state holder for one playable day. All rules come from the engine.
import { useCallback, useMemo, useState } from "react";
import {
  debriefQuestion, generateDay, getSignals, playbackSchedule, playDay, mulberry32, pick, SEASONS,
  STARTING_SOURCES, type Day, type Mode, type PlayResult, type Step,
} from "../engine";

export const DEV_SEED = 20261123;
const MODE: Mode = "career"; // prototype shows career scoring (incl. trickle)

export type Phase = "station" | "forecast" | "playback" | "verdict";

function dayFromSeed(seed: number): Day {
  const season = pick(mulberry32(seed ^ 0x5eaa), SEASONS);
  return generateDay(seed, season);
}

export function useDay() {
  const [seed, setSeed] = useState(DEV_SEED);
  const [phase, setPhase] = useState<Phase>("station");
  const [calls, setCalls] = useState<Record<string, Step>>({});
  const [result, setResult] = useState<PlayResult | null>(null);
  const [watched, setWatched] = useState<Set<number>>(new Set());

  const day = useMemo(() => dayFromSeed(seed), [seed]);
  const signals = useMemo(() => getSignals(day, STARTING_SOURCES), [day]);
  const schedule = useMemo(() => (result ? playbackSchedule(day, result.resolution) : []), [day, result]);
  const debriefs = useMemo(
    () =>
      result
        ? day.questions.map((q) =>
            debriefQuestion(q, day, result.resolution.results.find((r) => r.questionId === q.id)!, STARTING_SOURCES),
          )
        : [],
    [day, result],
  );

  const loadSeed = useCallback((s: number) => {
    setSeed(s);
    setCalls({});
    setResult(null);
    setPhase("station");
  }, []);

  const submit = useCallback(() => {
    if (result) return; // locked
    setResult(playDay(day, calls, MODE));
    setPhase("playback");
  }, [day, calls, result]);

  const finishPlayback = useCallback(() => {
    setWatched((w) => new Set(w).add(seed));
    setPhase("verdict");
  }, [seed]);

  return {
    mode: MODE,
    seed, day, signals, phase, setPhase, calls, setCalls, result, schedule, debriefs,
    canSkipPlayback: watched.has(seed),
    submit, finishPlayback,
    devDay: () => loadSeed(DEV_SEED),
    randomDay: () => loadSeed(Math.floor(Math.random() * 2 ** 32)),
  };
}
export type DayModel = ReturnType<typeof useDay>;
