/*
 * Server code runs in UTC on Vercel (and the machine's zone locally), so
 * anything that decides "what day is it" must resolve to the *viewer's*
 * timezone or it can be off by hours — the wrong day late at night.
 *
 * `nowInZone(tz)` returns a Date whose UTC getters (getUTCFullYear /
 * getUTCMonth / getUTCDate / getUTCHours …) read as the current wall
 * clock in `tz`. The viewer's tz comes from profiles.timezone — see
 * `src/lib/supabase/viewer.ts`.
 */

export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

export function nowInZone(
  timeZone: string
): Date {
  const now = new Date();

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(now);
  } catch {
    // Unknown zone — fall back to the default.
    if (timeZone !== DEFAULT_TIME_ZONE) {
      return nowInZone(DEFAULT_TIME_ZONE);
    }
    return now;
  }

  const get = (type: string) =>
    Number(
      parts.find((p) => p.type === type)
        ?.value ?? "0"
    );

  let hour = get("hour");
  if (hour === 24) hour = 0; // some engines emit "24" at midnight

  return new Date(
    Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      hour,
      get("minute"),
      get("second")
    )
  );
}

/** "YYYY-MM-01" for the month a (zone-adjusted) Date falls in. */
export function monthStartOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}-01`;
}
