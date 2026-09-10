"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  calculateHeadState,
  calculateMaximumPaidAmount,
  type TransferRecord,
} from "@/lib/supabase/budget/calculations";
import { loadSpendingMoveTransferRecords } from "@/lib/supabase/spending/moves";
import { getAuthUserId } from "@/lib/supabase/authUser";
import { getViewerMonthStart } from "@/lib/supabase/viewer";
import { isHeadSortMode } from "./headSort";

export async function initializeMonthlyBudget(
  monthStart: string
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
    data: existingBudget,
    error: existingBudgetError,
  } = await supabase
    .from("monthly_budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq("month_start", monthStart)
    .maybeSingle();

  if (existingBudgetError) {
    return {
      success: false,
      error: existingBudgetError.message,
    };
  }

  if (existingBudget) {
    /*
    * If this is a FUTURE month, synchronize any newly
    * created active budget heads into that month.
    *
    * Historical and current months are left untouched.
    */
    const currentMonthStart =
      await getViewerMonthStart(
        supabase,
        user.id
      );

    if (monthStart > currentMonthStart) {
      const {
        data: activeBudgetHeads,
        error: activeHeadsError,
      } = await supabase
        .from("budget_heads")
        .select(
          "id, default_monthly_allocation"
        )
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (activeHeadsError) {
        return {
          success: false,
          error: activeHeadsError.message,
        };
      }

      const {
        data: existingMonthlyHeads,
        error: existingMonthlyHeadsError,
      } = await supabase
        .from("monthly_budget_heads")
        .select("budget_head_id")
        .eq("user_id", user.id)
        .eq(
          "monthly_budget_id",
          existingBudget.id
        );

      if (existingMonthlyHeadsError) {
        return {
          success: false,
          error:
            existingMonthlyHeadsError.message,
        };
      }

      const existingHeadIds = new Set(
        (existingMonthlyHeads ?? []).map(
          (head) => head.budget_head_id
        )
      );

      const missingHeads =
        (activeBudgetHeads ?? [])
          .filter(
            (head) =>
              !existingHeadIds.has(head.id)
          )
          .map((head) => ({
            user_id: user.id,
            monthly_budget_id:
              existingBudget.id,
            budget_head_id: head.id,
            allocated_amount:
              head.default_monthly_allocation,
            carry_forward: 0,
            paid_amount: 0,
          }));

      if (missingHeads.length > 0) {
        const {
          error: insertMissingHeadsError,
        } = await supabase
          .from("monthly_budget_heads")
          .insert(missingHeads);

        if (insertMissingHeadsError) {
          return {
            success: false,
            error:
              insertMissingHeadsError.message,
          };
        }
      }
    }

    return {
      success: true,
      alreadyExists: true,
      budgetId: existingBudget.id,
    };
  }
  const {
    data: budgetHeads,
    error: budgetHeadsError,
  } = await supabase
    .from("budget_heads")
    .select(
      "id, default_monthly_allocation"
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", {
      ascending: true,
    });

  if (budgetHeadsError) {
    return {
      success: false,
      error: budgetHeadsError.message,
    };
  }

  /*
   * Seed the new month's salary.
   *
   * For the current or a future month, carry the salary
   * forward from the most recent earlier month, so a salary
   * set for the current month flows into future months as
   * they are created. New users (no earlier month) start at 0.
   *
   * A newly created historical month always starts at 0 so it
   * cannot pull a later salary backwards into the past.
   */
  const currentMonthStart =
    await getViewerMonthStart(
      supabase,
      user.id
    );

  let initialSalary = 0;

  if (monthStart >= currentMonthStart) {
    const { data: priorBudget } =
      await supabase
        .from("monthly_budgets")
        .select("salary")
        .eq("user_id", user.id)
        .lt("month_start", monthStart)
        .order("month_start", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    initialSalary = Number(
      priorBudget?.salary ?? 0
    );

    if (!Number.isFinite(initialSalary)) {
      initialSalary = 0;
    }
  }

  const {
    data: monthlyBudget,
    error: monthlyBudgetError,
  } = await supabase
    .from("monthly_budgets")
    .insert({
      user_id: user.id,
      month_start: monthStart,
      salary: initialSalary,
    })
    .select("id")
    .single();

  if (
    monthlyBudgetError ||
    !monthlyBudget
  ) {
    return {
      success: false,
      error:
        monthlyBudgetError?.message ??
        "Unable to create monthly budget.",
    };
  }

  const monthlyHeadRows =
    budgetHeads.map((head) => ({
      user_id: user.id,
      monthly_budget_id:
        monthlyBudget.id,
      budget_head_id: head.id,
      allocated_amount:
        head.default_monthly_allocation,
      carry_forward:0,
      paid_amount: 0,
    }));

  let monthlyHeadsError = null;

  if (monthlyHeadRows.length > 0) {
    const result = await supabase
      .from("monthly_budget_heads")
      .insert(monthlyHeadRows);

    monthlyHeadsError = result.error;
  }
  if (monthlyHeadsError) {
    await supabase
      .from("monthly_budgets")
      .delete()
      .eq(
        "id",
        monthlyBudget.id
      )
      .eq(
        "user_id",
        user.id
      );

    return {
      success: false,
      error: monthlyHeadsError.message,
    };
  }

  return {
    success: true,
    alreadyExists: false,
    budgetId: monthlyBudget.id,
  };
}

