"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSpendingSnapshot } from "./spendingSnapshot";
import { getAuthUserId } from "@/lib/supabase/authUser";
import { isValidCategoryColor } from "./categoryColors";
import {
  monthsInRange,
  type SpendingReport,
} from "./spendingReport";

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

  const userId = await getAuthUserId(supabase);

  if (!userId) {
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
    .eq("user_id", userId)
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
      user_id: userId,
      name,
      is_default: false,
    })),
    {
      user_id: userId,
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

  const userId = await getAuthUserId(supabase);

  if (!userId) {
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
    .eq("user_id", userId)
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
      user_id: userId,
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

  const userId = await getAuthUserId(supabase);

  if (!userId) {
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
    .eq("user_id", userId)
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
    .eq("user_id", userId)
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

  const userId = await getAuthUserId(supabase);

  if (!userId) {
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
    .eq("user_id", userId)
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
    .eq("user_id", userId)
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
    .eq("user_id", userId)
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
    .eq("user_id", userId);

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

  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const validation =
    await validateSpendingEntryInput(
      supabase,
      userId,
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
      user_id: userId,
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

  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const validation =
    await validateSpendingEntryInput(
      supabase,
      userId,
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
    .eq("user_id", userId)
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

  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const { error } = await supabase
    .from("spending_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

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

  const userId = await getAuthUserId(supabase);

  if (!userId) {
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
      .eq("user_id", userId)
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
      .eq("user_id", userId)
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
    userId,
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
      user_id: userId,
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

  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const { error } = await supabase
    .from("spending_moves")
    .delete()
    .eq("id", moveId)
    .eq("user_id", userId);

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

  const userId = await getAuthUserId(supabase);

  if (!userId) {
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
      user_id: userId,
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

  const userId = await getAuthUserId(supabase);

  if (!userId) {
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
    .eq("user_id", userId)
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

  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const { error } = await supabase
    .from("spending_credits")
    .delete()
    .eq("id", creditId)
    .eq("user_id", userId);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/daily-spending");

  return { success: true };
}

// Per-month snapshots are the slow part; cap how many a report will run.
const REPORT_MONTH_SNAPSHOT_CAP = 24;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

/*
 * Gather everything the Monthly Report popup needs for a date range.
 * `fromDate` empty means "from the first transaction"; `toDate` empty
 * means "up to today". Both inclusive, "YYYY-MM-DD".
 */
export async function generateSpendingReport(
  fromDate: string,
  toDate: string
): Promise<
  | { success: true; report: SpendingReport }
  | { success: false; error: string }
> {
  const supabase = await createClient();

  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad2(
    today.getMonth() + 1
  )}-${pad2(today.getDate())}`;

  const from = fromDate || "2000-01-01";
  const to = toDate || todayStr;

  if (
    !isValidDate(from) ||
    !isValidDate(to) ||
    from > to
  ) {
    return {
      success: false,
      error: "Pick a valid date range.",
    };
  }

  const fromMonth = `${from.slice(0, 7)}-01`;
  const toMonth = `${to.slice(0, 7)}-01`;

  const [
    entriesResult,
    creditsResult,
    movesResult,
    headsResult,
  ] = await Promise.all([
    supabase
      .from("spending_entries")
      .select(
        "entry_date, amount, note, spending_categories (name, color)"
      )
      .eq("user_id", userId)
      .gte("entry_date", from)
      .lte("entry_date", to)
      .order("entry_date", { ascending: true }),
    supabase
      .from("spending_credits")
      .select("entry_date, amount, note")
      .eq("user_id", userId)
      .gte("entry_date", from)
      .lte("entry_date", to)
      .order("entry_date", { ascending: true }),
    supabase
      .from("spending_moves")
      .select(
        "month_start, amount, destination_kind, destination_monthly_head_id"
      )
      .eq("user_id", userId)
      .gte("month_start", fromMonth)
      .lte("month_start", toMonth)
      .order("month_start", { ascending: true }),
    supabase
      .from("monthly_budget_heads")
      .select("id, budget_heads (name)")
      .eq("user_id", userId),
  ]);

  for (const result of [
    entriesResult,
    creditsResult,
    movesResult,
    headsResult,
  ]) {
    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }
  }

  const headNameById = new Map<string, string>();

  for (const row of headsResult.data ?? []) {
    const head = Array.isArray(row.budget_heads)
      ? row.budget_heads[0]
      : row.budget_heads;

    if (head?.name) {
      headNameById.set(
        row.id as string,
        head.name as string
      );
    }
  }

  const entries = (
    entriesResult.data ?? []
  ).map((row) => {
    const category = Array.isArray(
      row.spending_categories
    )
      ? row.spending_categories[0]
      : row.spending_categories;

    return {
      date: row.entry_date as string,
      category:
        (category?.name as string) ??
        "Uncategorised",
      color:
        (category?.color as string | null) ??
        null,
      amount: Number(row.amount),
      note: (row.note as string) ?? "",
    };
  });

  const credits = (
    creditsResult.data ?? []
  ).map((row) => ({
    date: row.entry_date as string,
    amount: Number(row.amount),
    note: (row.note as string) ?? "",
  }));

  const moves = (movesResult.data ?? []).map(
    (row) => ({
      month: row.month_start as string,
      amount: Number(row.amount),
      label:
        row.destination_kind === "next_month"
          ? "Next month's pool"
          : headNameById.get(
              row.destination_monthly_head_id as string
            ) ?? "a budget head",
    })
  );

  // "All time" - anchor the range to the first real transaction.
  const earliest =
    entries[0]?.date ??
    credits[0]?.date ??
    moves[0]?.month ??
    to;

  const actualFrom = fromDate ? from : earliest;

  const monthList = monthsInRange(
    `${actualFrom.slice(0, 7)}-01`,
    toMonth
  );

  let months: SpendingReport["months"];

  if (
    monthList.length <=
    REPORT_MONTH_SNAPSHOT_CAP
  ) {
    const snapshots = await Promise.all(
      monthList.map((month) =>
        getSpendingSnapshot(
          supabase,
          userId,
          month
        )
      )
    );

    months = monthList.map((month, index) => ({
      month,
      pool: snapshots[index].available,
      spent: snapshots[index].totalSpent,
      credited: snapshots[index].credits,
      movedOut: snapshots[index].movedOut,
      remaining: snapshots[index].remaining,
    }));
  } else {
    const tally = new Map<
      string,
      {
        spent: number;
        credited: number;
        movedOut: number;
      }
    >();

    const bucket = (month: string) =>
      tally.get(month) ?? {
        spent: 0,
        credited: 0,
        movedOut: 0,
      };

    for (const entry of entries) {
      const month = `${entry.date.slice(
        0,
        7
      )}-01`;
      const current = bucket(month);
      current.spent += entry.amount;
      tally.set(month, current);
    }

    for (const credit of credits) {
      const month = `${credit.date.slice(
        0,
        7
      )}-01`;
      const current = bucket(month);
      current.credited += credit.amount;
      tally.set(month, current);
    }

    for (const move of moves) {
      const current = bucket(move.month);
      current.movedOut += move.amount;
      tally.set(move.month, current);
    }

    months = monthList.map((month) => {
      const current = tally.get(month) ?? {
        spent: 0,
        credited: 0,
        movedOut: 0,
      };

      return {
        month,
        pool: null,
        spent: current.spent,
        credited: current.credited,
        movedOut: current.movedOut,
        remaining: null,
      };
    });
  }

  return {
    success: true,
    report: {
      from: actualFrom,
      to,
      generatedAt: new Date().toISOString(),
      entries,
      credits,
      moves,
      months,
    },
  };
}
