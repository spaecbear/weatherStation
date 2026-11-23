import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Button, Card, Screen } from "../components/ui";
import type { DayModel } from "./useDay";
import { colors, font } from "./theme";
import { signed } from "./signalText";

export function VerdictScreen({ m }: { m: DayModel }) {
  const score = m.result!.score;
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (score.perfectBonus > 0) Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [score.perfectBonus, pop]);

  return (
    <Screen
      title="The Verdict"
      footer={
        <>
          <Button testID="next-day" label="New random day (dev)" onPress={m.randomDay} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Button kind="ghost" label="Watch again" onPress={() => m.setPhase("playback")} /></View>
            <View style={{ flex: 1 }}><Button kind="ghost" label="Dev day" onPress={m.devDay} /></View>
          </View>
        </>
      }
    >
      {score.perfectBonus > 0 ? (
        <Animated.View style={[s.perfect, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }], opacity: pop }]}>
          <Text style={s.perfectTitle}>☀️ Perfect Forecast ☀️</Text>
          <Text style={s.perfectSub}>All three on the right side · bonus {signed(score.perfectBonus)}</Text>
        </Animated.View>
      ) : null}

      {m.day.questions.map((q) => {
        const qs = score.questions.find((x) => x.questionId === q.id)!;
        const d = m.debriefs.find((x) => x.questionId === q.id)!;
        return (
          <Card key={q.id} style={{ gap: 6 }}>
            <Text style={s.q}>{q.text}</Text>
            <View style={s.row}>
              <Text style={s.meta}>You said {Math.round(qs.forecast * 100)}% · it was {qs.outcome ? "YES" : "NO"}</Text>
              <Text style={[s.rep, { color: qs.rep > 0 ? colors.good : qs.rep < 0 ? colors.bad : colors.muted }]}>{signed(qs.rep)}</Text>
            </View>
            <Text style={s.debrief}>{d.line}</Text>
          </Card>
        );
      })}

      <Card style={{ gap: 4 }}>
        {score.perfectBonus > 0 ? <Line label="Perfect day bonus" value={score.perfectBonus} /> : null}
        {score.trickle > 0 ? <Line label="Showing up" value={score.trickle} /> : null}
        <View style={s.row}>
          <Text style={s.totalLabel}>Today</Text>
          <Text style={s.total} testID="total">{signed(score.total)} rep</Text>
        </View>
      </Card>
    </Screen>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.row}>
      <Text style={s.meta}>{label}</Text>
      <Text style={s.meta}>{signed(value)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  perfect: { backgroundColor: colors.gold, borderRadius: 16, padding: 16, alignItems: "center" },
  perfectTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  perfectSub: { color: "#fff", marginTop: 4 },
  q: { fontSize: font.h2, fontWeight: "600", color: colors.ink },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  meta: { fontSize: font.body, color: colors.muted },
  rep: { fontSize: font.h2, fontWeight: "800" },
  debrief: { fontSize: font.body, color: colors.ink, fontStyle: "italic", lineHeight: 21 },
  totalLabel: { fontSize: font.h2, fontWeight: "700", color: colors.ink },
  total: { fontSize: 22, fontWeight: "800", color: colors.ink },
});
