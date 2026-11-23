import { Pressable, Text, View } from "react-native";
import { FORECAST_STEPS, type Step } from "../engine";
import { colors, type } from "../app/theme";
import { Panel } from "./ui";

export function StepSelector({ value, onChange, testID }: { value?: Step; onChange: (s: Step) => void; testID?: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 5 }} accessibilityRole="radiogroup" testID={testID}>
      {FORECAST_STEPS.map((step) => {
        const on = value === step;
        return (
          <Pressable key={step} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onChange(step)} style={{ flex: 1 }}>
            {({ pressed }) => (
              <Panel tone={on ? "gold" : "sunk"} pressed={pressed} style={{ paddingVertical: 11, alignItems: "center" }}>
                <Text style={[type.label, { fontSize: 10, color: on ? "#1a1406" : colors.ink }]}>{Math.round(step * 100)}%</Text>
              </Panel>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
