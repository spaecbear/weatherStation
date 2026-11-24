import { Pressable, Text, View } from "react-native";
import { currentRating, currentStreak, dailyNumber, hasPlayedDaily, type CareerState, type DailyState } from "../engine";
import { Button, Panel, Screen } from "../components/ui";
import { Icon } from "../components/Sprite";
import { ICON_PALETTE, MENU_ICONS } from "../components/pixelArt";
import { Sky } from "../components/Sky";
import { colors, type } from "./theme";

interface Props {
  today: string;
  daily: DailyState;
  career: CareerState | null;
  go: (to: "daily" | "career" | "zen" | "wall" | "calibration") => void;
  devNextDay: () => void;
}

const TITLE_SNAP = { hour: 17, cloudCover: 0.85, rain: 3.5, temperature: 58, wind: 18, fog: false };

export function MenuScreen({ today, daily, career, go, devNextDay }: Props) {
  const played = hasPlayedDaily(daily, today);
  const streak = currentStreak(daily, today);
  return (
    <Screen title="Weather Station" subtitle="Small town. Big sky. Your call." footer={
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={type.label}>UTC {today}</Text>
        <View style={{ width: 150 }}><Button kind="ghost" label="Dev +1 day" onPress={devNextDay} testID="dev-next-day" /></View>
      </View>
    }>
      <Sky snap={TITLE_SNAP} timeMs={0} />
      <Tile testID="menu-daily" icon="daily" title={`Daily #${dailyNumber(today)}`} onPress={() => go("daily")}
        detail={`${played ? "Played today ✓" : "Same sky for everyone. One try."}${streak ? ` Streak ${streak}.` : ""}`} />
      <Tile testID="menu-career" icon="career" title="Career" onPress={() => go("career")}
        detail={career ? `${career.forecaster.name} · rating ${currentRating(career, today)}` : "Become the town's forecaster."} />
      <Tile testID="menu-zen" icon="zen" title="Zen" detail="Endless random days. Nothing saved." onPress={() => go("zen")} />
      <Tile testID="menu-calibration" icon="calibration" title="Calibration" detail="How honest is your confidence?" onPress={() => go("calibration")} />
      <Tile testID="menu-wall" icon="wall" title="History Wall" detail="Every forecaster who held the station." onPress={() => go("wall")} />
    </Screen>
  );
}

function Tile({ icon, title, detail, onPress, testID }: { icon: keyof typeof MENU_ICONS; title: string; detail: string; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Panel pressed={pressed} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14 }}>
          <Panel tone="sunk" style={{ padding: 6 }}><Icon rows={MENU_ICONS[icon]} palette={ICON_PALETTE} px={4} /></Panel>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={type.h2}>{title.toUpperCase()}</Text>
            <Text style={[type.body, { color: colors.muted }]}>{detail}</Text>
          </View>
        </Panel>
      )}
    </Pressable>
  );
}
