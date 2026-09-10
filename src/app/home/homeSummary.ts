import type { createClient } from "@/lib/supabase/server";
import {
  calculateHeadState,
  type TransferRecord,
} from "@/lib/supabase/budget/calculations";
import { loadSpendingMoveTransferRecords } from "@/lib/supabase/spending/moves";
import { monthStartOf } from "@/lib/time";
import { getSpendingSnapshot } from "../daily-spending/spendingSnapshot";

type SupabaseClient = Awaited<
  ReturnType<typeof createClient>
>;

export type NextBill = {
  name: string;
  /** "due in 3 days" | "due today" | "due tomorrow" | "overdue by 2 days" */
  label: string;
  urgency: "overdue" | "soon" | "later";
};

export type HomeSummary = {
  /** false when this month has no budget set up yet. */
  hasBudget: boolean;
  /** Spending pool left for the month. */
  poolRemaining: number;
  /** Safe-to-spend per day across the days left in the month. */
  perDayLeft: number;
  /** The nearest unpaid dated bill; null when there are none. */
  nextBill: NextBill | null;
  /** Number of budget heads on this month's budget. */
  headCount: number;
  /** Total allocated across this month's budget heads. */
  monthlyCommitted: number;
};

/*
 * The live numbers shown on the home page cards: this month's spending
 * pool (left + per-day) and the most time-sensitive fixed bill still due.
 * "Settled" and the due-day maths mirror the Fixed Expenses card exactly.
 * `now` is the viewer's wall-clock time (see getViewerNow).
 */
export async function getHomeSummary(
  supabase: SupabaseClient,
  userId: string,
  now: Date
): Promise<HomeSummary> {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const dayOfMonth = now.getUTCDate();
  const monthStart = monthStartOf(now);

  const snapshot = await getSpendingSnapshot(
    supabase,
    userId,
    monthStart
  );

  const daysInMonth = new Date(
    Date.UTC(year, month + 1, 0)
  ).getUTCDate();

  const daysLeft = Math.max(
    1,
    daysInMonth - dayOfMonth + 1
  );

  const poolRemaining = snapshot.remaining;
  const perDayLeft =
    Math.max(0, poolRemaining) / daysLeft;

  if (!snapshot.monthlyBudgetId) {
    return {
      hasBudget: false,
      poolRemaining,
      perDayLeft,
      nextBill: null,
      headCount: 0,
      monthlyCommitted: 0,
    };
  }

  const [headsResult, transfersResult] =
    await Promise.all([
      supabase
        .from("monthly_budget_heads")
        .select(
          "id, allocated_amount, carry_forward, paid_amount, budget_heads!inner ( name, due_day )"
        )
        .eq("user_id", userId)
        .eq(
          "monthly_budget_id",
          snapshot.monthlyBudgetId
        ),
      supabase
        .from("transfers")
        .select(
          "source_monthly_head_id, destination_monthly_head_id, amount"
        )
        .eq("user_id", userId)
        .eq(
          "monthly_budget_id",
          snapshot.monthlyBudgetId
        ),
    ]);

  const headRows = headsResult.data ?? [];

  const headCount = headRows.length;
  const monthlyCommitted = headRows.reduce(
    (sum, row) =>
      sum + Number(row.allocated_amount ?? 0),
    0
  );

  const spendingMoveRecords =
    await loadSpendingMoveTransferRecords(
      supabase,
      userId,
      headRows.map((row) => row.id as string)
    );

  const transferRecords: TransferRecord[] = [
    ...(transfersResult.data ?? []).map(
      (row) => ({
        sourceHeadId:
          row.source_monthly_head_id as string,
        destinationHeadId:
          row.destination_monthly_head_id as string,
        amount: Number(row.amount ?? 0),
      })
    ),
    ...spendingMoveRecords,
  ];

  const today = new Date(
    Date.UTC(year, month, dayOfMonth)
  );

  let best: {
    diffDays: number;
    name: string;
  } | null = null;

  for (const row of headRows) {
    const budgetHead = Array.isArray(
      row.budget_heads
    )
      ? row.budget_heads[0]
      : row.budget_heads;

    const dueDay = budgetHead?.due_day as
      | number
      | null
      | undefined;

    if (!dueDay) {
      continue;
    }

    const state = calculateHeadState(
      {
        id: row.id as string,
        allocatedAmount: Number(
          row.allocated_amount ?? 0
        ),
        carryForward: Number(
          row.carry_forward ?? 0
        ),
        paidAmount: Number(
          row.paid_amount ?? 0
        ),
      },
      transferRecords
    );

    if (state.finalBalance <= 0) {
      continue;
    }

    const due = new Date(
      Date.UTC(
        year,
        month,
        Math.min(dueDay, daysInMonth)
      )
    );

    const diffDays = Math.round(
      (due.getTime() - today.getTime()) /
        86400000
    );

    if (!best || diffDays < best.diffDays) {
      best = {
        diffDays,
        name:
          (budgetHead?.name as string) ??
          "A bill",
      };
    }
  }

  if (!best) {
    return {
      hasBudget: true,
      poolRemaining,
      perDayLeft,
      nextBill: null,
      headCount,
      monthlyCommitted,
    };
  }

  const { diffDays, name } = best;

  let label: string;
  let urgency: NextBill["urgency"];

  if (diffDays < 0) {
    const by = -diffDays;
    label = `overdue by ${by} ${
      by === 1 ? "day" : "days"
    }`;
    urgency = "overdue";
  } else if (diffDays === 0) {
    label = "due today";
    urgency = "soon";
  } else if (diffDays === 1) {
    label = "due tomorrow";
    urgency = "soon";
  } else {
    label = `due in ${diffDays} days`;
    urgency = diffDays <= 3 ? "soon" : "later";
  }

  return {
    hasBudget: true,
    poolRemaining,
    perDayLeft,
    nextBill: { name, label, urgency },
    headCount,
    monthlyCommitted,
  };
}
