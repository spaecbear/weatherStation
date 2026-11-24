const DAY_MS = 86_400_000;

export function utcDayNumber(dateUtc: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateUtc)) throw new Error(`Invalid date: ${dateUtc}`);
  const t = Date.parse(`${dateUtc}T00:00:00Z`);
  if (Number.isNaN(t)) throw new Error(`Invalid date: ${dateUtc}`);
  return Math.floor(t / DAY_MS);
}

export function addDays(dateUtc: string, n: number): string {
  return new Date((utcDayNumber(dateUtc) + n) * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return utcDayNumber(b) - utcDayNumber(a);
}

/** Today's date in UTC as YYYY-MM-DD. */
export function utcDateOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The device's local calendar date as YYYY-MM-DD (used for the daily reset). */
export function localDateOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
