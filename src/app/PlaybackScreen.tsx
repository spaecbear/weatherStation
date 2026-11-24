import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { isCorrectSide } from "../engine";
import { Button, Panel, Screen } from "../components/ui";
import { lerpSnapshot, Sky, stormFlash } from "../components/Sky";
import { QuestionIcon } from "../components/QuestionIcon";
import type { RoundModel } from "./useRound";
import { colors, motion, type } from "./theme";
import { formatHour } from "./signalText";
import { sound } from "./sound";

/**
 * Where we are after `elapsed` ms. Each step plays its hour (durationMs), then
 * freezes for holdMs while its questions are revealed.
 */
function locate(steps: { durationMs: number; holdMs: number }[], elapsed: number): { i: number; frac: number; holding: boolean; done: boolean } {
  let acc = 0;
  for (let i = 0; i < steps.length; i++) {
    const { durationMs: d, holdMs: h } = steps[i]!;
    if (elapsed < acc + d) return { i, frac: (elapsed - acc) / d, holding: false, done: false };
    if (elapsed < acc + d + h) return { i, frac: 1, holding: true, done: false };
    acc += d + h;
  }
  return { i: steps.length - 1, frac: 1, holding: false, done: true };
}

export function PlaybackScreen({ m, coach }: { m: RoundModel; coach?: React.ReactNode }) {
  const { schedule, result, day } = m;
  const timeline = result!.resolution.timeline;
  const [elapsed, setElapsed] = useState(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      if (start.current === null) start.current = now;
      setElapsed(now - start.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    sound.stopMusic(); // the weather takes over
    return () => { cancelAnimationFrame(raf); sound.ambience(0, 0); sound.music(); };
  }, []);

  const { i, frac, holding, done } = locate(schedule, elapsed);
  useEffect(() => {
    if (done) {
      sound.ambience(0, 0);
      const t = setTimeout(m.finishPlayback, 1200);
      return () => clearTimeout(t);
    }
  }, [done, m.finishPlayback]);

  const a = timeline[i]!;
  const b = timeline[Math.min(i + 1, timeline.length - 1)]!;
  // During a reveal hold, time is frozen at the end of the deciding hour.
  const snap = lerpSnapshot(a, b, i + 1 < timeline.length ? frac : 0);
  const step = schedule[i]!;

  // A question is revealed the moment its deciding hour finishes (start of its hold).
  const revealedSteps = done ? schedule.length : holding ? i + 1 : i;
  const revealed = useMemo(() => new Set(schedule.slice(0, revealedSteps).flatMap((s) => s.deciding)), [schedule, revealedSteps]);
  const focus = new Set(step.focus.filter((id) => !revealed.has(id)));
  const slowing = focus.size > 0;

  // ---- sound & haptics, driven by the same clock ----
  const lastReveal = useRef(0);
  useEffect(() => {
    // stings for newly revealed questions: right side, wrong side, or a pass
    const ids = schedule.slice(lastReveal.current, revealedSteps).flatMap((s) => s.deciding);
    lastReveal.current = revealedSteps;
    for (const id of ids) {
      const call = m.calls[id]!;
      const outcome = result!.resolution.results.find((r) => r.questionId === id)!.outcome;
      const kind = call === 0.5 ? "pass" : isCorrectSide(call, outcome) ? "hit" : "miss";
      sound.sfx(kind);
      sound.haptic(kind === "miss" ? "miss" : "reveal");
    }
  }, [revealedSteps, schedule, m.calls, result]);

  const wasSlowing = useRef(false);
  useEffect(() => {
    if (slowing && !wasSlowing.current) sound.sfx("build", 0.5);
    wasSlowing.current = slowing;
  }, [slowing]);

  useEffect(() => {
    sound.ambience(Math.min(1, snap.wind / 30), snap.rain > 0 ? (snap.snow ? 0.25 : Math.min(1, 0.3 + snap.rain / 5)) : 0);
  }, [Math.round(snap.wind), snap.rain > 0, snap.snow]); // eslint-disable-line react-hooks/exhaustive-deps

  const flashing = stormFlash(snap, elapsed, motion.reduced);
  const wasFlashing = useRef(false);
  useEffect(() => {
    if (flashing && !wasFlashing.current) setTimeout(() => sound.sfx("thunder", 0.7), 500); // sound travels slower than light
    wasFlashing.current = flashing;
  }, [flashing]);

  return (
    <Screen
      title={formatHour(snap.hour)}
      subtitle={holding ? "There it is..." : slowing ? "Time slows... watch the sky." : "The day plays out."}
      footer={m.canSkipPlayback ? <Button kind="ghost" label="Skip to the verdict" onPress={() => { sound.ambience(0, 0); m.finishPlayback(); }} /> : undefined}
    >
      <Sky snap={snap} timeMs={elapsed} reducedMotion={motion.reduced} />
      {coach}
      {day.questions.map((q) => {
        const r = result!.resolution.results.find((x) => x.questionId === q.id)!;
        const shown = revealed.has(q.id);
        const hot = focus.has(q.id);
        const dark = hot || (shown && r.outcome);
        return (
          <Panel key={q.id} tone={hot ? "gold" : shown && r.outcome ? "accent" : shown ? "sunk" : "card"} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12 }}>
            <QuestionIcon type={q.type} />
            <Text style={[type.body, { flex: 1, color: dark ? "#14181e" : colors.ink }]}>{q.text}</Text>
            <View accessibilityLiveRegion="polite">
              <Text style={[type.h2, { color: dark ? "#14181e" : colors.ink }]}>
                {shown ? (r.outcome ? "YES" : "NO") : hot ? "..." : `${Math.round(m.calls[q.id]! * 100)}%`}
              </Text>
            </View>
          </Panel>
        );
      })}
    </Screen>
  );
}
