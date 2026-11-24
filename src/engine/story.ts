// Story content: dialogue scenes, the old forecaster's notebook, newspaper headlines.
// Pure data + small pickers. The mystery: the Great Picnic Disaster (eight years ago,
// the old forecaster "called 10% rain" for the mayor's picnic and it poured). The truth,
// pieced together over a year: he called 90%. The Gazette's typesetter dropped the 9.

import type { SpecialId } from "./config";
import type { ClientId } from "./types";

export interface Scene {
  id: string;
  title: string;
  speaker: string;
  lines: string[];
}

const S = (id: string, title: string, speaker: string, ...lines: string[]): Scene => ({ id, title, speaker, lines });

export const SCENES: Record<string, Scene> = {
  // ---- client trust scenes (unlock at trust 2 and 4) ----
  "farmer-2": S("farmer-2", "Over the Fence", "Farmer Bell",
    "Your frost call saved my seedlings. I'll say this once: you're not as bad as the last one.",
    "Well. The last one was good, mostly. Until the picnic."),
  "farmer-4": S("farmer-4", "The Almanac", "Farmer Bell",
    "I kept every Gazette since '61. Picnic Day's in there. 'RAIN: 10%' in big type.",
    "Funny thing. Old Wendell came by that morning and told me to cover the hay. Why'd he do that, if he said ten?"),
  "fleet-2": S("fleet-2", "Dockside", "Captain Ruiz",
    "The boys trust a forecaster who'll say 'I don't know' when they don't know. You do that.",
    "Out on the lake, a wrong 'calm' gets people killed. A 50 is an honest answer."),
  "fleet-4": S("fleet-4", "The Squall Line", "Captain Ruiz",
    "Picnic Day, we saw the squall line from the water by ten. Black as tar.",
    "We radioed the station. Wendell said, 'I know. I called it.' Then the whole town blamed him anyway."),
  "wedding-2": S("wedding-2", "Seating Charts", "Marigold",
    "Sunshine for the Hendersons. You're my lucky charm now, don't argue.",
    "Did you know the picnic was meant to be the mayor's engagement party? Nobody's said 'picnic' at town hall since."),
  "wedding-4": S("wedding-4", "Old Photographs", "Marigold",
    "I found the photographer's proofs from Picnic Day. Look, there: Wendell, by the cake, holding an umbrella.",
    "Before the first drop fell. He knew."),
  "ski-2": S("ski-2", "Fresh Powder", "Lodge owner Sven",
    "Your snow calls fill my rooms. The city forecast just says 'cold'.",
    "Wendell used to ski here. Quiet man. Kept a notebook in his coat."),
  "ski-4": S("ski-4", "The Coat Pocket", "Lodge owner Sven",
    "His old coat's still in our lost and found. There's a torn page in the pocket. You should have it.",
    "It just says: 'Print shop. Ask Doris.'"),
  "skeptic-2": S("skeptic-2", "The Chalkboard", "Doris",
    "Hmph. You're keeping pace with the TV fella. Don't let it go to your head.",
    "I wiped Wendell's name off this board myself, you know. After the picnic."),
  "skeptic-4": S("skeptic-4", "Confession over Pie", "Doris",
    "Before the diner I set type at the Gazette. Picnic Day's forecast came in at 90. Ninety.",
    "The 9 slug was cracked. I printed it anyway, figured nobody reads the forecast. Everybody read it. I never told a soul."),

  // ---- signature days ----
  monsoon: S("monsoon", "Monsoon Onset", "Mayor Pruitt",
    "Spring rains are here. The council's watching how you handle the wet season.",
    "Wendell handled them fine, till he didn't. Don't make me regret this."),
  festival: S("festival", "Summer Festival", "Marigold",
    "Lanterns, a bandstand, and two hundred folding chairs. All I need from you is the sky."),
  countyFair: S("countyFair", "The County Fair", "Fair committee",
    "Three questions. The whole county plans around them.",
    "Chet Storm will be broadcasting live from the Ferris wheel. Try not to lose to him on home turf."),
  firstFrost: S("firstFrost", "First Frost Watch", "Farmer Bell",
    "Pumpkins are still out. Tell me straight: tonight or not?"),
  firstSnow: S("firstSnow", "First Snow Watch", "Lodge owner Sven",
    "The lifts are greased. One good snow and the season's made."),
  hundredYearStorm: S("hundredYearStorm", "The Hundred-Year Storm", "Mayor Pruitt",
    "The almanacs, the TV, and Captain Ruiz all say something huge is coming off the lake.",
    "Chet Storm says it'll miss us. The town wants your call. Same as Picnic Day, they're saying."),
  finale: S("finale", "Ninety Percent", "Mayor Pruitt",
    "Doris came to town hall. The Gazette is printing a correction, eight years late.",
    "Wendell called 90. The town owes him an apology. And you: you kept the station honest. That's the whole job."),
};

