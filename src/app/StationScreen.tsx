import { StyleSheet, Text } from "react-native";
import { Button, Screen } from "../components/ui";
import { SignalCard } from "../components/SignalCard";
import type { DayModel } from "./useDay";
import { colors, font } from "./theme";

export function StationScreen({ m }: { m: DayModel }) {
  const season = m.day.state.season;
  return (
    <Screen
      title="The Station"
      subtitle={`A ${season} morning · Day #${m.seed}`}
      footer={
        <>
          <Button testID="to-forecast" label="Make today's forecast" onPress={() => m.setPhase("forecast")} />
          <Button kind="ghost" label="New random day (dev)" onPress={m.randomDay} />
        </>
      }
    >
      <Text style={s.hint}>Tap a reading to see what it tells you.</Text>
      {m.signals.map((sig) => (
        <SignalCard key={sig.source} signal={sig} />
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({ hint: { color: colors.muted, fontSize: font.small } });
