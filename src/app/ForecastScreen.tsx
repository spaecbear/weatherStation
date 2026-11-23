import { Text, View } from "react-native";
import { forecastBounds, stakePreview, type Step } from "../engine";
import { Button, Card, Screen } from "../components/ui";
import { StepSelector } from "../components/StepSelector";
import type { RoundModel } from "./useRound";
import { colors, type } from "./theme";
import { signed } from "./signalText";

const Stake = ({ n }: { n: number }) => <Text style={{ color: n > 0 ? colors.good : n < 0 ? colors.bad : colors.muted }}>{signed(n)}</Text>;

export function ForecastScreen({ m }: { m: RoundModel }) {
  const qs = m.day.questions;
  const chosen = qs.map((q) => m.calls[q.id]);
  const complete = chosen.every((c): c is Step => c !== undefined);
  const bounds = complete ? forecastBounds(chosen, m.mode) : null;

  return (
    <Screen
      title="Your Forecast"
      subtitle="Pick a confidence for each. Once you lock it in, it's final."
      footer={
        <>
          <Text style={[type.label, { textAlign: "center", color: colors.ink }]} testID="bounds">
            {bounds ? <>BEST <Stake n={bounds.best} />  ·  WORST <Stake n={bounds.worst} /></> : "ANSWER ALL THREE TO SEE THE STAKES"}
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
            <Text style={type.h2}>{i + 1}. {q.text}</Text>
            <StepSelector testID={`sel-${q.id}`} value={v} onChange={(step) => m.setCalls({ ...m.calls, [q.id]: step })} />
            <Text style={[type.body, { color: colors.muted }]} testID={`stake-${q.id}`}>
              {stake ? <>If yes: <Stake n={stake.ifYes} />. If no: <Stake n={stake.ifNo} />.</> : "How sure are you it happens?"}
            </Text>
          </Card>
        );
      })}
      <View style={{ height: 4 }} />
    </Screen>
  );
}
