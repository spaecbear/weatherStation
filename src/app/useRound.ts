// State for one forecasting round. Rules and commits come from the caller (engine-backed).
import { useCallback, useMemo, useState } from "react";
import { debriefQuestion, getSignals, playbackSchedule, type Day, type Mode, type PlayResult, type SourceId, type Step } from "../engine";

export type Phase = "station" | "forecast" | "playback" | "verdict";

export interface RoundOptions {
  day: Day;
  mode: Mode;
  sources: SourceId[];
  /** Commit the forecast (save it) and return the scored result. Called once. */
  commit: (calls: Record<string, Step>) => PlayResult;
  /** Already-submitted result (e.g. today's daily reopened): starts on the verdict. */
  existing?: { calls: Record<string, Step>; result: PlayResult };
}

export function useRound({ day, mode, sources, commit, existing }: RoundOptions) {
  const [phase, setPhase] = useState<Phase>(existing ? "verdict" : "station");
  const [calls, setCalls] = useState<Record<string, Step>>(existing?.calls ?? {});
  const [result, setResult] = useState<PlayResult | null>(existing?.result ?? null);
  const [watched, setWatched] = useState(Boolean(existing));

  const signals = useMemo(() => getSignals(day, sources), [day, sources]);
  const schedule = useMemo(() => (result ? playbackSchedule(day, result.resolution) : []), [day, result]);
  const debriefs = useMemo(
    () => (result ? day.questions.map((q) => debriefQuestion(q, day, result.resolution.results.find((r) => r.questionId === q.id)!, sources)) : []),
    [day, result, sources],
  );

  const submit = useCallback(() => {
    if (result) return; // locked
    setResult(commit(calls));
    setPhase("playback");
  }, [calls, commit, result]);

  const finishPlayback = useCallback(() => {
    setWatched(true);
    setPhase("verdict");
  }, []);

  return { day, mode, signals, phase, setPhase, calls, setCalls, result, schedule, debriefs, canSkipPlayback: watched, submit, finishPlayback };
}
export type RoundModel = ReturnType<typeof useRound>;
