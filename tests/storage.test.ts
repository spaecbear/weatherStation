import { describe, expect, it } from "vitest";
import { addDays, currentRating, generateDailyDay, newCareer, nextCareerDay, playCareerDay, submitDaily, newDailyState, type Step } from "../src/engine";
import { memoryStore } from "../src/storage/kv";
import { KEYS, Saves } from "../src/storage/saves";

const D0 = "2026-11-01";

describe("saves", () => {
  it("career survives a restart (new Saves over the same store)", async () => {
    const store = memoryStore();
    let c = newCareer({ name: "Ada", hardcore: false, today: D0, seedBase: 7 });
    const calls = Object.fromEntries(nextCareerDay(c).questions.map((q) => [q.id, 0.7 as Step]));
    c = playCareerDay(c, calls, D0).career;
    await new Saves(store).saveCareer(c);

    const loaded = await new Saves(store).loadCareer(); // "app restart"
    expect(loaded).toEqual(c);
    expect(nextCareerDay(loaded!)).toEqual(nextCareerDay(c));
    // decay on open is computed from the saved anchor with the mocked clock
    expect(currentRating(loaded!, addDays(D0, 10))).toBe(Math.max(300, c.forecaster.ratingAtLastPlay - 5 * 8));
  });

  it("daily survives a restart and stays locked", async () => {
    const store = memoryStore();
    const day = generateDailyDay(D0);
    const d = submitDaily(newDailyState(), D0, Object.fromEntries(day.questions.map((q) => [q.id, 0.5 as Step])));
    await new Saves(store).saveDaily(d);
    const loaded = await new Saves(store).loadDaily();
    expect(loaded).toEqual(d);
    expect(() => submitDaily(loaded, D0, {})).toThrow(/already/);
  });

  it("missing, corrupt or wrong-version saves load as empty", async () => {
    expect(await new Saves(memoryStore()).loadCareer()).toBeNull();
    expect(await new Saves(memoryStore({ [KEYS.career]: "{not json" })).loadCareer()).toBeNull();
    expect(await new Saves(memoryStore({ [KEYS.career]: JSON.stringify({ version: 99 }) })).loadCareer()).toBeNull();
    expect(await new Saves(memoryStore({ [KEYS.daily]: "garbage" })).loadDaily()).toEqual(newDailyState());
  });

  it("deleteCareer wipes it (hardcore)", async () => {
    const store = memoryStore();
    const s = new Saves(store);
    await s.saveCareer(newCareer({ name: "A", hardcore: true, today: D0, seedBase: 1 }));
    await s.deleteCareer();
    expect(await s.loadCareer()).toBeNull();
  });
});
