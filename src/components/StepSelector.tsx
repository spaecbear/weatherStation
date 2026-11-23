import { Pressable, StyleSheet, Text, View } from "react-native";
import { FORECAST_STEPS, type Step } from "../engine";
import { colors, font } from "../app/theme";

export function StepSelector({ value, onChange, testID }: { value?: Step; onChange: (s: Step) => void; testID?: string }) {
  return (
    <View style={s.row} accessibilityRole="radiogroup" testID={testID}>
      {FORECAST_STEPS.map((step) => {
        const on = value === step;
        return (
          <Pressable
            key={step}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(step)}
            style={[s.cell, on && s.on]}
          >
            <Text style={[s.text, on && s.onText]}>{Math.round(step * 100)}%</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  cell: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: "center", backgroundColor: "#fff" },
  on: { backgroundColor: colors.accent, borderColor: colors.accent },
  text: { fontSize: font.body, fontWeight: "600", color: colors.ink },
  onText: { color: "#fff" },
});