export async function updateSalary(
  monthlyBudgetId: string,
  salaryValue: string
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

  const salary = Number(salaryValue);

  if (!Number.isFinite(salary)) {
    return {
      success: false,
      error: "Salary must be a valid number.",
    };
  }

  if (salary < 0) {
    return {
      success: false,
      error: "Salary cannot be negative.",
    };
  }

  /*
   * Find the month being edited so we can decide how far
   * forward the new salary should apply.
   */
  const {
    data: editedBudget,
    error: editedBudgetError,
  } = await supabase
    .from("monthly_budgets")
    .select("id, month_start")
    .eq("id", monthlyBudgetId)
    .eq("user_id", user.id)
    .single();

  if (editedBudgetError || !editedBudget) {
    return {
      success: false,
      error:
        editedBudgetError?.message ??
        "Monthly budget could not be found.",
    };
  }

  const currentMonthStart =
    await getViewerMonthStart(
      supabase,
      user.id
    );

  const timestamp = new Date().toISOString();

  if (
    editedBudget.month_start < currentMonthStart
  ) {
    /*
     * Editing a historical month only changes that month.
     * Past salary history is never rewritten by a later edit,
     * and it must not touch the current or future months.
     */
    const { error } = await supabase
      .from("monthly_budgets")
      .update({
        salary,
        updated_at: timestamp,
      })
      .eq("id", monthlyBudgetId)
      .eq("user_id", user.id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  } else {
    /*
     * Editing the current or a future month applies the new
     * salary to that month and every later month that exists.
     * Past months are left untouched.
     */
    const { error } = await supabase
      .from("monthly_budgets")
      .update({
        salary,
        updated_at: timestamp,
      })
      .eq("user_id", user.id)
      .gte(
        "month_start",
        editedBudget.month_start
      );

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  revalidatePath("/dashboard");

  return {
    success: true,
  };
}

export async function updateMonthlyHeadAllocation(
  monthlyHeadId: string,
  allocationValue: string
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

  const allocation = Number(
    allocationValue
  );

  if (!Number.isFinite(allocation)) {
    return {
      success: false,
      error:
        "Allocation must be a valid number.",
    };
  }

  if (allocation < 0) {
    return {
      success: false,
      error:
        "Allocation cannot be negative.",
    };
  }

  const { error } = await supabase
    .from("monthly_budget_heads")
    .update({
      allocated_amount: allocation,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", monthlyHeadId)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/dashboard");

  return {
    success: true,
  };
}

export async function updateMonthlyHeadPaidAmount(
  monthlyHeadId: string,
  paidAmountValue: string
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

  const paidAmount = Number(
    paidAmountValue
  );

  if (!Number.isFinite(paidAmount)) {
    return {
      success: false,
      error:
        "Paid / Used amount must be a valid number.",
    };
  }

  if (paidAmount < 0) {
    return {
      success: false,
      error:
        "Paid / Used amount cannot be negative.",
    };
  }

  /*
   * Get the current budget head.
   */
  const {
    data: monthlyHead,
    error: monthlyHeadError,
  } = await supabase
    .from("monthly_budget_heads")
    .select(
      "id, budget_head_id, allocated_amount, carry_forward, paid_amount, monthly_budget_id"
    )
    .eq("id", monthlyHeadId)
    .eq("user_id", user.id)
    .single();

  if (
    monthlyHeadError ||
    !monthlyHead
  ) {
    return {
      success: false,
      error:
        monthlyHeadError?.message ??
        "Budget head could not be found.",
    };
  }

  /*
   * Load all transfers for the current
   * monthly budget so that Remaining matches
   * the balance displayed on the dashboard.
   */
  const {
    data: transfers,
    error: transfersError,
  } = await supabase
    .from("transfers")
    .select(
      "source_monthly_head_id, destination_monthly_head_id, amount"
    )
    .eq("user_id", user.id)
    .eq(
      "monthly_budget_id",
      monthlyHead.monthly_budget_id
    );

  if (transfersError) {
    return {
      success: false,
      error: transfersError.message,
    };
  }

  /*
   * Calculate transfers affecting this head.
   */
  const transfersOut = (
    transfers ?? []
  ).reduce((total, transfer) => {
    if (
      transfer.source_monthly_head_id !==
      monthlyHeadId
    ) {
      return total;
    }

    return total + Number(transfer.amount);
  }, 0);

  const transfersIn = (
    transfers ?? []
  ).reduce((total, transfer) => {
    if (
      transfer.destination_monthly_head_id !==
      monthlyHeadId
    ) {
      return total;
    }

    return total + Number(transfer.amount);
  }, 0);

  /*
   * The existing balance before editing Paid / Used.
   */
  const allocatedAmount = Number(
    monthlyHead.allocated_amount
  );

  const carryForward = Number(
    monthlyHead.carry_forward
  );

  const currentPaidAmount = Number(
    monthlyHead.paid_amount
  );

  const totalAvailable =
    allocatedAmount + carryForward;

  const currentRemaining =
    totalAvailable -
    currentPaidAmount;

  /*
   * Money moved in from the Daily Spending pool also raises
   * this head's available balance.
   */
  const spendingMoveIn = (
    await loadSpendingMoveTransferRecords(
      supabase,
      user.id,
      [monthlyHeadId]
    )
  ).reduce(
    (total, record) => total + (record.amount ?? 0),
    0
  );

  const currentFinalBalance =
    currentRemaining -
    transfersOut +
    transfersIn +
    spendingMoveIn;

  /*
   * A Paid / Used total may only consume the
   * balance presently available to this head.
   * This keeps transfers in and out in the
   * limit without counting the allocation twice.
   */
  const maximumPaidAmount =
    calculateMaximumPaidAmount(
      currentPaidAmount,
      currentFinalBalance
    );

  if (paidAmount > maximumPaidAmount) {
    return {
      success: false,
      error:
        `Paid / Used amount cannot exceed the total available amount of ${maximumPaidAmount.toLocaleString()}.`,
    };
  }

  const { error } = await supabase
    .from("monthly_budget_heads")
    .update({
      paid_amount: paidAmount,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", monthlyHeadId)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  // Record the change as a payment-history entry (the delta - a real
  // payment, or a negative correction).
  const delta = paidAmount - currentPaidAmount;

  if (Math.abs(delta) >= 0.01) {
    await supabase.from("head_payments").insert({
      user_id: user.id,
      monthly_budget_head_id: monthlyHeadId,
      budget_head_id:
        monthlyHead.budget_head_id,
      amount: delta,
    });
  }

  revalidatePath("/dashboard");

  return {
    success: true,
  };
}

export async function updateMonthlyHeadNote(
  monthlyHeadId: string,
  noteValue: string
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

  if (!monthlyHeadId) {
    return {
      success: false,
      error: "Budget head could not be identified.",
    };
  }

  const note = noteValue.trim();

  if (note.length > 2000) {
    return {
      success: false,
      error:
        "Note is too long. Please keep it under 2,000 characters.",
    };
  }

  const { error } = await supabase
    .from("monthly_budget_heads")
    .update({
      note,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", monthlyHeadId)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/dashboard");

  return {
    success: true,
  };
}

export async function createTransfer(
  monthlyBudgetId: string,
  sourceMonthlyHeadId: string,
  destinationMonthlyHeadId: string,
  amountValue: string
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

  if (
    sourceMonthlyHeadId ===
    destinationMonthlyHeadId
  ) {
    return {
      success: false,
      error:
        "A budget head cannot move funds to itself.",
    };
  }

  const amount = Number(
    amountValue
  );

  if (!Number.isFinite(amount)) {
    return {
      success: false,
      error:
        "The amount to move must be a valid number.",
    };
  }

  if (amount <= 0) {
    return {
      success: false,
      error:
        "The amount to move must be greater than 0.",
    };
  }

  const {
    data: sourceHead,
    error: sourceHeadError,
  } = await supabase
    .from("monthly_budget_heads")
    .select(
      "id, allocated_amount, carry_forward, paid_amount"
    )
    .eq("id", sourceMonthlyHeadId)
    .eq("user_id", user.id)
    .eq(
      "monthly_budget_id",
      monthlyBudgetId
    )
    .single();

  if (
    sourceHeadError ||
    !sourceHead
  ) {
    return {
      success: false,
      error:
        sourceHeadError?.message ??
        "Source budget head could not be found.",
    };
  }

  const {
    data: existingTransfers,
    error: transfersError,
  } = await supabase
    .from("transfers")
    .select(
      "source_monthly_head_id, destination_monthly_head_id, amount"
    )
    .eq("user_id", user.id)
    .eq(
      "monthly_budget_id",
      monthlyBudgetId
    );

  if (transfersError) {
    return {
      success: false,
      error: transfersError.message,
    };
  }

  const transfersOut = (
    existingTransfers ?? []
  ).reduce((total, transfer) => {
    if (
      transfer.source_monthly_head_id !==
      sourceMonthlyHeadId
    ) {
      return total;
    }

    return (
      total + Number(transfer.amount)
    );
  }, 0);

  const transfersIn = (
    existingTransfers ?? []
  ).reduce((total, transfer) => {
    if (
      transfer.destination_monthly_head_id !==
      sourceMonthlyHeadId
    ) {
      return total;
    }

    return (
      total + Number(transfer.amount)
    );
  }, 0);

  const totalAvailable =
    Number(
      sourceHead.allocated_amount
    ) +
    Number(
      sourceHead.carry_forward
    );

  const remaining =
    totalAvailable -
    Number(sourceHead.paid_amount);

  const spendingMoveIn = (
    await loadSpendingMoveTransferRecords(
      supabase,
      user.id,
      [sourceMonthlyHeadId]
    )
  ).reduce(
    (total, record) => total + (record.amount ?? 0),
    0
  );

  const availableBalance =
    remaining -
    transfersOut +
    transfersIn +
    spendingMoveIn;

  if (amount > availableBalance) {
    return {
      success: false,
      error:
        `You can move a maximum of ${availableBalance.toLocaleString()}.`,
    };
  }

  const {
    data: destinationHead,
    error: destinationHeadError,
  } = await supabase
    .from("monthly_budget_heads")
    .select("id")
    .eq(
      "id",
      destinationMonthlyHeadId
    )
    .eq("user_id", user.id)
    .eq(
      "monthly_budget_id",
      monthlyBudgetId
    )
    .single();

  if (
    destinationHeadError ||
    !destinationHead
  ) {
    return {
      success: false,
      error:
        destinationHeadError?.message ??
        "Destination budget head could not be found.",
    };
  }

  const { error } = await supabase
    .from("transfers")
    .insert({
      user_id: user.id,
      monthly_budget_id:
        monthlyBudgetId,
      source_monthly_head_id:
        sourceMonthlyHeadId,
      destination_monthly_head_id:
        destinationMonthlyHeadId,
      amount,
    });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/dashboard");

  return {
    success: true,
  };
}

export async function undoTransfer(
  transferId: string,
  monthlyBudgetId: string
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
    data: transfer,
    error: transferError,
  } = await supabase
    .from("transfers")
    .select("id")
    .eq("id", transferId)
    .eq("user_id", user.id)
    .eq(
      "monthly_budget_id",
      monthlyBudgetId
    )
    .maybeSingle();

  if (transferError) {
    return {
      success: false,
      error: transferError.message,
    };
  }

  if (!transfer) {
    return {
      success: false,
      error:
        "This transfer no longer exists.",
    };
  }

  const { error } = await supabase
    .from("transfers")
    .delete()
    .eq("id", transferId)
    .eq("user_id", user.id)
    .eq(
      "monthly_budget_id",
      monthlyBudgetId
    );

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/dashboard");

  return {
    success: true,
  };
}

export async function pushRemainingToNextMonth(
  monthlyBudgetId: string,
  monthlyHeadId: string
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

  // Get the current monthly budget.
  const {
    data: currentBudget,
    error: currentBudgetError,
  } = await supabase
    .from("monthly_budgets")
    .select("id, month_start")
    .eq("id", monthlyBudgetId)
    .eq("user_id", user.id)
    .single();

  if (currentBudgetError || !currentBudget) {
    return {
      success: false,
      error:
        currentBudgetError?.message ??
        "Current monthly budget could not be found.",
    };
  }

  // Get the current monthly head.
  const {
    data: currentHead,
    error: currentHeadError,
  } = await supabase
    .from("monthly_budget_heads")
    .select(
      "id, budget_head_id, allocated_amount, carry_forward, paid_amount"
    )
    .eq("id", monthlyHeadId)
    .eq("user_id", user.id)
    .eq("monthly_budget_id", currentBudget.id)
    .single();

  if (currentHeadError || !currentHead) {
    return {
      success: false,
      error:
        currentHeadError?.message ??
        "Current budget head could not be found.",
    };
  }

  // Load transfers for the current month so that
  // "remaining" matches the Dashboard calculation.
  const {
    data: transfers,
    error: transfersError,
  } = await supabase
    .from("transfers")
    .select(
      "source_monthly_head_id, destination_monthly_head_id, amount"
    )
    .eq("user_id", user.id)
    .eq("monthly_budget_id", currentBudget.id);

  if (transfersError) {
    return {
      success: false,
      error: transfersError.message,
    };
  }

  const transferRecords: TransferRecord[] = [
    ...(transfers ?? []).map((transfer) => ({
      sourceHeadId:
        transfer.source_monthly_head_id,
      destinationHeadId:
        transfer.destination_monthly_head_id,
      amount: Number(transfer.amount),
    })),
    ...(await loadSpendingMoveTransferRecords(
      supabase,
      user.id,
      [currentHead.id]
    )),
  ];

  // Calculate the CURRENT actual remaining balance,
  // including carry-forward, transfers and spending-pool moves.
  const currentState = calculateHeadState(
    {
      id: currentHead.id,
      allocatedAmount:
        Number(currentHead.allocated_amount),
      carryForward:
        Number(currentHead.carry_forward),
      paidAmount:
        Number(currentHead.paid_amount),
    },
    transferRecords
  );

  const remaining = currentState.finalBalance;

  // Calculate the immediately following month.
  const [year, month] =
    currentBudget.month_start
      .split("-")
      .map(Number);

  const nextDate = new Date(
    Date.UTC(year, month - 1, 1)
  );

  nextDate.setUTCMonth(
    nextDate.getUTCMonth() + 1
  );

  const nextMonthStart =
    `${nextDate.getUTCFullYear()}-${String(
      nextDate.getUTCMonth() + 1
    ).padStart(2, "0")}-01`;

  // Make sure the NEXT month exists.
  const initializeResult =
    await initializeMonthlyBudget(
      nextMonthStart
    );

  if (!initializeResult.success) {
    return {
      success: false,
      error:
        initializeResult.error ??
        "Unable to initialize the next month.",
    };
  }

  // Get the next month's corresponding budget head.
  const {
    data: nextHead,
    error: nextHeadError,
  } = await supabase
    .from("monthly_budget_heads")
    .select("id")
    .eq("user_id", user.id)
    .eq(
      "monthly_budget_id",
      initializeResult.budgetId
    )
    .eq(
      "budget_head_id",
      currentHead.budget_head_id
    )
    .maybeSingle();

  if (nextHeadError || !nextHead) {
    return {
      success: false,
      error:
        nextHeadError?.message ??
        "This budget head does not exist in the next month.",
    };
  }

  // OVERWRITE the next month's carry-forward.
  // We intentionally do NOT add to the existing value.
  const { error: updateError } =
    await supabase
      .from("monthly_budget_heads")
      .update({
        carry_forward: Math.max(
          0,
          remaining
        ),
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", nextHead.id)
      .eq("user_id", user.id);

  if (updateError) {
    return {
      success: false,
      error: updateError.message,
    };
  }

  revalidatePath("/dashboard");

  return {
    success: true,
    pushedAmount: Math.max(
      0,
      remaining
    ),
    nextMonthStart,
  };
}

export async function reversePushToNextMonth(
  monthlyBudgetId: string,
  monthlyHeadId: string
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

  // Get the current monthly budget.
  const {
    data: currentBudget,
    error: currentBudgetError,
  } = await supabase
    .from("monthly_budgets")
    .select("id, month_start")
    .eq("id", monthlyBudgetId)
    .eq("user_id", user.id)
    .single();

  if (currentBudgetError || !currentBudget) {
    return {
      success: false,
      error:
        currentBudgetError?.message ??
        "Current monthly budget could not be found.",
    };
  }

  // Get the current monthly head.
  const {
    data: currentHead,
    error: currentHeadError,
  } = await supabase
    .from("monthly_budget_heads")
    .select(
      "id, budget_head_id, carry_forward"
    )
    .eq("id", monthlyHeadId)
    .eq("user_id", user.id)
    .eq("monthly_budget_id", currentBudget.id)
    .single();

  if (currentHeadError || !currentHead) {
    return {
      success: false,
      error:
        currentHeadError?.message ??
        "Current budget head could not be found.",
    };
  }

  /*
   * If THIS month's head has a carry-forward, it received a
   * push from the previous month. Reversing from the month
   * where the amount is visible clears it here.
   */
  if (
    Number(currentHead.carry_forward) > 0
  ) {
    const { error: clearError } =
      await supabase
        .from("monthly_budget_heads")
        .update({
          carry_forward: 0,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", currentHead.id)
        .eq("user_id", user.id);

    if (clearError) {
      return {
        success: false,
        error: clearError.message,
      };
    }

    revalidatePath("/dashboard");

    return {
      success: true,
      reversedMonthStart:
        currentBudget.month_start,
    };
  }

  // Otherwise reverse the push this month made forward.
  // Calculate the immediately next month.
  const [year, month] =
    currentBudget.month_start
      .split("-")
      .map(Number);

  const nextDate = new Date(
    Date.UTC(year, month - 1, 1)
  );

  nextDate.setUTCMonth(
    nextDate.getUTCMonth() + 1
  );

  const nextMonthStart =
    `${nextDate.getUTCFullYear()}-${String(
      nextDate.getUTCMonth() + 1
    ).padStart(2, "0")}-01`;

  // Find the next month's budget.
  const {
    data: nextBudget,
    error: nextBudgetError,
  } = await supabase
    .from("monthly_budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq("month_start", nextMonthStart)
    .maybeSingle();

  if (nextBudgetError) {
    return {
      success: false,
      error: nextBudgetError.message,
    };
  }

  if (!nextBudget) {
    return {
      success: false,
      error:
        "The next month's budget does not exist.",
    };
  }

  // Find the corresponding head in the next month.
  const {
    data: nextHead,
    error: nextHeadError,
  } = await supabase
    .from("monthly_budget_heads")
    .select("id")
    .eq("user_id", user.id)
    .eq("monthly_budget_id", nextBudget.id)
    .eq(
      "budget_head_id",
      currentHead.budget_head_id
    )
    .maybeSingle();

  if (nextHeadError || !nextHead) {
    return {
      success: false,
      error:
        nextHeadError?.message ??
        "This budget head does not exist in the next month.",
    };
  }

  // Reverse the push by restoring the next month's
  // carry-forward to its default state.
  const { error: updateError } =
    await supabase
      .from("monthly_budget_heads")
      .update({
        carry_forward: 0,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", nextHead.id)
      .eq("user_id", user.id);

  if (updateError) {
    return {
      success: false,
      error: updateError.message,
    };
  }

  revalidatePath("/dashboard");

  return {
    success: true,
    nextMonthStart,
  };
}

export async function reverseAllPushesToNextMonth(
  monthlyBudgetId: string
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

  // Get the current monthly budget.
  const {
    data: currentBudget,
    error: currentBudgetError,
  } = await supabase
    .from("monthly_budgets")
    .select("id, month_start")
    .eq("id", monthlyBudgetId)
    .eq("user_id", user.id)
    .single();

  if (currentBudgetError || !currentBudget) {
    return {
      success: false,
      error:
        currentBudgetError?.message ??
        "Current monthly budget could not be found.",
    };
  }

  /*
   * If THIS month has any carry-forward, it received pushes
   * from the previous month. Reversing from the month where
   * those amounts are visible clears them here.
   */
  const {
    data: currentHeads,
    error: currentHeadsError,
  } = await supabase
    .from("monthly_budget_heads")
    .select("carry_forward")
    .eq("user_id", user.id)
    .eq(
      "monthly_budget_id",
      currentBudget.id
    );

  if (currentHeadsError) {
    return {
      success: false,
      error: currentHeadsError.message,
    };
  }

  const currentMonthHasCarryForward = (
    currentHeads ?? []
  ).some(
    (head) =>
      Number(head.carry_forward) > 0
  );

  if (currentMonthHasCarryForward) {
    const { error: clearError } =
      await supabase
        .from("monthly_budget_heads")
        .update({
          carry_forward: 0,
          updated_at:
            new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq(
          "monthly_budget_id",
          currentBudget.id
        );

    if (clearError) {
      return {
        success: false,
        error: clearError.message,
      };
    }

    revalidatePath("/dashboard");

    return {
      success: true,
      reversedMonthStart:
        currentBudget.month_start,
    };
  }

  // Otherwise reverse the pushes this month made forward.
  // Calculate the immediately next month.
  const [year, month] =
    currentBudget.month_start
      .split("-")
      .map(Number);

  const nextDate = new Date(
    Date.UTC(year, month - 1, 1)
  );

  nextDate.setUTCMonth(
    nextDate.getUTCMonth() + 1
  );

  const nextMonthStart =
    `${nextDate.getUTCFullYear()}-${String(
      nextDate.getUTCMonth() + 1
    ).padStart(2, "0")}-01`;

  // Find the next month's budget.
  const {
    data: nextBudget,
    error: nextBudgetError,
  } = await supabase
    .from("monthly_budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq("month_start", nextMonthStart)
    .maybeSingle();

  if (nextBudgetError) {
    return {
      success: false,
      error: nextBudgetError.message,
    };
  }

  if (!nextBudget) {
    return {
      success: false,
      error:
        "The next month's budget does not exist.",
    };
  }

  // Reset ALL carry-forward values in the
  // immediately next month for this user.
  const { error: updateError } =
    await supabase
      .from("monthly_budget_heads")
      .update({
        carry_forward: 0,
        updated_at:
          new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("monthly_budget_id", nextBudget.id);

  if (updateError) {
    return {
      success: false,
      error: updateError.message,
    };
  }

  revalidatePath("/dashboard");

  return {
    success: true,
    nextMonthStart,
  };
}

export async function syncMonthlyCarryForward(
  targetMonthStart: string
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

  const [year, month] =
    targetMonthStart
      .split("-")
      .map(Number);

  const previousDate = new Date(
    Date.UTC(
      year,
      month - 2,
      1
    )
  );

  const previousMonthStart =
    `${previousDate.getUTCFullYear()}-${String(
      previousDate.getUTCMonth() + 1
    ).padStart(2, "0")}-01`;

  const {
    data: targetBudget,
    error: targetBudgetError,
  } = await supabase
    .from("monthly_budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq(
      "month_start",
      targetMonthStart
    )
    .maybeSingle();

  if (targetBudgetError) {
    return {
      success: false,
      error: targetBudgetError.message,
    };
  }

  if (!targetBudget) {
    return {
      success: false,
      error:
        "The target monthly budget does not exist.",
    };
  }

  const {
    data: previousBudget,
    error: previousBudgetError,
  } = await supabase
    .from("monthly_budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq(
      "month_start",
      previousMonthStart
    )
    .maybeSingle();

  if (previousBudgetError) {
    return {
      success: false,
      error:
        previousBudgetError.message,
    };
  }

  if (!previousBudget) {
    return {
      success: false,
      error:
        "The previous monthly budget does not exist.",
    };
  }

  const {
    data: previousHeads,
    error: previousHeadsError,
  } = await supabase
    .from("monthly_budget_heads")
    .select(
      "id, budget_head_id, allocated_amount, carry_forward, paid_amount"
    )
    .eq("user_id", user.id)
    .eq(
      "monthly_budget_id",
      previousBudget.id
    );

  if (previousHeadsError) {
    return {
      success: false,
      error:
        previousHeadsError.message,
    };
  }

  const {
    data: previousTransfers,
    error: previousTransfersError,
  } = await supabase
    .from("transfers")
    .select(
      "source_monthly_head_id, destination_monthly_head_id, amount"
    )
    .eq("user_id", user.id)
    .eq(
      "monthly_budget_id",
      previousBudget.id
    );

  if (previousTransfersError) {
    return {
      success: false,
      error:
        previousTransfersError.message,
    };
  }

  const transferRecords: TransferRecord[] =
    (previousTransfers ?? []).map(
      (transfer) => ({
        sourceHeadId:
          transfer.source_monthly_head_id,
        destinationHeadId:
          transfer.destination_monthly_head_id,
        amount: Number(
          transfer.amount
        ),
      })
    );

  const carryForwardByHeadId =
    new Map<string, number>();

  for (const previousHead of
    previousHeads ?? []) {
    const state =
      calculateHeadState(
        {
          id: previousHead.id,
          allocatedAmount:
            Number(
              previousHead.allocated_amount
            ),
          carryForward:
            Number(
              previousHead.carry_forward
            ),
          paidAmount:
            Number(
              previousHead.paid_amount
            ),
        },
        transferRecords
      );

    carryForwardByHeadId.set(
      previousHead.budget_head_id,
      state.finalBalance
    );
  }

  const {
    data: targetHeads,
    error: targetHeadsError,
  } = await supabase
    .from("monthly_budget_heads")
    .select(
      "id, budget_head_id"
    )
    .eq("user_id", user.id)
    .eq(
      "monthly_budget_id",
      targetBudget.id
    );

  if (targetHeadsError) {
    return {
      success: false,
      error:
        targetHeadsError.message,
    };
  }

  for (const targetHead of
    targetHeads ?? []) {
    const carryForward =
      carryForwardByHeadId.get(
        targetHead.budget_head_id
      ) ?? 0;

    const {
      error: updateError,
    } = await supabase
      .from("monthly_budget_heads")
      .update({
        carry_forward:
          carryForward,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        targetHead.id
      )
      .eq(
        "user_id",
        user.id
      );

    if (updateError) {
      return {
        success: false,
        error:
          updateError.message,
      };
    }
  }

  revalidatePath("/dashboard");

  return {
    success: true,
  };
}

function parseDueDay(value: string | undefined) {
  if (
    value === undefined ||
    value.trim() === ""
  ) {
    return { ok: true, dueDay: null };
  }

  const day = Number(value);

  if (
    !Number.isInteger(day) ||
    day < 1 ||
    day > 31
  ) {
    return {
      ok: false as const,
      error:
        "Due day must be a whole number between 1 and 31.",
    };
  }

  return { ok: true as const, dueDay: day };
}

export async function createBudgetHead(
  name: string,
  headType: string,
  allocationValue: string,
  dueDayValue?: string
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

  const trimmedName = name.trim();

  if (!trimmedName) {
    return {
      success: false,
      error: "Budget head name is required.",
    };
  }

  if (!headType.trim()) {
    return {
      success: false,
      error: "Budget head type is required.",
    };
  }

  const allocation = Number(allocationValue);

  if (!Number.isFinite(allocation)) {
    return {
      success: false,
      error: "Allocation must be a valid number.",
    };
  }

  if (allocation < 0) {
    return {
      success: false,
      error: "Allocation cannot be negative.",
    };
  }

  const dueDayResult =
    parseDueDay(dueDayValue);

  if (!dueDayResult.ok) {
    return {
      success: false,
      error: dueDayResult.error,
    };
  }

  const { data: lastHead } = await supabase
    .from("budget_heads")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  const nextSortOrder =
    (Number(lastHead?.sort_order) || 0) + 1;

  const {
    data: budgetHead,
    error: budgetHeadError,
  } = await supabase
    .from("budget_heads")
    .insert({
      user_id: user.id,
      name: trimmedName,
      head_type: headType.trim(),
      default_monthly_allocation: allocation,
      due_day: dueDayResult.dueDay,
      sort_order: nextSortOrder,
      is_active: true,
    })
    .select("id")
    .single();

  if (budgetHeadError || !budgetHead) {
    return {
      success: false,
      error:
        budgetHeadError?.message ??
        "Unable to create budget head.",
    };
  }

  const currentMonthStart =
    await getViewerMonthStart(
      supabase,
      user.id
    );

  const {
    data: currentBudget,
    error: currentBudgetError,
  } = await supabase
    .from("monthly_budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq("month_start", currentMonthStart)
    .maybeSingle();

  if (currentBudgetError) {
    await supabase
      .from("budget_heads")
      .delete()
      .eq("id", budgetHead.id)
      .eq("user_id", user.id);

    return {
      success: false,
      error: currentBudgetError.message,
    };
  }

  if (currentBudget) {
    const {
      error: monthlyHeadError,
    } = await supabase
      .from("monthly_budget_heads")
      .insert({
        user_id: user.id,
        monthly_budget_id: currentBudget.id,
        budget_head_id: budgetHead.id,
        allocated_amount: allocation,
        carry_forward: 0,
        paid_amount: 0,
      });

    if (monthlyHeadError) {
      await supabase
        .from("budget_heads")
        .delete()
        .eq("id", budgetHead.id)
        .eq("user_id", user.id);

      return {
        success: false,
        error: monthlyHeadError.message,
      };
    }
  }

  revalidatePath("/customize-budget");
  revalidatePath("/dashboard");
  revalidatePath("/home");

  return {
    success: true,
    budgetHeadId: budgetHead.id,
  };
}


export async function updateBudgetHead(
  budgetHeadId: string,
  name: string,
  headType: string,
  allocationValue: string,
  dueDayValue?: string
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

  const trimmedName = name.trim();

  if (!budgetHeadId) {
    return {
      success: false,
      error: "Budget head could not be identified.",
    };
  }

  if (!trimmedName) {
    return {
      success: false,
      error: "Budget head name is required.",
    };
  }

  if (!headType.trim()) {
    return {
      success: false,
      error: "Budget head type is required.",
    };
  }

  const allocation = Number(allocationValue);

  if (!Number.isFinite(allocation)) {
    return {
      success: false,
      error: "Allocation must be a valid number.",
    };
  }

  if (allocation < 0) {
    return {
      success: false,
      error: "Allocation cannot be negative.",
    };
  }

  const dueDayResult =
    parseDueDay(dueDayValue);

  if (!dueDayResult.ok) {
    return {
      success: false,
      error: dueDayResult.error,
    };
  }

  const {
    data,
    error,
  } = await supabase
    .from("budget_heads")
    .update({
      name: trimmedName,
      head_type: headType.trim(),
      default_monthly_allocation: allocation,
      due_day: dueDayResult.dueDay,
      updated_at: new Date().toISOString(),
    })
    .eq("id", budgetHeadId)
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
      error: "Budget head could not be found.",
    };
  }

  const currentMonthStart =
    await getViewerMonthStart(
      supabase,
      user.id
    );

  const {
    data: currentAndFutureBudgets,
    error: currentAndFutureBudgetsError,
  } = await supabase
    .from("monthly_budgets")
    .select("id")
    .eq("user_id", user.id)
    .gte("month_start", currentMonthStart);

  if (currentAndFutureBudgetsError) {
    return {
      success: false,
      error: currentAndFutureBudgetsError.message,
    };
  }

  const currentAndFutureBudgetIds = (
    currentAndFutureBudgets ?? []
  ).map((budget) => budget.id);

  if (currentAndFutureBudgetIds.length > 0) {
    const { error: updateMonthlyHeadsError } =
      await supabase
        .from("monthly_budget_heads")
        .update({
          allocated_amount: allocation,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("budget_head_id", budgetHeadId)
        .in(
          "monthly_budget_id",
          currentAndFutureBudgetIds
        );

    if (updateMonthlyHeadsError) {
      return {
        success: false,
        error: updateMonthlyHeadsError.message,
      };
    }
  }

  revalidatePath("/customize-budget");
  revalidatePath("/dashboard");

  return {
    success: true,
  };
}


export async function deactivateBudgetHead(
  budgetHeadId: string
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

  if (!budgetHeadId) {
    return {
      success: false,
      error: "Budget head could not be identified.",
    };
  }

  const {
    data: budgetHead,
    error: budgetHeadError,
  } = await supabase
    .from("budget_heads")
    .select("id")
    .eq("id", budgetHeadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (budgetHeadError || !budgetHead) {
    return {
      success: false,
      error:
        budgetHeadError?.message ??
        "Budget head could not be found.",
    };
  }

  /*
   * Deactivate the reusable budget-head configuration.
   */
  const {
    error: deactivateError,
  } = await supabase
    .from("budget_heads")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", budgetHeadId)
    .eq("user_id", user.id);

  if (deactivateError) {
    return {
      success: false,
      error: deactivateError.message,
    };
  }

  /*
   * Remove this head from the CURRENT month's dashboard
   * without touching historical months.
   */
  const currentMonthStart =
    await getViewerMonthStart(
      supabase,
      user.id
    );

  const {
    data: currentBudget,
    error: currentBudgetError,
  } = await supabase
    .from("monthly_budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq("month_start", currentMonthStart)
    .maybeSingle();

  if (currentBudgetError) {
    return {
      success: false,
      error: currentBudgetError.message,
    };
  }

  if (currentBudget) {
    const {
      data: currentMonthlyHead,
      error: currentMonthlyHeadError,
    } = await supabase
      .from("monthly_budget_heads")
      .select("id")
      .eq("user_id", user.id)
      .eq("monthly_budget_id", currentBudget.id)
      .eq("budget_head_id", budgetHeadId)
      .maybeSingle();

    if (currentMonthlyHeadError) {
      return {
        success: false,
        error: currentMonthlyHeadError.message,
      };
    }

    if (currentMonthlyHead) {
      /*
       * Remove transfers involving this current-month head first.
       */
      const { error: transferError } =
        await supabase
          .from("transfers")
          .delete()
          .eq("user_id", user.id)
          .eq(
            "monthly_budget_id",
            currentBudget.id
          )
          .or(
            `source_monthly_head_id.eq.${currentMonthlyHead.id},destination_monthly_head_id.eq.${currentMonthlyHead.id}`
          );

      if (transferError) {
        return {
          success: false,
          error: transferError.message,
        };
      }

      const { error: deleteMonthlyHeadError } =
        await supabase
          .from("monthly_budget_heads")
          .delete()
          .eq("id", currentMonthlyHead.id)
          .eq("user_id", user.id);

      if (deleteMonthlyHeadError) {
        return {
          success: false,
          error: deleteMonthlyHeadError.message,
        };
      }
    }
  }

  revalidatePath("/customize-budget");
  revalidatePath("/dashboard");

  return {
    success: true,
  };
}


export async function activateBudgetHead(
  budgetHeadId: string
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
    data: budgetHead,
    error: budgetHeadError,
  } = await supabase
    .from("budget_heads")
    .select(
      "id, default_monthly_allocation"
    )
    .eq("id", budgetHeadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (budgetHeadError || !budgetHead) {
    return {
      success: false,
      error:
        budgetHeadError?.message ??
        "Budget head could not be found.",
    };
  }

  const {
    error: activateError,
  } = await supabase
    .from("budget_heads")
    .update({
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", budgetHeadId)
    .eq("user_id", user.id);

  if (activateError) {
    return {
      success: false,
      error: activateError.message,
    };
  }

  /*
   * Put the head back into the CURRENT month's dashboard.
   */
  const currentMonthStart =
    await getViewerMonthStart(
      supabase,
      user.id
    );

  const {
    data: currentBudget,
    error: currentBudgetError,
  } = await supabase
    .from("monthly_budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq("month_start", currentMonthStart)
    .maybeSingle();

  if (currentBudgetError) {
    return {
      success: false,
      error: currentBudgetError.message,
    };
  }

  if (currentBudget) {
    const {
      data: existingMonthlyHead,
      error: existingMonthlyHeadError,
    } = await supabase
      .from("monthly_budget_heads")
      .select("id")
      .eq("user_id", user.id)
      .eq("monthly_budget_id", currentBudget.id)
      .eq("budget_head_id", budgetHeadId)
      .maybeSingle();

    if (existingMonthlyHeadError) {
      return {
        success: false,
        error:
          existingMonthlyHeadError.message,
      };
    }

    if (!existingMonthlyHead) {
      const {
        error: insertError,
      } = await supabase
        .from("monthly_budget_heads")
        .insert({
          user_id: user.id,
          monthly_budget_id: currentBudget.id,
          budget_head_id: budgetHeadId,
          allocated_amount:
            budgetHead.default_monthly_allocation,
          carry_forward: 0,
          paid_amount: 0,
        });

      if (insertError) {
        return {
          success: false,
          error: insertError.message,
        };
      }
    }
  }

  revalidatePath("/customize-budget");
  revalidatePath("/dashboard");

  return {
    success: true,
  };
}


export async function deleteBudgetHead(
  budgetHeadId: string
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

  if (!budgetHeadId) {
    return {
      success: false,
      error: "Budget head could not be identified.",
    };
  }

  const {
    data: budgetHead,
    error: budgetHeadError,
  } = await supabase
    .from("budget_heads")
    .select("id")
    .eq("id", budgetHeadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (budgetHeadError || !budgetHead) {
    return {
      success: false,
      error:
        budgetHeadError?.message ??
        "Budget head could not be found.",
    };
  }

  /*
   * Find every monthly snapshot using this budget head.
   */
  const {
    data: monthlyHeads,
    error: monthlyHeadsError,
  } = await supabase
    .from("monthly_budget_heads")
    .select(
      "id, monthly_budget_id"
    )
    .eq("user_id", user.id)
    .eq("budget_head_id", budgetHeadId);

  if (monthlyHeadsError) {
    return {
      success: false,
      error: monthlyHeadsError.message,
    };
  }

  const monthlyHeadIds =
    (monthlyHeads ?? []).map(
      (head) => head.id
    );

  /*
   * Delete transfers involving those monthly snapshots.
   */
  if (monthlyHeadIds.length > 0) {
    const {
      error: transferError,
    } = await supabase
      .from("transfers")
      .delete()
      .eq("user_id", user.id)
      .or(
        `source_monthly_head_id.in.(${monthlyHeadIds.join(",")}),destination_monthly_head_id.in.(${monthlyHeadIds.join(",")})`
      );

    if (transferError) {
      return {
        success: false,
        error: transferError.message,
      };
    }

    /*
     * Delete the monthly snapshots.
     */
    const {
      error: monthlyDeleteError,
    } = await supabase
      .from("monthly_budget_heads")
      .delete()
      .eq("user_id", user.id)
      .eq("budget_head_id", budgetHeadId);

    if (monthlyDeleteError) {
      return {
        success: false,
        error: monthlyDeleteError.message,
      };
    }
  }

  /*
   * Finally delete the reusable budget-head record.
   */
  const {
    error: deleteError,
  } = await supabase
    .from("budget_heads")
    .delete()
    .eq("id", budgetHeadId)
    .eq("user_id", user.id);

  if (deleteError) {
    return {
      success: false,
      error: deleteError.message,
    };
  }

  revalidatePath("/customize-budget");
  revalidatePath("/dashboard");
  revalidatePath("/home");

  return {
    success: true,
  };
}

/*
 * Reorder budget heads. `orderedIds` is the full list of the user's
 * budget-head ids in the new top-to-bottom order; each row's sort_order
 * is set to its position.
 */
export async function reorderBudgetHeads(
  orderedIds: string[]
) {
  const supabase = await createClient();

  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  if (
    !Array.isArray(orderedIds) ||
    orderedIds.length === 0
  ) {
    return { success: true };
  }

  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error } = await supabase
      .from("budget_heads")
      .update({
        sort_order: index + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderedIds[index])
      .eq("user_id", userId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  revalidatePath("/customize-budget");
  revalidatePath("/dashboard");
  revalidatePath("/home");

  return { success: true };
}

export type PaymentHistoryEntry = {
  // head_payments row id for Paid / Used entries (removable); null for
  // fund moves and pool top-ups (undo those from their own controls).
  id: string | null;
  createdAt: string;
  // Signed as a money movement for this head:
  //   negative = money left the head (a payment made / sent out)
  //   positive = money came into the head (received / reversed)
  amount: number;
  forMonth: string;
  label: string;
};

/*
 * The money log for one budget head, newest first. Merges: changes to
 * Paid / Used, head-to-head fund moves (both directions), and money moved
 * in from the Daily Spending pool. Reversed moves disappear on their own
 * because this is computed from the live tables.
 */
export async function getBudgetHeadPaymentHistory(
  budgetHeadId: string
): Promise<
  | { success: true; history: PaymentHistoryEntry[] }
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

  // Every monthly row for the user - to resolve month + head names.
  const { data: monthlyHeadRows, error: monthlyHeadRowsError } =
    await supabase
      .from("monthly_budget_heads")
      .select(
        "id, budget_head_id, monthly_budgets!inner ( month_start ), budget_heads!inner ( name )"
      )
      .eq("user_id", userId);

  if (monthlyHeadRowsError) {
    return {
      success: false,
      error: monthlyHeadRowsError.message,
    };
  }

  const monthByMonthlyHead = new Map<
    string,
    string
  >();
  const nameByMonthlyHead = new Map<
    string,
    string
  >();
  const myMonthlyHeadIds: string[] = [];

  for (const row of monthlyHeadRows ?? []) {
    const budget = Array.isArray(
      row.monthly_budgets
    )
      ? row.monthly_budgets[0]
      : row.monthly_budgets;
    const head = Array.isArray(
      row.budget_heads
    )
      ? row.budget_heads[0]
      : row.budget_heads;

    monthByMonthlyHead.set(
      row.id as string,
      (budget?.month_start as string) ?? ""
    );
    nameByMonthlyHead.set(
      row.id as string,
      (head?.name as string) ?? "a head"
    );

    if (
      row.budget_head_id === budgetHeadId
    ) {
      myMonthlyHeadIds.push(row.id as string);
    }
  }

  const idList = `(${myMonthlyHeadIds.join(
    ","
  )})`;

  const [
    paymentsResult,
    transfersResult,
    movesResult,
  ] = await Promise.all([
    supabase
      .from("head_payments")
      .select("id, amount, created_at, monthly_budget_head_id")
      .eq("user_id", userId)
      .eq("budget_head_id", budgetHeadId),
    myMonthlyHeadIds.length > 0
      ? supabase
          .from("transfers")
          .select(
            "amount, created_at, source_monthly_head_id, destination_monthly_head_id"
          )
          .eq("user_id", userId)
          .or(
            `source_monthly_head_id.in.${idList},destination_monthly_head_id.in.${idList}`
          )
      : Promise.resolve({
          data: [] as unknown[],
          error: null,
        }),
    myMonthlyHeadIds.length > 0
      ? supabase
          .from("spending_moves")
          .select(
            "amount, created_at, destination_monthly_head_id"
          )
          .eq("user_id", userId)
          .eq("destination_kind", "budget_head")
          .in(
            "destination_monthly_head_id",
            myMonthlyHeadIds
          )
      : Promise.resolve({
          data: [] as unknown[],
          error: null,
        }),
  ]);

  for (const result of [
    paymentsResult,
    transfersResult,
    movesResult,
  ]) {
    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }
  }

  const history: PaymentHistoryEntry[] = [];

  for (const row of (paymentsResult.data ??
    []) as {
    id: string;
    amount: number;
    created_at: string;
    monthly_budget_head_id: string;
  }[]) {
    const delta = Number(row.amount);

    history.push({
      id: row.id,
      createdAt: row.created_at ?? "",
      // Paying more = money out of the head.
      amount: -delta,
      forMonth:
        monthByMonthlyHead.get(
          row.monthly_budget_head_id
        ) ?? "",
      label:
        delta >= 0
          ? "Paid / Used"
          : "Paid / Used reduced",
    });
  }

  for (const row of (transfersResult.data ??
    []) as {
    amount: number;
    created_at: string;
    source_monthly_head_id: string;
    destination_monthly_head_id: string;
  }[]) {
    const amount = Number(row.amount);
    const isIncoming = myMonthlyHeadIds.includes(
      row.destination_monthly_head_id
    );

    history.push({
      id: null,
      createdAt: row.created_at ?? "",
      amount: isIncoming ? amount : -amount,
      forMonth:
        monthByMonthlyHead.get(
          isIncoming
            ? row.destination_monthly_head_id
            : row.source_monthly_head_id
        ) ?? "",
      label: isIncoming
        ? `Received from ${
            nameByMonthlyHead.get(
              row.source_monthly_head_id
            ) ?? "a head"
          }`
        : `Sent to ${
            nameByMonthlyHead.get(
              row.destination_monthly_head_id
            ) ?? "a head"
          }`,
    });
  }

  for (const row of (movesResult.data ??
    []) as {
    amount: number;
    created_at: string;
    destination_monthly_head_id: string;
  }[]) {
    history.push({
      id: null,
      createdAt: row.created_at ?? "",
      amount: Number(row.amount),
      forMonth:
        monthByMonthlyHead.get(
          row.destination_monthly_head_id
        ) ?? "",
      label: "Received from Spending Pool",
    });
  }

  history.sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  );

  return {
    success: true,
    history: history.slice(0, 10),
  };
}

/*
 * Remove a single Paid / Used entry from a head's history. Log-only -
 * it does not change the head's current Paid / Used amount or balance.
 */
export async function deleteHeadPayment(
  paymentId: string
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
    .from("head_payments")
    .delete()
    .eq("id", paymentId)
    .eq("user_id", userId);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/dashboard");

  return { success: true };
}

/*
 * Save how the Budget Head cards are ordered on the Fixed Expenses page.
 * Stored on the user's profile so it sticks across visits and devices.
 */
export async function setHeadSort(
  mode: string
) {
  const supabase = await createClient();

  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  if (!isHeadSortMode(mode)) {
    return {
      success: false,
      error: "Unknown sort option.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, head_sort: mode },
      { onConflict: "id" }
    );

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/dashboard");

  return { success: true };
}
