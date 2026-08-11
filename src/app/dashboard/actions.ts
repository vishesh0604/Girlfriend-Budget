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

  if (
    !budgetHeads ||
    budgetHeads.length === 0
  ) {
    return {
      success: false,
      error: "No active budget heads exist.",
    };
  }

  const previousMonthStart =
    getPreviousMonthStart(monthStart);

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

  const carryForwardByHeadId =
    new Map<string, number>();

  if (previousBudget) {
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
  }

  const initialSalary = 31500;

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
      carry_forward:
        carryForwardByHeadId.get(
          head.id
        ) ?? 0,
      paid_amount: 0,
    }));

  const {
    error: monthlyHeadsError,
  } = await supabase
    .from("monthly_budget_heads")
    .insert(monthlyHeadRows);

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