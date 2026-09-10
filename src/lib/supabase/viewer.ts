import type { createClient } from "./server";
import {
  DEFAULT_TIME_ZONE,
  nowInZone,
  monthStartOf,
} from "@/lib/time";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createClient>
>;

/*
 * The signed-in user's timezone (profiles.timezone), falling back to the
 * app default. Everything server-side that decides "what day / month is
 * it" should go through here.
 */
export async function getViewerTimeZone(
  supabase: SupabaseServerClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();

  const tz = data?.timezone;
  return typeof tz === "string" && tz
    ? tz
    : DEFAULT_TIME_ZONE;
}

/** "Now" as a Date whose UTC getters read as the viewer's wall clock. */
export async function getViewerNow(
  supabase: SupabaseServerClient,
  userId: string
): Promise<Date> {
  return nowInZone(
    await getViewerTimeZone(supabase, userId)
  );
}

/** "YYYY-MM-01" for the viewer's current month. */
export async function getViewerMonthStart(
  supabase: SupabaseServerClient,
  userId: string
): Promise<string> {
  return monthStartOf(
    await getViewerNow(supabase, userId)
  );
}
