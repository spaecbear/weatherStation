import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Text, View } from "react-native";
import { Card, Panel, Screen } from "../components/ui";
import { Icon } from "../components/Sprite";
import { SUN } from "../components/pixelArt";
import type { RoundModel } from "./useRound";
import { colors, type } from "./theme";
import { signed } from "./signalText";
import { Button } from "../components/ui";

const repColor = (n: number) => (n > 0 ? colors.good : n < 0 ? colors.bad : colors.muted);

export function VerdictScreen({ m, extra, actions }: { m: RoundModel; extra?: ReactNode; actions: ReactNode }) {
  const score = m.result!.score;
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (score.perfectBonus > 0) Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [score.perfectBonus, pop]);

  return (
    <Screen
      title="The Verdict"
      footer={<>{actions}<Button kind="ghost" label="Watch the day again" onPress={() => m.setPhase("playback")} /></>}
    >
      {score.perfectBonus > 0 ? (
        <Animated.View style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }], opacity: pop }}>
          <Panel tone="gold" style={{ padding: 14, alignItems: "center", gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Icon rows={SUN} palette={{ y: "#c4571f", Y: "#fff" }} px={3} />
              <Text style={[type.big, { color: "#1a1406" }]}>PERFECT!</Text>
              <Icon rows={SUN} palette={{ y: "#c4571f", Y: "#fff" }} px={3} />
            </View>
            <Text style={[type.body, { color: "#1a1406" }]}>All three on the right side · bonus {signed(score.perfectBonus)}</Text>
          </Panel>
        </Animated.View>
      ) : null}

      {m.day.questions.map((q) => {
        const qs = score.questions.find((x) => x.questionId === q.id)!;
        const d = m.debriefs.find((x) => x.questionId === q.id)!;
        return (
          <Card key={q.id} style={{ gap: 8 }}>
            <Text style={type.h2}>{q.text}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[type.body, { color: colors.muted }]}>You said {Math.round(qs.forecast * 100)}% · it was {qs.outcome ? "YES" : "NO"}</Text>
              <Text style={[type.big, { color: repColor(qs.rep) }]}>{signed(qs.rep)}</Text>
            </View>
            <Text style={[type.body, { color: colors.accentHi }]}>{d.line}</Text>
          </Card>
        );
      })}

      <Card style={{ gap: 6 }}>
        {score.perfectBonus > 0 ? <Line label="Perfect day bonus" value={score.perfectBonus} /> : null}
        {score.trickle > 0 ? <Line label="Showing up" value={score.trickle} /> : null}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={type.h2}>TODAY</Text>
          <Text style={[type.big, { color: repColor(score.total) }]} testID="total">{signed(score.total)} REP</Text>
        </View>
      </Card>
      {extra}
    </Screen>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={[type.body, { color: colors.muted }]}>{label}</Text>
      <Text style={[type.body, { color: colors.muted }]}>{signed(value)}</Text>
    </View>
  );
}
