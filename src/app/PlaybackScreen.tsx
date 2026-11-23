import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Button, Panel, Screen } from "../components/ui";
import { lerpSnapshot, Sky } from "../components/Sky";
import type { RoundModel } from "./useRound";
import { colors, type } from "./theme";
import { formatHour } from "./signalText";

/** Where we are in the schedule after `elapsed` ms: step index + fraction through it. */
function locate(durations: number[], elapsed: number): { i: number; frac: number; done: boolean } {
  let acc = 0;
  for (let i = 0; i < durations.length; i++) {
    const d = durations[i]!;
    if (elapsed < acc + d) return { i, frac: (elapsed - acc) / d, done: false };
    acc += d;
  }
  return { i: durations.length - 1, frac: 1, done: true };
}

export function PlaybackScreen({ m }: { m: RoundModel }) {
  const { schedule, result, day } = m;
  const timeline = result!.resolution.timeline;
  const durations = useMemo(() => schedule.map((s) => s.durationMs), [schedule]);
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
    return () => cancelAnimationFrame(raf);
  }, []);

  const { i, frac, done } = locate(durations, elapsed);
  useEffect(() => {
    if (done) {
      const t = setTimeout(m.finishPlayback, 1200);
      return () => clearTimeout(t);
    }
  }, [done, m.finishPlayback]);

  const a = timeline[i]!;
  const b = timeline[Math.min(i + 1, timeline.length - 1)]!;
  const snap = lerpSnapshot(a, b, i + 1 < timeline.length ? frac : 0);
  const step = schedule[i]!;

  // A question is revealed once its deciding hour has finished playing.
  const revealed = new Set(schedule.slice(0, done ? schedule.length : i).flatMap((s) => s.deciding));
  const focus = new Set(step.focus.filter((id) => !revealed.has(id)));
  const slowing = focus.size > 0;

  return (
    <Screen
      title={formatHour(snap.hour)}
      subtitle={slowing ? "Time slows... watch the sky." : "The day plays out."}
      footer={m.canSkipPlayback ? <Button kind="ghost" label="Skip to the verdict" onPress={m.finishPlayback} /> : undefined}
    >
      <Sky snap={snap} timeMs={elapsed} />
      {day.questions.map((q) => {
        const r = result!.resolution.results.find((x) => x.questionId === q.id)!;
        const shown = revealed.has(q.id);
        const hot = focus.has(q.id);
        return (
          <Panel key={q.id} tone={hot ? "gold" : shown && r.outcome ? "accent" : shown ? "sunk" : "card"} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12 }}>
            <Text style={[type.body, { flex: 1, color: hot || (shown && r.outcome) ? "#14181e" : colors.ink }]}>{q.text}</Text>
            <Text style={[type.h2, { color: hot || (shown && r.outcome) ? "#14181e" : colors.ink }]}>
              {shown ? (r.outcome ? "YES" : "NO") : hot ? "..." : `${Math.round(m.calls[q.id]! * 100)}%`}
            </Text>
          </Panel>
        );
      })}
    </Screen>
  );
}
