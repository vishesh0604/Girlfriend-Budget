import type { createClient } from "@/lib/supabase/server";
import {
  calculateCommittedAmount,
  calculateSpendingPool,
} from "@/lib/supabase/budget/calculations";

type SupabaseClient = Awaited<
  ReturnType<typeof createClient>
>;

function shiftMonth(
  monthStart: string,
  delta: number
) {
  const [year, month] = monthStart
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1 + delta, 1)
  );

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}-01`;
}

export type SpendingSnapshot = {
  monthlyBudgetId: string | null;
  /** Salary minus committed for the month. */
  spendingPoolBase: number;
  /** Moved into this month from the previous month's pool. */
  carriedIn: number;
  /** spendingPoolBase + carriedIn (the base pool, before credits). */
  spendingPool: number;
  /** Extra money credited to this month only. Daily Spending only - the
   *  Fixed Expenses page never sees this. */
  credits: number;
  /** spendingPool + credits - the "Spending Pool" figure shown on the
   *  Daily Spending page. */
  available: number;
  totalSpent: number;
  /** This month's "move remaining" amounts (all destinations). */
  movedOut: number;
  remaining: number;
};

/*
 * The single source of truth for the Daily Spending money model
 * (PROJECT_SPEC.md section 51). Used by the page for display and by
 * the move action to validate that a move fits the remaining balance.
 */
export async function getSpendingSnapshot(
  supabase: SupabaseClient,
  userId: string,
  monthStart: string
): Promise<SpendingSnapshot> {
  const nextMonthStart = shiftMonth(
    monthStart,
    1
  );
  const previousMonthStart = shiftMonth(
    monthStart,
    -1
  );

  const { data: monthlyBudget } = await supabase
    .from("monthly_budgets")
    .select("id, salary")
    .eq("user_id", userId)
    .eq("month_start", monthStart)
    .maybeSingle();

  let committedAmount = 0;

  if (monthlyBudget) {
    const { data: heads } = await supabase
      .from("monthly_budget_heads")
      .select(
        "allocated_amount, budget_heads (head_type)"
      )
      .eq("user_id", userId)
      .eq(
        "monthly_budget_id",
        monthlyBudget.id
      );

    committedAmount = calculateCommittedAmount(
      (heads ?? []).map((head) => {
        const budgetHead = Array.isArray(
          head.budget_heads
        )
          ? head.budget_heads[0]
          : head.budget_heads;

        return {
          amount: Number(
            head.allocated_amount
          ),
          headType:
            budgetHead?.head_type ?? "other",
        };
      })
    );
  }

  const spendingPoolBase = calculateSpendingPool(
    Number(monthlyBudget?.salary ?? 0),
    committedAmount
  );

  const { data: carryRows } = await supabase
    .from("spending_moves")
    .select("amount")
    .eq("user_id", userId)
    .eq("month_start", previousMonthStart)
    .eq("destination_kind", "next_month");

  const carriedIn = (carryRows ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );

  const { data: entryRows } = await supabase
    .from("spending_entries")
    .select("amount")
    .eq("user_id", userId)
    .gte("entry_date", monthStart)
    .lt("entry_date", nextMonthStart);

  const totalSpent = (entryRows ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );

  const { data: moveRows } = await supabase
    .from("spending_moves")
    .select("amount")
    .eq("user_id", userId)
    .eq("month_start", monthStart);

  const movedOut = (moveRows ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );

  const { data: creditRows } = await supabase
    .from("spending_credits")
    .select("amount")
    .eq("user_id", userId)
    .gte("entry_date", monthStart)
    .lt("entry_date", nextMonthStart);

  const credits = (creditRows ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );

  const spendingPool =
    spendingPoolBase + carriedIn;

  const available = spendingPool + credits;

  const remaining =
    available - totalSpent - movedOut;

  return {
    monthlyBudgetId:
      monthlyBudget?.id ?? null,
    spendingPoolBase,
    carriedIn,
    spendingPool,
    credits,
    available,
    totalSpent,
    movedOut,
    remaining,
  };
}
