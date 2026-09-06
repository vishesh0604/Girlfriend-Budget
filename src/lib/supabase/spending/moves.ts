import type { createClient } from "@/lib/supabase/server";
import type { TransferRecord } from "@/lib/supabase/budget/calculations";

type SupabaseClient = Awaited<
  ReturnType<typeof createClient>
>;

/*
 * Money moved from the Daily Spending pool into a Fixed Expenses
 * budget head (PROJECT_SPEC.md section 51). It lands as a transfer-in
 * on that head, so it lifts the head's balance and the Current
 * Account Balance without touching allocations or Committed.
 *
 * Returned as TransferRecord[] so the existing head-state maths in
 * calculations.ts pick it up with no special casing. The synthetic
 * empty sourceHeadId never matches a real head.
 */
export async function loadSpendingMoveTransferRecords(
  supabase: SupabaseClient,
  userId: string,
  monthlyHeadIds: string[]
): Promise<TransferRecord[]> {
  if (monthlyHeadIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("spending_moves")
    .select(
      "destination_monthly_head_id, amount"
    )
    .eq("user_id", userId)
    .eq("destination_kind", "budget_head")
    .in(
      "destination_monthly_head_id",
      monthlyHeadIds
    );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter(
      (row) => row.destination_monthly_head_id
    )
    .map((row) => ({
      sourceHeadId: "",
      destinationHeadId:
        row.destination_monthly_head_id as string,
      amount: Number(row.amount),
    }));
}
