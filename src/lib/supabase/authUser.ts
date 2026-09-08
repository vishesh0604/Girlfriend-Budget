import type { createClient } from "./server";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createClient>
>;

/*
 * The signed-in user's id.
 *
 * getClaims() verifies the session JWT locally against the project's
 * cached public signing key - no network round-trip, unlike getUser()
 * which asks the Auth server to validate the token on every call.
 *
 * (If the project is still on the legacy shared JWT secret, getClaims()
 * transparently falls back to getUser() - correct, just not faster.
 * Switching "JWT Signing Keys" to an asymmetric key in the Supabase
 * dashboard makes every call here local.)
 */
export async function getAuthUserId(
  supabase: SupabaseServerClient
): Promise<string | null> {
  const { data } =
    await supabase.auth.getClaims();

  const sub = data?.claims?.sub;

  return typeof sub === "string" ? sub : null;
}
