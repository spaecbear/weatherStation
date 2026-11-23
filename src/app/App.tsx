import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  careerSources, currentStreak, dailyNumber, dailyResult, generateDailyDay, generateDay, isCareerRetired, mulberry32,
  newCareer, nextCareerDay, pick, playCareerDay, playDay, SEASONS, STARTING_SOURCES, shareCard, submitDaily, succeed,
  type CareerDayOutcome, type CareerState, type DailyState, type Day,
} from "../engine";
import { saves } from "../storage";
import { Body, Button, Card, H2 } from "../components/ui";
import { MenuScreen } from "./MenuScreen";
import { Round } from "./Round";
import { CareerSetupScreen, FarewellScreen, HistoryWallScreen, OfficeScreen } from "./CareerScreens";
import { shiftClock, todayUtc } from "./clock";
import { colors } from "./theme";
import { signed } from "./signalText";

type Route =
  | { name: "menu" }
  | { name: "daily" }
  | { name: "zen"; seed: number }
  | { name: "careerSetup" }
  | { name: "office" }
  | { name: "careerRound"; day: Day }
  | { name: "farewell" }
  | { name: "wall" };

const randomSeed = () => Math.floor(Math.random() * 2 ** 32);
const zenDay = (seed: number) => generateDay(seed, pick(mulberry32(seed ^ 0x5eaa), SEASONS));

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [daily, setDaily] = useState<DailyState | null>(null);
  const [career, setCareer] = useState<CareerState | null>(null);
  const [route, setRoute] = useState<Route>({ name: "menu" });
  const [today, setToday] = useState(todayUtc());
  const [lastCareerDay, setLastCareerDay] = useState<CareerDayOutcome | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([saves.loadDaily(), saves.loadCareer()]).then(([d, c]) => {
      setDaily(d);
      setCareer(c);
      setLoaded(true);
    });
  }, []);

  const toMenu = useCallback(() => {
    setToday(todayUtc());
    setRoute({ name: "menu" });
  }, []);

  const updateCareer = useCallback((c: CareerState | null) => {
    setCareer(c);
    void (c ? saves.saveCareer(c) : saves.deleteCareer());
  }, []);

  const todaysDaily = useMemo(() => generateDailyDay(today), [today]);

  if (!loaded || !daily) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}><ActivityIndicator /></View>;
  }

  let screen: React.ReactNode;
  switch (route.name) {
    case "menu":
      screen = (
        <MenuScreen
          today={today} daily={daily} career={career}
          devNextDay={() => { shiftClock(1); setToday(todayUtc()); }}
          go={(to) => {
            if (to === "daily") { setCopied(false); setRoute({ name: "daily" }); }
            if (to === "zen") setRoute({ name: "zen", seed: randomSeed() });
            if (to === "wall") setRoute({ name: "wall" });
            if (to === "career") setRoute(!career ? { name: "careerSetup" } : isCareerRetired(career, today) ? { name: "farewell" } : { name: "office" });
          }}
        />
      );
      break;

    case "daily": {
      const done = dailyResult(daily, today);
      const existing = done ? { calls: daily.entries[today]!.calls, result: done.result } : undefined;
      screen = (
        <Round
          key={`daily-${today}`}
          day={todaysDaily} mode="daily" sources={STARTING_SOURCES} existing={existing}
          subtitle={`Daily Forecast #${dailyNumber(today)}`}
          onLeave={toMenu}
          commit={(calls) => {
            const next = submitDaily(daily, today, calls); // locked from here on
            setDaily(next);
            void saves.saveDaily(next);
            return dailyResult(next, today)!.result;
          }}
          verdictExtra={done ? <DailyShare text={shareCard(today, todaysDaily, done.result)} streak={currentStreak(daily, today)} copied={copied} onCopy={async (t) => { await Clipboard.setStringAsync(t); setCopied(true); }} /> : null}
          verdictActions={<Button label="Menu" onPress={toMenu} />}
        />
      );
      break;
    }

    case "zen":
      screen = (
        <Round
          key={`zen-${route.seed}`}
          day={zenDay(route.seed)} mode="zen" sources={STARTING_SOURCES}
          subtitle="Zen"
          onLeave={toMenu}
          commit={(calls) => playDay(zenDay(route.seed), calls, "zen")}
          verdictActions={<>
            <Button testID="zen-next" label="Another day" onPress={() => setRoute({ name: "zen", seed: randomSeed() })} />
            <Button kind="ghost" label="Menu" onPress={toMenu} />
          </>}
        />
      );
      break;

    case "careerSetup":
      screen = (
        <CareerSetupScreen
          onBack={toMenu}
          onStart={(name, hardcore) => {
            updateCareer(newCareer({ name, hardcore, today, seedBase: randomSeed() }));
            setRoute({ name: "office" });
          }}
        />
      );
      break;

    case "office":
      screen = (
        <OfficeScreen
          career={career!} today={today}
          onForecast={() => { setLastCareerDay(null); setRoute({ name: "careerRound", day: nextCareerDay(career!) }); }}
          onWall={() => setRoute({ name: "wall" })}
          onMenu={toMenu}
        />
      );
      break;

    case "careerRound": {
      const out = lastCareerDay;
      screen = (
        <Round
          key={`career-${route.day.seed}`}
          day={route.day} mode="career" sources={careerSources(career!)}
          subtitle={`${career!.forecaster.name} · day ${career!.forecaster.dayCount + (out ? 0 : 1)}`}
          onLeave={() => setRoute({ name: "office" })}
          commit={(calls) => {
            const o = playCareerDay(career!, calls, today); // saved before playback
            updateCareer(o.career);
            setLastCareerDay(o);
            return o.result;
          }}
          verdictExtra={out ? (
            <Card style={{ gap: 4 }}>
              <H2>Standing in town: {out.ratingBefore} → {out.ratingAfter} ({signed(out.ratingAfter - out.ratingBefore)})</H2>
              {out.retired ? <Body>The council has called a meeting…</Body> : null}
            </Card>
          ) : null}
          verdictActions={out?.retired
            ? <Button testID="to-farewell" label="Go to the council meeting" onPress={() => setRoute({ name: "farewell" })} />
            : <Button testID="to-office" label="Back to the office" onPress={() => setRoute({ name: "office" })} />}
        />
      );
      break;
    }

    case "farewell":
      screen = (
        <FarewellScreen
          career={career!} today={today}
          onContinue={(apprentice) => {
            const next = succeed(career!, apprentice, today);
            updateCareer(next);
            setRoute(next ? { name: "office" } : { name: "careerSetup" });
          }}
        />
      );
      break;

    case "wall":
      screen = <HistoryWallScreen career={career} today={today} onBack={toMenu} />;
      break;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen}
    </SafeAreaProvider>
  );
}

function DailyShare({ text, streak, copied, onCopy }: { text: string; streak: number; copied: boolean; onCopy: (t: string) => void }) {
  return (
    <Card style={{ gap: 8 }}>
      <H2>Share your day</H2>
      <View style={{ backgroundColor: "#fff", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.line }}>
        <Body>{text}</Body>
      </View>
      <Button testID="copy-share" kind="ghost" label={copied ? "Copied ✓" : "Copy to clipboard"} onPress={() => onCopy(text)} />
      <Body muted>{streak > 0 ? `Daily streak: ${streak}. ` : ""}Come back tomorrow for a new sky.</Body>
    </Card>
  );
}
