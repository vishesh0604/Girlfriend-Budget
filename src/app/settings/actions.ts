"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/authUser";
import { isCurrencyCode } from "@/lib/currencies";

function isValidTimezone(
  value: unknown
): value is string {
  if (typeof value !== "string" || !value) {
    return false;
  }
  try {
    // Throws RangeError for an unknown zone.
    new Intl.DateTimeFormat("en-US", {
      timeZone: value,
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteAccount() {
  const supabase = await createClient();

  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const { error } = await supabase.rpc(
    "delete_own_account"
  );

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  await supabase.auth.signOut();

  return { success: true };
}

export async function getMyProfile() {
  const supabase = await createClient();

  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return {
      success: false as const,
      error: "You must be signed in.",
    };
  }

  const [
    { data: authData },
    { data: profile },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("profiles")
      .select("timezone, currency")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  return {
    success: true as const,
    profile: {
      email: authData?.user?.email ?? "",
      timezone:
        typeof profile?.timezone === "string" &&
        profile.timezone
          ? profile.timezone
          : "Asia/Kolkata",
      currency: isCurrencyCode(
        profile?.currency
      )
        ? profile.currency
        : "INR",
    },
  };
}

export async function updateProfile(input: {
  timezone?: string;
  currency?: string;
}) {
  const supabase = await createClient();

  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const patch: {
    id: string;
    timezone?: string;
    currency?: string;
  } = { id: userId };

  if (input.timezone !== undefined) {
    if (!isValidTimezone(input.timezone)) {
      return {
        success: false,
        error: "That timezone isn't recognised.",
      };
    }
    patch.timezone = input.timezone;
  }

  if (input.currency !== undefined) {
    if (!isCurrencyCode(input.currency)) {
      return {
        success: false,
        error: "That currency isn't supported.",
      };
    }
    patch.currency = input.currency;
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(patch, { onConflict: "id" });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/", "layout");

  return { success: true };
}
