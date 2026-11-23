import { Pressable, StyleSheet, Text, View } from "react-native";
import { currentRating, currentStreak, dailyNumber, hasPlayedDaily, type CareerState, type DailyState } from "../engine";
import { Button, Screen } from "../components/ui";
import { colors, font, radius } from "./theme";

interface Props {
  today: string;
  daily: DailyState;
  career: CareerState | null;
  go: (to: "daily" | "career" | "zen" | "wall") => void;
  devNextDay: () => void;
}

export function MenuScreen({ today, daily, career, go, devNextDay }: Props) {
  const played = hasPlayedDaily(daily, today);
  const streak = currentStreak(daily, today);
  return (
    <Screen title="Weather Station" subtitle="Small town. Big sky. Your call." footer={
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={s.dev}>Today (UTC): {today}</Text>
        <View style={{ width: 150 }}><Button kind="ghost" label="Dev: +1 day" onPress={devNextDay} testID="dev-next-day" /></View>
      </View>
    }>
      <Tile testID="menu-daily" icon="📅" title={`Daily Forecast #${dailyNumber(today)}`} onPress={() => go("daily")}
        detail={`${played ? "Played today ✓" : "Same sky for everyone, one try"}${streak ? ` · streak ${streak}` : ""}`} />
      <Tile testID="menu-career" icon="🏠" title="Career" onPress={() => go("career")}
        detail={career ? `${career.forecaster.name} · rating ${currentRating(career, today)}` : "Become the town's forecaster"} />
      <Tile testID="menu-zen" icon="🍵" title="Zen" detail="Endless random days, nothing saved" onPress={() => go("zen")} />
      <Tile testID="menu-wall" icon="🖼️" title="History Wall" detail="Every forecaster who held the station" onPress={() => go("wall")} />
    </Screen>
  );
}

function Tile({ icon, title, detail, onPress, testID }: { icon: string; title: string; detail: string; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.tile, pressed && { opacity: 0.85 }]}>
      <Text style={s.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.detail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  tile: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.line },
  icon: { fontSize: 32 },
  title: { fontSize: font.h2, fontWeight: "700", color: colors.ink },
  detail: { fontSize: font.body, color: colors.muted, marginTop: 2 },
  dev: { fontSize: font.small, color: colors.muted },
});
