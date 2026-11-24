// Onboarding: a guided first day narrated by the old forecaster's notebook, plus
// short tips for a new career's first week. Content only; the day is a normal zen round.
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { generateDay, type Day } from "../engine";
import { Icon } from "../components/Sprite";
import { BOOK, ICON_PALETTE } from "../components/pixelArt";
import { colors, fonts, type } from "./theme";
import type { Phase } from "./useRound";

export const TUTORIAL_SEED = 31337;
export const tutorialDay = (): Day => generateDay(TUTORIAL_SEED, "spring");

/** A note from Wendell's notebook. Used for coaching and tips. */
export function NoteCard({ title, children, testID }: { title: string; children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} style={{ backgroundColor: "#e9dfc4", borderWidth: 3, borderColor: colors.outline, padding: 12, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon rows={BOOK} palette={ICON_PALETTE} px={2} />
        <Text style={{ fontFamily: fonts.pixel, fontSize: type.label.fontSize, color: "#4a3b22" }}>{title.toUpperCase()}</Text>
      </View>
      {typeof children === "string" ? <Text style={{ fontFamily: fonts.body, fontSize: type.body.fontSize, lineHeight: type.body.lineHeight, color: "#2f2617" }}>{children}</Text> : children}
    </View>
  );
}

const P = ({ children }: { children: string }) => (
  <Text style={{ fontFamily: fonts.body, fontSize: type.body.fontSize, lineHeight: type.body.lineHeight, color: "#2f2617" }}>{children}</Text>
);

export const COACH: Record<Phase, ReactNode> = {
  station: (
    <NoteCard title="How to read the station" testID="coach-station">
      <P>Every morning, start here. Each card is a clue about the day's hidden weather.</P>
      <P>Instruments (barometer, hygrometer, sky) are steady. Folk signs, like the farmer's knee, might be wisdom or might be nonsense.</P>
      <P>Tap any card to learn what it measures. Then make your forecast.</P>
    </NoteCard>
  ),
  forecast: (
    <NoteCard title="How sure are you?" testID="coach-forecast">
      <P>Three questions a day. For each, pick how likely you think it is.</P>
      <P>50% means "no idea": you can't win or lose. 70% or 30% is a lean. 90% or 10% is a bold call: big win if right, big loss if wrong.</P>
      <P>The line under each question shows exactly what's at stake. Say what you truly believe. Over time, honesty pays best.</P>
    </NoteCard>
  ),
  playback: (
    <NoteCard title="The sweat" testID="coach-playback">
      <P>Now the day plays out. When a question is about to be decided, time slows down. Watch the sky.</P>
    </NoteCard>
  ),
  verdict: (
    <NoteCard title="The verdict" testID="coach-verdict">
      <P>Each call is scored. Get all three on the right side, with no 50s, for a Perfect Day bonus.</P>
      <P>The blue line under each question names the clue that mattered. That's the whole job: read, decide, learn.</P>
      <P>This was a practice day. Nothing counted. The station is yours when you're ready.</P>
    </NoteCard>
  ),
};

/** One tip per day for a new forecaster's first week (shown in the office). */
export const FIRST_WEEK_TIPS: { title: string; text: string }[] = [
  { title: "Your standing", text: "The town's trust in you is your standing. Good calls raise it. If it ever falls to 150, the council retires you. Skipping days never can." },
  { title: "Money and the shop", text: "Each day pays a little, more for good days. Save up at the shop for better instruments. The thermometer helps with the hard 'will the high top' questions." },
  { title: "Folk signs", text: "The journal records whether each folk sign was right. After a few weeks you'll know which ones to trust." },
  { title: "Clients", text: "Some days a client posts a contract: the farmer, the fleet, the wedding planner. Do well and they trust you more, and pay more." },
  { title: "Long-range calls", text: "In the first week of each season, you can call how rainy the whole season will be. It's scored when the season ends." },
  { title: "Chet Storm", text: "The TV forecaster makes his calls too. Doris keeps score on the diner chalkboard. He's bold. Boldness isn't the same as being right." },
  { title: "Calibration", text: "The chart shows how often things happened when you said 70%. If it's close to 70%, your confidence is honest. That's the goal." },
];
