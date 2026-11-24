// The app's notion of "today": the player's LOCAL calendar date, so the daily
// resets at local midnight. Overridable for dev/testing:
//  - web: ?today=YYYY-MM-DD in the URL
//  - any platform: the dev "+1 day" button on the menu (in-memory offset)
import { addDays, localDateOf } from "../engine";

function urlOverride(): string | null {
  const loc = (globalThis as { location?: { search?: string } }).location;
  const m = loc?.search?.match(/[?&]today=(\d{4}-\d{2}-\d{2})/);
  return m ? m[1]! : null;
}

let offsetDays = 0;
export const shiftClock = (n: number) => void (offsetDays += n);
export const today = (): string => addDays(urlOverride() ?? localDateOf(new Date()), offsetDays);
