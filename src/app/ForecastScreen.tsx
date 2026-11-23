import { StyleSheet, Text, View } from "react-native";
import { forecastBounds, stakePreview, type Step } from "../engine";
import { Button, Card, Screen } from "../components/ui";
import { StepSelector } from "../components/StepSelector";
import type { RoundModel } from "./useRound";
import { colors, font } from "./theme";
import { signed } from "./signalText";

export function ForecastScreen({ m }: { m: RoundModel }) {
  const qs = m.day.questions;
  const chosen = qs.map((q) => m.calls[q.id]);
  const complete = chosen.every((c): c is Step => c !== undefined);
  const bounds = complete ? forecastBounds(chosen, m.mode) : null;

  return (
    <Screen
      title="Your Forecast"
      subtitle="Pick a confidence for each. Once you submit, it's locked."
      footer={
        <>
          <Text style={s.bounds} testID="bounds">
            {bounds ? `Best case ${signed(bounds.best)} · Worst case ${signed(bounds.worst)}` : "Answer all three to see the stakes"}
          </Text>
          <Button testID="submit" label="Lock it in" disabled={!complete} onPress={m.submit} />
          <Button kind="ghost" label="Back to the station" onPress={() => m.setPhase("station")} />
        </>
      }
    >
      {qs.map((q, i) => {
        const v = m.calls[q.id];
        const stake = v !== undefined ? stakePreview(v) : null;
        return (
          <Card key={q.id} style={{ gap: 10 }}>
            <Text style={s.q}>{i + 1}. {q.text}</Text>
            <StepSelector testID={`sel-${q.id}`} value={v} onChange={(step) => m.setCalls({ ...m.calls, [q.id]: step })} />
            <Text style={s.stake} testID={`stake-${q.id}`}>
              {stake ? `If yes: ${signed(stake.ifYes)}. If no: ${signed(stake.ifNo)}.` : "How sure are you it happens?"}
            </Text>
          </Card>
        );
      })}
      <View style={{ height: 4 }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  q: { fontSize: font.h2, fontWeight: "600", color: colors.ink },
  stake: { fontSize: font.body, color: colors.muted },
  bounds: { textAlign: "center", fontSize: font.body, color: colors.ink, fontWeight: "600" },
});
