"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_CATEGORIES = [
  "Food",
  "Shopping",
  "Transportation",
  "Household",
  "Utility",
  "Entertainment",
];

const FALLBACK_CATEGORY_NAME = "Miscellaneous";

const MAX_CATEGORY_NAME_LENGTH = 40;

/*
 * Seed the seven starter categories the first time a user
 * opens the Daily Spending Tracker. "Miscellaneous" is the
 * protected fallback that deleted categories reassign to.
 */
export async function ensureDefaultSpendingCategories() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("spending_categories")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (existingError) {
    return {
      success: false,
      error: existingError.message,
    };
  }

  if (existing && existing.length > 0) {
    return { success: true };
  }

  const rows = [
    ...DEFAULT_CATEGORIES.map((name) => ({
      user_id: user.id,
      name,
      is_default: false,
    })),
    {
      user_id: user.id,
      name: FALLBACK_CATEGORY_NAME,
      is_default: true,
    },
  ];

  const { error: insertError } = await supabase
    .from("spending_categories")
    .insert(rows);

  if (insertError) {
    return {
      success: false,
      error: insertError.message,
    };
  }

  return { success: true };
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export async function createSpendingCategory(
  name: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const trimmed = normalizeName(name);

  if (!trimmed) {
    return {
      success: false,
      error: "Category name is required.",
    };
  }

  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
    return {
      success: false,
      error: `Category name must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer.`,
    };
  }

  const {
    data: duplicates,
    error: duplicatesError,
  } = await supabase
    .from("spending_categories")
    .select("id")
    .eq("user_id", user.id)
    .ilike("name", trimmed);

  if (duplicatesError) {
    return {
      success: false,
      error: duplicatesError.message,
    };
  }

  if (duplicates && duplicates.length > 0) {
    return {
      success: false,
      error: "You already have a category with that name.",
    };
  }

  const { error } = await supabase
    .from("spending_categories")
    .insert({
      user_id: user.id,
      name: trimmed,
      is_default: false,
    });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/daily-spending");

  return { success: true };
}

export async function renameSpendingCategory(
  categoryId: string,
  name: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const trimmed = normalizeName(name);

  if (!trimmed) {
    return {
      success: false,
      error: "Category name is required.",
    };
  }

  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
    return {
      success: false,
      error: `Category name must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer.`,
    };
  }

  const {
    data: duplicates,
    error: duplicatesError,
  } = await supabase
    .from("spending_categories")
    .select("id")
    .eq("user_id", user.id)
    .ilike("name", trimmed)
    .neq("id", categoryId);

  if (duplicatesError) {
    return {
      success: false,
      error: duplicatesError.message,
    };
  }

  if (duplicates && duplicates.length > 0) {
    return {
      success: false,
      error: "You already have a category with that name.",
    };
  }

  const { data, error } = await supabase
    .from("spending_categories")
    .update({
      name: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  if (!data) {
    return {
      success: false,
      error: "Category could not be found.",
    };
  }

  revalidatePath("/daily-spending");

  return { success: true };
}

export async function deleteSpendingCategory(
  categoryId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const {
    data: category,
    error: categoryError,
  } = await supabase
    .from("spending_categories")
    .select("id, is_default")
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (categoryError || !category) {
    return {
      success: false,
      error:
        categoryError?.message ??
        "Category could not be found.",
    };
  }

  if (category.is_default) {
    return {
      success: false,
      error:
        "The Miscellaneous category cannot be deleted.",
    };
  }

  const {
    data: fallback,
    error: fallbackError,
  } = await supabase
    .from("spending_categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_default", true)
    .maybeSingle();

  if (fallbackError || !fallback) {
    return {
      success: false,
      error:
        fallbackError?.message ??
        "The Miscellaneous category could not be found.",
    };
  }

  /*
   * Move every expense on this category to Miscellaneous.
   * The expenses themselves are never deleted.
   */
  const { error: reassignError } = await supabase
    .from("spending_entries")
    .update({
      category_id: fallback.id,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("category_id", categoryId);

  if (reassignError) {
    return {
      success: false,
      error: reassignError.message,
    };
  }

  const { error: deleteError } = await supabase
    .from("spending_categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", user.id);

  if (deleteError) {
    return {
      success: false,
      error: deleteError.message,
    };
  }

  revalidatePath("/daily-spending");

  return { success: true };
}
