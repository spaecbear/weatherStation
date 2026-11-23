import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Screen } from "../components/ui";
import { lerpSnapshot, Sky } from "../components/Sky";
import type { DayModel } from "./useDay";
import { colors, font, radius } from "./theme";
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

export function PlaybackScreen({ m }: { m: DayModel }) {
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
      subtitle={slowing ? "Time slows… watch the sky." : "The day plays out."}
      footer={m.canSkipPlayback ? <Button kind="ghost" label="Skip to the verdict" onPress={m.finishPlayback} /> : undefined}
    >
      <Sky snap={snap} timeMs={elapsed} />
      {day.questions.map((q) => {
        const r = result!.resolution.results.find((x) => x.questionId === q.id)!;
        const shown = revealed.has(q.id);
        const hot = focus.has(q.id);
        return (
          <View key={q.id} style={[s.chip, hot && s.hot, shown && (r.outcome ? s.yes : s.no)]}>
            <Text style={[s.q, hot && { fontWeight: "700" }]}>{q.text}</Text>
            <Text style={s.answer}>
              {shown ? (r.outcome ? "YES" : "NO") : hot ? "…" : `You said ${Math.round(m.calls[q.id]! * 100)}%`}
            </Text>
          </View>
        );
      })}
    </Screen>
  );
}

const s = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.card },
  hot: { borderColor: colors.gold, backgroundColor: "#fff5d6" },
  yes: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  no: { borderColor: colors.line, backgroundColor: "#eee8dc" },
  q: { flex: 1, fontSize: font.body, color: colors.ink },
  answer: { fontSize: font.body, fontWeight: "700", color: colors.ink },
});
