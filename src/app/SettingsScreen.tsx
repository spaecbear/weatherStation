import { Pressable, Switch, Text, View } from "react-native";
import type { Settings } from "../storage";
import { Body, Button, Card, H2, Panel, Screen } from "../components/ui";
import { colors, type } from "./theme";

function Toggle({ label, hint, value, onChange, testID }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void; testID: string }) {
  return (
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <H2>{label.toUpperCase()}</H2>
        <Body muted>{hint}</Body>
      </View>
      <Switch testID={testID} accessibilityLabel={label} value={value} onValueChange={onChange} />
    </Card>
  );
}

export function SettingsScreen({ settings, onChange, onTutorial, onBack }: { settings: Settings; onChange: (s: Settings) => void; onTutorial: () => void; onBack: () => void }) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v });
  return (
    <Screen title="Settings" footer={<Button kind="ghost" label="Back" onPress={onBack} />}>
      <Card style={{ gap: 10 }}>
        <H2>TEXT SIZE</H2>
        <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
          {([[1, "Normal"], [1.15, "Large"], [1.3, "Largest"]] as const).map(([v, label]) => (
            <Pressable key={v} testID={`text-${v}`} accessibilityRole="radio" aria-checked={settings.textScale === v} onPress={() => set("textScale", v)} style={{ flex: 1 }}>
              <Panel tone={settings.textScale === v ? "gold" : "sunk"} style={{ paddingVertical: 10, alignItems: "center" }}>
                <Text style={[type.label, { color: settings.textScale === v ? "#1a1406" : colors.ink }]}>{label.toUpperCase()}</Text>
              </Panel>
            </Pressable>
          ))}
        </View>
      </Card>
      <Toggle testID="set-reduced" label="Reduced motion" hint="No falling rain, lightning flashes or bouncing banners. The day still plays out." value={settings.reducedMotion} onChange={(v) => set("reducedMotion", v)} />
      <Toggle testID="set-colorblind" label="Colour-blind palette" hint="Blue and orange for good and bad, instead of green and red. Icons and +/- signs are always shown too." value={settings.colorBlind} onChange={(v) => set("colorBlind", v)} />
      <Toggle testID="set-sound" label="Sound effects" hint="Wind, rain, thunder and reveal stings." value={settings.sound} onChange={(v) => set("sound", v)} />
      <Toggle testID="set-music" label="Music" hint="The station's theme tune." value={settings.music} onChange={(v) => set("music", v)} />
      <Toggle testID="set-haptics" label="Haptics" hint="A buzz on each reveal and on a perfect day (phones only)." value={settings.haptics} onChange={(v) => set("haptics", v)} />
      <Button testID="replay-tutorial" kind="ghost" label="Replay the first-day guide" onPress={onTutorial} />
    </Screen>
  );
}
