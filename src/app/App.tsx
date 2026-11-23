import { useEffect } from "react";
import { BackHandler } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useDay } from "./useDay";
import { StationScreen } from "./StationScreen";
import { ForecastScreen } from "./ForecastScreen";
import { PlaybackScreen } from "./PlaybackScreen";
import { VerdictScreen } from "./VerdictScreen";

export default function App() {
  const m = useDay();

  // No going back once the forecast is submitted (Android hardware back).
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (m.phase === "forecast") {
        m.setPhase("station");
        return true;
      }
      return m.phase === "playback" || m.phase === "verdict";
    });
    return () => sub.remove();
  }, [m.phase, m.setPhase]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {m.phase === "station" && <StationScreen m={m} />}
      {m.phase === "forecast" && <ForecastScreen m={m} />}
      {m.phase === "playback" && <PlaybackScreen key={m.seed} m={m} />}
      {m.phase === "verdict" && <VerdictScreen m={m} />}
    </SafeAreaProvider>
  );
}
