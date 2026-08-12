"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  calculateHeadState,
  type TransferRecord,
} from "@/lib/supabase/budget/calculations";

function getPreviousMonthStart(
  monthStart: string
) {
  const [year, month] =
    monthStart.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, 1)
  );

  date.setUTCMonth(
    date.getUTCMonth() - 1
  );

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}-01`;
}

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
    const now = new Date();

    const currentMonthStart =
      `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}-01`;

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
  const now = new Date();

  const currentMonthStart =
    `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-01`;

  if (monthStart < currentMonthStart) {
    return {
      success: false,
      error:
        "Past months cannot be initialized automatically.",
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

  const initialSalary = 0;

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

  const { error } = await supabase
    .from("monthly_budgets")
    .update({
      salary,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", monthlyBudgetId)
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

  const {
    data: monthlyHead,
    error: monthlyHeadError,
  } = await supabase
    .from("monthly_budget_heads")
    .select(
      "allocated_amount, carry_forward"
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

  const allocatedAmount = Number(
    monthlyHead.allocated_amount
  );

  const carryForward = Number(
    monthlyHead.carry_forward
  );

  const totalAvailable =
    allocatedAmount + carryForward;

  if (paidAmount > totalAvailable) {
    return {
      success: false,
      error:
        `Paid / Used amount cannot exceed the total available amount of ₹${totalAvailable.toLocaleString(
          "en-IN"
        )}.`,
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
        "A budget head cannot transfer money to itself.",
    };
  }

  const amount = Number(
    amountValue
  );

  if (!Number.isFinite(amount)) {
    return {
      success: false,
      error:
        "Transfer amount must be a valid number.",
    };
  }

  if (amount <= 0) {
    return {
      success: false,
      error:
        "Transfer amount must be greater than ₹0.",
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

  const availableBalance =
    remaining -
    transfersOut +
    transfersIn;

  if (amount > availableBalance) {
    return {
      success: false,
      error:
        `You can transfer a maximum of ₹${availableBalance.toLocaleString(
          "en-IN"
        )}.`,
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

  const transferRecords: TransferRecord[] =
    (transfers ?? []).map((transfer) => ({
      sourceHeadId:
        transfer.source_monthly_head_id,
      destinationHeadId:
        transfer.destination_monthly_head_id,
      amount: Number(transfer.amount),
    }));

  // Calculate the CURRENT actual remaining balance,
  // including carry-forward and transfers.
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
    .select("id, budget_head_id")
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

export async function createBudgetHead(
  name: string,
  headType: string,
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

  const now = new Date();

  const currentMonthStart =
    `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-01`;

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

  const {
    data,
    error,
  } = await supabase
    .from("budget_heads")
    .update({
      name: trimmedName,
      head_type: headType.trim(),
      default_monthly_allocation: allocation,
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
  const now = new Date();

  const currentMonthStart =
    `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-01`;

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
  const now = new Date();

  const currentMonthStart =
    `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-01`;

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