export const clientSceneId = (client: ClientId, level: number) => `${client}-${level}`;

// ---- The old forecaster's notebook (kept through succession) ----

export interface NotebookPage {
  title: string;
  text: string;
  unlock: { days?: number; rating?: number };
}

export const NOTEBOOK: NotebookPage[] = [
  { title: "Page 1", unlock: { days: 1 }, text: "For whoever has the station next: say what you believe. Not what they want. Not what's safe. What you believe." },
  { title: "Page 2", unlock: { days: 7 }, text: "The barometer never lies, but it mumbles. The knee lies loudly. Write down who was right, every day." },
  { title: "Page 3", unlock: { days: 28 }, text: "A 70 that comes true 7 times in 10 is a perfect 70. Folks will still call you wrong 3 times. Let them." },
  { title: "Page 4", unlock: { rating: 600 }, text: "The fleet listens. The farmer listens. The diner keeps score. Doris keeps it best." },
  { title: "Page 5", unlock: { days: 56 }, text: "Picnic morning: front on the lake by nine, glass falling fast. I sent 90 to the Gazette at six." },
  { title: "Page 6", unlock: { rating: 700 }, text: "They printed ten. I saw it at the diner and couldn't find the words. Who'd believe me now?" },
  { title: "Page 7", unlock: { days: 84 }, text: "If the big one ever comes off the lake, don't look at the TV. Look at the glass, and say what you see." },
  { title: "Page 8", unlock: { days: 112 }, text: "If you're reading this, you made it a year. I couldn't. Keep the station honest. —W." },
];

export function unlockedPages(days: number, rating: number): number[] {
  return NOTEBOOK.flatMap((p, i) =>
    (p.unlock.days !== undefined && days >= p.unlock.days) || (p.unlock.rating !== undefined && rating >= p.unlock.rating) ? [i] : []);
}

// ---- Newspaper headlines ----

export interface Headline {
  kicker: string; // small line above
  title: string;
  body: string;
  celebrate?: boolean;
}

export function specialHeadline(id: SpecialId, happened: boolean, youRight: boolean, name: string): Headline {
  const who = youRight ? `${name} called it.` : `${name} missed this one.`;
  switch (id) {
    case "monsoon":
      return { kicker: "SPRING", title: happened ? "THE RAINS ARRIVE" : "MONSOON HOLDS OFF", body: `Wet season opens over the valley. ${who}` };
    case "festival":
      return { kicker: "SUMMER FESTIVAL", title: happened ? "LANTERNS UNDER CLEAR SKIES" : "FESTIVAL GOERS DODGE THE WEATHER", body: who };
    case "countyFair":
      return { kicker: "COUNTY FAIR", title: youRight ? "LOCAL FORECASTER WINS THE FAIR" : "FAIR WEATHER, FOUL FORECAST", body: `The whole county planned around three calls.` };
    case "firstFrost":
      return { kicker: "AUTUMN", title: happened ? "FIRST FROST NIPS THE PUMPKINS" : "FROST HOLDS OFF ANOTHER NIGHT", body: who };
    case "firstSnow":
      return { kicker: "WINTER", title: happened ? "FIRST SNOW BLANKETS RIDGETOP" : "SNOW A NO-SHOW", body: who };
    case "hundredYearStorm":
      return {
        kicker: "SPECIAL EDITION",
        title: happened ? "THE HUNDRED-YEAR STORM" : "THE STORM THAT WASN'T",
        body: youRight ? `${name} read the glass, not the TV. The town was ready.` : `The town looked to ${name}. The sky had other plans.`,
        celebrate: youRight,
      };
  }
}

export const LONG_SHOT_HEADLINES: Record<string, string> = {
  doubleRainbow: "DOUBLE RAINBOW OVER MAIN STREET",
  auroraNight: "NORTHERN LIGHTS DANCE OVER THE LAKE",
  hundredYearStorm: "THE BIG ONE",
};
