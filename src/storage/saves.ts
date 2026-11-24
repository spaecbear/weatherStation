// Versioned save/load for the career and daily states. No React imports.
import { newDailyState, normalizeCareer, type CareerState, type DailyState } from "../engine";
import type { KeyValueStore } from "./kv";

export const KEYS = {
  career: "ws.career.v1",
  daily: "ws.daily.v1",
  settings: "ws.settings.v1",
};

/** Player preferences (Phase 6). Stored apart from game saves so a hardcore wipe keeps them. */
export interface Settings {
  version: 1;
  onboarded: boolean;
  textScale: 1 | 1.15 | 1.3;
  reducedMotion: boolean;
  colorBlind: boolean;
  sound: boolean;
  music: boolean;
  haptics: boolean;
}

export const defaultSettings = (): Settings => ({
  version: 1, onboarded: false, textScale: 1, reducedMotion: false, colorBlind: false, sound: true, music: true, haptics: true,
});

function parse<T extends { version: number }>(raw: string | null, version: number): T | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as T;
    return v && typeof v === "object" && v.version === version ? v : null;
  } catch {
    return null; // corrupt save: treat as missing rather than crash
  }
}

export class Saves {
  constructor(private store: KeyValueStore) {}

  async loadCareer(): Promise<CareerState | null> {
    const c = parse<CareerState>(await this.store.getItem(KEYS.career), 1);
    return c && typeof c.forecaster?.name === "string" ? normalizeCareer(c) : null;
  }
  saveCareer(c: CareerState): Promise<void> {
    return this.store.setItem(KEYS.career, JSON.stringify(c));
  }
  deleteCareer(): Promise<void> {
    return this.store.removeItem(KEYS.career);
  }

  async loadDaily(): Promise<DailyState> {
    return parse<DailyState>(await this.store.getItem(KEYS.daily), 1) ?? newDailyState();
  }
  saveDaily(d: DailyState): Promise<void> {
    return this.store.setItem(KEYS.daily, JSON.stringify(d));
  }

  async loadSettings(): Promise<Settings> {
    const s = parse<Settings>(await this.store.getItem(KEYS.settings), 1);
    return { ...defaultSettings(), ...(s ?? {}) };
  }
  saveSettings(s: Settings): Promise<void> {
    return this.store.setItem(KEYS.settings, JSON.stringify(s));
  }
}
