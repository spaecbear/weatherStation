import { useEffect, type ReactNode } from "react";
import { BackHandler } from "react-native";
import { useRound, type RoundOptions } from "./useRound";
import { StationScreen } from "./StationScreen";
import { ForecastScreen } from "./ForecastScreen";
import { PlaybackScreen } from "./PlaybackScreen";
import { VerdictScreen } from "./VerdictScreen";

export interface RoundProps extends RoundOptions {
  subtitle: string;
  onLeave: () => void; // back out before submitting
  verdictExtra?: ReactNode;
  verdictRival?: { name: string; calls: Record<string, number>; rep: number; yourRep: number };
  /** Shown at the top of the station screen (signature-day scene). */
  stationIntro?: ReactNode;
  verdictActions: ReactNode;
}

export function Round(p: RoundProps) {
  const m = useRound(p);

  // Android back: allowed before submitting, blocked once the forecast is locked.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (m.phase === "forecast") m.setPhase("station");
      else if (m.phase === "station") p.onLeave();
      return true;
    });
    return () => sub.remove();
  }, [m.phase, m.setPhase, p.onLeave]);

  switch (m.phase) {
    case "station":
      return <StationScreen m={m} subtitle={p.subtitle} onLeave={p.onLeave} intro={p.stationIntro} />;
    case "forecast":
      return <ForecastScreen m={m} />;
    case "playback":
      return <PlaybackScreen m={m} />;
    case "verdict":
      return <VerdictScreen m={m} extra={p.verdictExtra} actions={p.verdictActions} rival={p.verdictRival} />;
  }
}
