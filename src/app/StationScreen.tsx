import { Text } from "react-native";
import { Button, Screen } from "../components/ui";
import { SignalCard } from "../components/SignalCard";
import type { RoundModel } from "./useRound";
import { colors, type } from "./theme";

export function StationScreen({ m, subtitle, onLeave }: { m: RoundModel; subtitle: string; onLeave: () => void }) {
  return (
    <Screen
      title="The Station"
      subtitle={`${subtitle} · ${m.day.state.season === "autumn" ? "an" : "a"} ${m.day.state.season} morning`}
      footer={
        <>
          <Button testID="to-forecast" label="Make the forecast" onPress={() => m.setPhase("forecast")} />
          <Button kind="ghost" label="Back" onPress={onLeave} />
        </>
      }
    >
      <Text style={[type.body, { color: colors.muted }]}>Tap a reading to see what it tells you.</Text>
      {m.signals.map((sig) => <SignalCard key={sig.source} signal={sig} tier={m.tiers?.[sig.source]} />)}
    </Screen>
  );
}
