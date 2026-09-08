"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSpendingSnapshot } from "./spendingSnapshot";
import { isValidCategoryColor } from "./categoryColors";

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

const MAX_ENTRY_NOTE_LENGTH = 500;

function isValidDate(value: string) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Verify the date is a real calendar day (rejects e.g. Feb 30).
  // All arithmetic in UTC so the caller's timezone never matters.
  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

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

export async function updateSpendingCategory(
  categoryId: string,
  name: string,
  color: string | null
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

  let normalizedColor: string | null = null;

  if (color !== null && color !== "") {
    if (!isValidCategoryColor(color)) {
      return {
        success: false,
        error: "That colour is not valid.",
      };
    }

    normalizedColor = color.toLowerCase();
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
      color: normalizedColor,
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

type SpendingEntryInput = {
  entryDate: string;
  categoryId: string;
  amountValue: string;
  note: string;
};

async function validateSpendingEntryInput(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  userId: string,
  input: SpendingEntryInput
) {
  if (!isValidDate(input.entryDate)) {
    return {
      error: "Please choose a valid date.",
    };
  }

  const amount = Number(input.amountValue);

  if (!Number.isFinite(amount)) {
    return {
      error: "Amount must be a valid number.",
    };
  }

  if (amount <= 0) {
    return {
      error: "Amount must be greater than ₹0.",
    };
  }

  const note = input.note.trim();

  if (note.length > MAX_ENTRY_NOTE_LENGTH) {
    return {
      error: `Note must be ${MAX_ENTRY_NOTE_LENGTH} characters or fewer.`,
    };
  }

  const {
    data: category,
    error: categoryError,
  } = await supabase
    .from("spending_categories")
    .select("id")
    .eq("id", input.categoryId)
    .eq("user_id", userId)
    .maybeSingle();

  if (categoryError) {
    return { error: categoryError.message };
  }

  if (!category) {
    return {
      error: "Please choose a valid category.",
    };
  }

  return {
    value: {
      entry_date: input.entryDate,
      category_id: input.categoryId,
      amount,
      note,
    },
  };
}

export async function createSpendingEntry(
  entryDate: string,
  categoryId: string,
  amountValue: string,
  note: string
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

  const validation =
    await validateSpendingEntryInput(
      supabase,
      user.id,
      { entryDate, categoryId, amountValue, note }
    );

  if (!validation.value) {
    return {
      success: false,
      error: validation.error,
    };
  }

  const { error } = await supabase
    .from("spending_entries")
    .insert({
      user_id: user.id,
      ...validation.value,
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

export async function updateSpendingEntry(
  entryId: string,
  entryDate: string,
  categoryId: string,
  amountValue: string,
  note: string
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

  const validation =
    await validateSpendingEntryInput(
      supabase,
      user.id,
      { entryDate, categoryId, amountValue, note }
    );

  if (!validation.value) {
    return {
      success: false,
      error: validation.error,
    };
  }

  const { data, error } = await supabase
    .from("spending_entries")
    .update({
      ...validation.value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
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
      error: "This expense could not be found.",
    };
  }

  revalidatePath("/daily-spending");

  return { success: true };
}

export async function deleteSpendingEntry(
  entryId: string
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

  const { error } = await supabase
    .from("spending_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/daily-spending");

  return { success: true };
}

function isValidMonthStartValue(value: string) {
  return /^\d{4}-\d{2}-01$/.test(value);
}

export async function createSpendingMove(
  monthStart: string,
  amountValue: string,
  destinationKind: string,
  destinationMonthlyHeadId: string | null
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

  if (!isValidMonthStartValue(monthStart)) {
    return {
      success: false,
      error: "The month could not be identified.",
    };
  }

  const amount = Number(amountValue);

  if (!Number.isFinite(amount)) {
    return {
      success: false,
      error: "Amount must be a valid number.",
    };
  }

  if (amount <= 0) {
    return {
      success: false,
      error: "Amount must be greater than ₹0.",
    };
  }

  if (
    destinationKind !== "next_month" &&
    destinationKind !== "budget_head"
  ) {
    return {
      success: false,
      error: "Choose where to move the money.",
    };
  }

  let resolvedHeadId: string | null = null;

  if (destinationKind === "budget_head") {
    if (!destinationMonthlyHeadId) {
      return {
        success: false,
        error: "Choose a budget head to move it to.",
      };
    }

    const {
      data: budget,
      error: budgetError,
    } = await supabase
      .from("monthly_budgets")
      .select("id")
      .eq("user_id", user.id)
      .eq("month_start", monthStart)
      .maybeSingle();

    if (budgetError) {
      return {
        success: false,
        error: budgetError.message,
      };
    }

    if (!budget) {
      return {
        success: false,
        error:
          "This month's fixed budget does not exist yet.",
      };
    }

    const {
      data: head,
      error: headError,
    } = await supabase
      .from("monthly_budget_heads")
      .select("id")
      .eq("id", destinationMonthlyHeadId)
      .eq("user_id", user.id)
      .eq("monthly_budget_id", budget.id)
      .maybeSingle();

    if (headError) {
      return {
        success: false,
        error: headError.message,
      };
    }

    if (!head) {
      return {
        success: false,
        error:
          "That budget head is not part of this month.",
      };
    }

    resolvedHeadId = head.id;
  }

  const snapshot = await getSpendingSnapshot(
    supabase,
    user.id,
    monthStart
  );

  if (amount > snapshot.remaining) {
    return {
      success: false,
      error: `You can move at most ₹${snapshot.remaining.toLocaleString(
        "en-IN"
      )}.`,
    };
  }

  const { error } = await supabase
    .from("spending_moves")
    .insert({
      user_id: user.id,
      month_start: monthStart,
      amount,
      destination_kind: destinationKind,
      destination_monthly_head_id:
        resolvedHeadId,
    });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/daily-spending");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function deleteSpendingMove(
  moveId: string
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

  const { error } = await supabase
    .from("spending_moves")
    .delete()
    .eq("id", moveId)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/daily-spending");
  revalidatePath("/dashboard");

  return { success: true };
}

type SpendingCreditInput = {
  entryDate: string;
  amountValue: string;
  note: string;
};

function validateSpendingCreditInput(
  input: SpendingCreditInput
) {
  if (!isValidDate(input.entryDate)) {
    return {
      error: "Please choose a valid date.",
    };
  }

  const amount = Number(input.amountValue);

  if (!Number.isFinite(amount)) {
    return {
      error: "Amount must be a valid number.",
    };
  }

  if (amount <= 0) {
    return {
      error: "Amount must be greater than ₹0.",
    };
  }

  const note = input.note.trim();

  if (note.length > MAX_ENTRY_NOTE_LENGTH) {
    return {
      error: `Note must be ${MAX_ENTRY_NOTE_LENGTH} characters or fewer.`,
    };
  }

  return {
    value: {
      entry_date: input.entryDate,
      amount,
      note,
    },
  };
}

export async function createSpendingCredit(
  entryDate: string,
  amountValue: string,
  note: string
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

  const validation =
    validateSpendingCreditInput({
      entryDate,
      amountValue,
      note,
    });

  if (!validation.value) {
    return {
      success: false,
      error: validation.error,
    };
  }

  const { error } = await supabase
    .from("spending_credits")
    .insert({
      user_id: user.id,
      ...validation.value,
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

export async function updateSpendingCredit(
  creditId: string,
  entryDate: string,
  amountValue: string,
  note: string
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

  const validation =
    validateSpendingCreditInput({
      entryDate,
      amountValue,
      note,
    });

  if (!validation.value) {
    return {
      success: false,
      error: validation.error,
    };
  }

  const { data, error } = await supabase
    .from("spending_credits")
    .update({
      ...validation.value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", creditId)
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
      error: "This credit could not be found.",
    };
  }

  revalidatePath("/daily-spending");

  return { success: true };
}

export async function deleteSpendingCredit(
  creditId: string
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

  const { error } = await supabase
    .from("spending_credits")
    .delete()
    .eq("id", creditId)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/daily-spending");

  return { success: true };
}
