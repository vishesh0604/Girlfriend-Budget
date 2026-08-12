import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  calculateHeadState,
  calculateSpendingPool,
  calculateDailyBudget,
  calculateCommittedAmount,
  calculateCommittedBreakdown,
  type TransferRecord,
} from "@/lib/supabase/budget/calculations";

import { initializeMonthlyBudget } from "./actions";
import SalaryEditor from "./SalaryEditor";
import BudgetHeadEditor from "./BudgetHeadEditor";
import MonthNavigator from "./MonthNavigator";
import PushRemainingButton from "./PushRemainingButton";
import HomeButton from "./HomeButton";

type DashboardPageProps = {
  searchParams: Promise<{
    month?: string;
  }>;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function getCurrentMonthStart() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-01`;
}

function isValidMonthStart(
  value: string | undefined
) {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}-01$/.test(value);
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const params = await searchParams;


  /*
   * If a month is explicitly selected, load that
   * month. Otherwise, preserve the existing behavior
   * of opening the latest existing month.
   */
  let requestedMonth = isValidMonthStart(
    params.month
  )
    ? params.month
    : undefined;

  let monthlyBudget = null;

  if (requestedMonth) {
    const {
      data: requestedBudget,
      error: requestedBudgetError,
    } = await supabase
      .from("monthly_budgets")
      .select("id, month_start, salary")
      .eq("user_id", user.id)
      .eq("month_start", requestedMonth)
      .maybeSingle();

    if (requestedBudgetError) {
      throw new Error(
        requestedBudgetError.message
      );
    }

    monthlyBudget = requestedBudget;

    if (!monthlyBudget) {
      if (
        requestedMonth >
        getCurrentMonthStart()
      ) {
        const result =
          await initializeMonthlyBudget(
            requestedMonth
          );

        if (!result.success) {
          throw new Error(
            result.error ??
              "Unable to synchronize future month."
          );
        }

        const refreshed =
          await supabase
            .from("monthly_budgets")
            .select(
              "id, month_start, salary"
            )
            .eq("user_id", user.id)
            .eq(
              "month_start",
              requestedMonth
            )
            .single();

        if (
          refreshed.error ||
          !refreshed.data
        ) {
          throw new Error(
            refreshed.error?.message ??
              "Monthly budget could not be loaded."
          );
        }

        monthlyBudget =
          refreshed.data;
    } else {
    const result =
        await initializeMonthlyBudget(
        requestedMonth
        );

    if (!result.success) {
        throw new Error(
        result.error ??
            "Unable to initialize historical month."
        );
    }

    const refreshed =
        await supabase
        .from("monthly_budgets")
        .select(
            "id, month_start, salary"
        )
        .eq("user_id", user.id)
        .eq(
            "month_start",
            requestedMonth
        )
        .single();

    if (
        refreshed.error ||
        !refreshed.data
    ) {
        throw new Error(
        refreshed.error?.message ??
            "Historical monthly budget could not be loaded."
        );
    }

    monthlyBudget =
        refreshed.data;
    }
    }
  } else {
    const currentMonth =
      getCurrentMonthStart();

    const {
      data: currentBudget,
      error: currentBudgetError,
    } = await supabase
      .from("monthly_budgets")
      .select(
        "id, month_start, salary"
      )
      .eq("user_id", user.id)
      .eq(
        "month_start",
        currentMonth
      )
      .maybeSingle();

    if (currentBudgetError) {
      throw new Error(
        currentBudgetError.message
      );
    }

    monthlyBudget = currentBudget;

    if (!monthlyBudget) {
      const result =
        await initializeMonthlyBudget(
          currentMonth
        );

      if (!result.success) {
        throw new Error(
          result.error ??
            "Unable to initialize monthly budget."
        );
      }

      const refreshed =
        await supabase
          .from("monthly_budgets")
          .select(
            "id, month_start, salary"
          )
          .eq("user_id", user.id)
          .eq(
            "month_start",
            currentMonth
          )
          .single();

      if (
        refreshed.error ||
        !refreshed.data
      ) {
        throw new Error(
          refreshed.error?.message ??
            "Monthly budget could not be loaded."
        );
      }

      monthlyBudget =
        refreshed.data;
    }
  }
  const {
    data: monthlyHeads,
    error: monthlyHeadsError,
  } = await supabase
    .from("monthly_budget_heads")
    .select(`
      id,
      budget_head_id,
      allocated_amount,
      carry_forward,
      paid_amount,
      budget_heads (
        name,
        head_type
      )
    `)
    .eq("user_id", user.id)
    .eq(
      "monthly_budget_id",
      monthlyBudget.id
    )
    .order("created_at", {
      ascending: true,
    });

  if (monthlyHeadsError) {
    throw new Error(
      monthlyHeadsError.message
    );
  }

  const {
    data: transfers,
    error: transfersError,
  } = await supabase
    .from("transfers")
    .select(
      "id, source_monthly_head_id, destination_monthly_head_id, amount, created_at"
    )
    .eq("user_id", user.id)
    .eq(
      "monthly_budget_id",
      monthlyBudget.id
    )
    .order("created_at", {
      ascending: false,
    });

  if (transfersError) {
    throw new Error(
      transfersError.message
    );
  }

  const transferRecords: TransferRecord[] =
    (transfers ?? []).map((transfer) => ({
      sourceHeadId:
        transfer.source_monthly_head_id,
      destinationHeadId:
        transfer.destination_monthly_head_id,
      amount: Number(
        transfer.amount
      ),
    }));

  const headStates = (
    monthlyHeads ?? []
  ).map((head) => {
    const state = calculateHeadState(
      {
        id: head.id,
        allocatedAmount: Number(
          head.allocated_amount
        ),
        carryForward: Number(
          head.carry_forward
        ),
        paidAmount: Number(
          head.paid_amount
        ),
      },
      transferRecords
    );

    const budgetHead = Array.isArray(
      head.budget_heads
    )
      ? head.budget_heads[0]
      : head.budget_heads;

    return {
      ...head,
      name:
        budgetHead?.name ??
        "Unnamed Head",
      headType:
        budgetHead?.head_type ??
        "Other",
      state,
    };
  });

  const headOrder = [
    ["Home Rent"],
    ["Electricity"],
    ["Gym"],
    ["Appliance Rent", "Appliances Rent"],
    ["WiFi"],
    ["Apple Plus"],
    ["Maid"],
    ["Garbage Man"],
    ["Investment"],
    ["Savings", "Saving"],
  ];

  const normalizedHeadOrder = new Map<
    string,
    number
  >();

  headOrder.forEach((names, index) => {
    names.forEach((name) => {
      normalizedHeadOrder.set(
        name.toLowerCase(),
        index
      );
    });
  });

  headStates.sort((a, b) => {
    const aOrder =
      normalizedHeadOrder.get(
        a.name.toLowerCase()
      ) ?? Number.MAX_SAFE_INTEGER;

    const bOrder =
      normalizedHeadOrder.get(
        b.name.toLowerCase()
      ) ?? Number.MAX_SAFE_INTEGER;

    return aOrder - bOrder;
  });

  /*
   * Find the most recent transfer for each
   * individual budget head.
   */
  const recentTransferByHead = new Map<
    string,
    {
      transferId: string;
      direction: "out" | "in";
      amount: number;
      otherHeadName: string;
      createdAt: string;
    }
  >();

  for (const transfer of transfers ?? []) {
    const sourceHead = headStates.find(
      (head) =>
        head.id ===
        transfer.source_monthly_head_id
    );

    const destinationHead =
      headStates.find(
        (head) =>
          head.id ===
          transfer.destination_monthly_head_id
      );

    if (
      sourceHead &&
      !recentTransferByHead.has(
        sourceHead.id
      )
    ) {
      recentTransferByHead.set(
        sourceHead.id,
        {
          transferId: transfer.id,
          direction: "out",
          amount: Number(
            transfer.amount
          ),
          otherHeadName:
            destinationHead?.name ??
            "Unknown Head",
          createdAt:
            transfer.created_at,
        }
      );
    }

    if (
      destinationHead &&
      !recentTransferByHead.has(
        destinationHead.id
      )
    ) {
      recentTransferByHead.set(
        destinationHead.id,
        {
          transferId: transfer.id,
          direction: "in",
          amount: Number(
            transfer.amount
          ),
          otherHeadName:
            sourceHead?.name ??
            "Unknown Head",
          createdAt:
            transfer.created_at,
        }
      );
    }
  }

  /*
   * Because transfers are ordered newest-first,
   * the first transfer is the latest transfer
   * for the entire monthly budget.
   */
  const latestTransfer =
    transfers &&
    transfers.length > 0
      ? transfers[0]
      : null;

  const latestTransferSource =
    latestTransfer
      ? headStates.find(
          (head) =>
            head.id ===
            latestTransfer.source_monthly_head_id
        )
      : null;

  const latestTransferDestination =
    latestTransfer
      ? headStates.find(
          (head) =>
            head.id ===
            latestTransfer.destination_monthly_head_id
        )
      : null;

  const headCalculationData =
    headStates.map((head) => ({
      amount: Number(
        head.allocated_amount
      ),
      headType: head.headType,
    }));

  const committedAmount =
    calculateCommittedAmount(
      headCalculationData
    );

  const committedBreakdown =
    calculateCommittedBreakdown(
      headCalculationData
    );

  const salary = Number(
    monthlyBudget.salary
  );

  const spendingPool =
    calculateSpendingPool(
      salary,
      committedAmount
    );

  const monthDate = new Date(
    `${monthlyBudget.month_start}T00:00:00`
  );

  const numberOfDays = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0
  ).getDate();

  const dailyBudget =
    calculateDailyBudget(
      spendingPool,
      numberOfDays
    );



  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-50 px-5 py-8 text-zinc-950 sm:px-8">
    <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between gap-4">
        <HomeButton />

        <PushRemainingButton
            monthlyBudgetId={monthlyBudget.id}
            heads={headStates.map((head) => ({
            id: head.id,
            name: head.name,
            remaining: head.state.finalBalance,
            }))}
        />
        </div>

        <MonthNavigator
        monthStart={monthlyBudget.month_start}
        />
        <section className="space-y-4">
          {/* Primary summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <SalaryEditor
                monthlyBudgetId={
                  monthlyBudget.id
                }
                salary={salary}
              />
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-zinc-500">
                Spending Pool
              </p>

              <p className="mt-2 text-2xl font-semibold">
                {formatCurrency(
                  spendingPool
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-zinc-500">
                Daily Budget
              </p>

              <p className="mt-2 text-2xl font-semibold">
                {formatCurrency(
                  Math.round(
                    dailyBudget
                  )
                )}

                <span className="ml-1 text-sm font-normal text-zinc-500">
                  / day
                </span>
              </p>
            </div>
          </div>

          {/* Committed breakdown */}
          <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="min-w-[90px]">
                <p className="text-sm text-zinc-500">
                  Committed
                </p>

                <p className="mt-1 text-2xl font-semibold">
                  {formatCurrency(
                    committedAmount
                  )}
                </p>
              </div>

              <div className="hidden h-10 w-px bg-zinc-200 sm:block" />

              <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-zinc-500">
                    Fixed Expenses
                  </p>

                  <p className="mt-1 font-semibold">
                    {formatCurrency(
                      committedBreakdown.fixedExpenses
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">
                    Investments
                  </p>

                  <p className="mt-1 font-semibold">
                    {formatCurrency(
                      committedBreakdown.investments
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">
                    Savings
                  </p>

                  <p className="mt-1 font-semibold">
                    {formatCurrency(
                      committedBreakdown.savings
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">
              Budget Heads
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Your monthly allocations and current balances.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {headStates.map((head) => {
              const transferOptions =
                headStates
                  .filter(
                    (otherHead) =>
                      otherHead.id !==
                      head.id
                  )
                  .map((otherHead) => ({
                    id: otherHead.id,
                    name: otherHead.name,
                  }));

              const recentTransfer =
                recentTransferByHead.get(
                  head.id
                );

              return (
                <article
                  key={head.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <BudgetHeadEditor
                    monthlyHeadId={head.id}
                    monthlyBudgetId={
                      monthlyBudget.id
                    }
                    name={head.name}
                    allocation={Number(
                      head.allocated_amount
                    )}
                    paidAmount={Number(
                      head.paid_amount
                    )}
                    remaining={
                      head.state.finalBalance
                    }
                    transferOptions={
                      transferOptions
                    }
                    recentTransfer={
                      recentTransfer
                    }
                  />
                </article>
              );
            })}
          </div>

          {/* Current balances summary */}
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">
                  Current Balances
                </h2>

                <p className="mt-0.5 text-xs text-zinc-500">
                  After Paid / Used and transfers
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
              {headStates.map((head) => (
                <div
                  key={head.id}
                  className="flex items-baseline gap-2 whitespace-nowrap"
                >
                  <span className="text-sm text-zinc-500">
                    {head.name}
                  </span>

                  <span className="text-sm font-semibold">
                    {formatCurrency(
                      head.state.finalBalance
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-zinc-100 pt-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="text-zinc-500">
                  Latest Transfer
                </span>

                {latestTransfer &&
                latestTransferSource &&
                latestTransferDestination ? (
                  <>
                    <span className="font-medium">
                      {latestTransferSource.name}
                    </span>

                    <span className="text-zinc-400">
                      →
                    </span>

                    <span className="font-medium">
                      {
                        latestTransferDestination.name
                      }
                    </span>

                    <span className="font-semibold">
                      {formatCurrency(
                        Number(
                          latestTransfer.amount
                        )
                      )}
                    </span>
                  </>
                ) : (
                  <span className="text-zinc-400">
                    No transfers yet
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}