import { StyleSheet, Text } from "react-native";
import { Button, Screen } from "../components/ui";
import { SignalCard } from "../components/SignalCard";
import type { RoundModel } from "./useRound";
import { colors, font } from "./theme";

export function StationScreen({ m, subtitle, onLeave }: { m: RoundModel; subtitle: string; onLeave: () => void }) {
  return (
    <Screen
      title="The Station"
      subtitle={`${subtitle} · a ${m.day.state.season} morning`}
      footer={
        <>
          <Button testID="to-forecast" label="Make today's forecast" onPress={() => m.setPhase("forecast")} />
          <Button kind="ghost" label="Back" onPress={onLeave} />
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
