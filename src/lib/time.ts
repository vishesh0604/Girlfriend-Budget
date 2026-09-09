/*
 * The app is used from India (IST, UTC+5:30, no DST). Server code runs
 * in UTC on Vercel but in the machine's zone locally, so anything that
 * decides "what day is it" server-side must go through here or it will
 * be off by up to 5.5 hours (wrong day late at night IST).
 *
 * Returns a Date whose UTC getters (getUTCFullYear / getUTCMonth /
 * getUTCDate / getUTCHours ...) read as the current IST wall clock.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function nowInIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}
