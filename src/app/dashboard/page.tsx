import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/authUser";
import {
  calculateHeadState,
  calculateSpendingPool,
  calculateDailyBudget,
  calculateCommittedAmount,
  calculateCommittedBreakdown,
  type TransferRecord,
} from "@/lib/supabase/budget/calculations";

import { loadSpendingMoveTransferRecords } from "@/lib/supabase/spending/moves";
import {
  monthStartOf,
  nowInZone,
  DEFAULT_TIME_ZONE,
} from "@/lib/time";
import { formatMoney } from "@/lib/money";
import { isCurrencyCode } from "@/lib/currencies";

import { initializeMonthlyBudget } from "./actions";
import SalaryEditor from "./SalaryEditor";
import BudgetHeadEditor from "./BudgetHeadEditor";
import MonthNavigator from "./MonthNavigator";
import PushRemainingButton from "./PushRemainingButton";
import HomeButton from "./HomeButton";
import SortHeadsButton from "./SortHeadsButton";
import {
  isHeadSortMode,
  type HeadSortMode,
} from "./headSort";
import HelpButton from "../home/HelpButton";

type DashboardPageProps = {
  searchParams: Promise<{
    month?: string;
  }>;
};


function isValidMonthStart(
  value: string | undefined
) {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}-01$/.test(value);
}

/*
 * Days from today (viewer's zone) until a head's due day this month.
 * Only meaningful for the current month; anything else sorts to the
 * end. Negative = overdue.
 */
function daysUntilDue(
  monthStart: string,
  dueDay: number,
  now: Date
): number {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  if (monthStart !== monthStartOf(now)) {
    return Number.POSITIVE_INFINITY;
  }

  const daysInMonth = new Date(
    Date.UTC(year, month + 1, 0)
  ).getUTCDate();

  const due = Date.UTC(
    year,
    month,
    Math.min(dueDay, daysInMonth)
  );
  const today = Date.UTC(year, month, day);

  return Math.round(
    (due - today) / 86400000
  );
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const supabase = await createClient();

  const userId = await getAuthUserId(supabase);

  if (!userId) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("head_sort, timezone, currency")
    .eq("id", userId)
    .maybeSingle();

  const currency = isCurrencyCode(
    profile?.currency
  )
    ? profile.currency
    : "INR";
  const formatCurrency = (amount: number) =>
    formatMoney(amount, currency);

  const savedSort = profile?.head_sort;
  const headSort: HeadSortMode =
    isHeadSortMode(savedSort)
      ? savedSort
      : "custom";

  const viewerNow = nowInZone(
    typeof profile?.timezone === "string" &&
      profile.timezone
      ? profile.timezone
      : DEFAULT_TIME_ZONE
  );
  const currentMonthStart =
    monthStartOf(viewerNow);

  const params = await searchParams;


  /*
   * If a month is explicitly selected, load that
   * month. Otherwise, preserve the existing behavior
   * of opening the latest existing month.
   */
  const requestedMonth = isValidMonthStart(
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
      .eq("user_id", userId)
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
        requestedMonth > currentMonthStart
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
            .eq("user_id", userId)
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
        .eq("user_id", userId)
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
    const currentMonth = currentMonthStart;

    const {
      data: currentBudget,
      error: currentBudgetError,
    } = await supabase
      .from("monthly_budgets")
      .select(
        "id, month_start, salary"
      )
      .eq("user_id", userId)
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
          .eq("user_id", userId)
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
  const [
    monthlyHeadsResult,
    transfersResult,
  ] = await Promise.all([
    supabase
      .from("monthly_budget_heads")
      .select(`
        id,
        budget_head_id,
        allocated_amount,
        carry_forward,
        paid_amount,
        note,
        budget_heads (
          name,
          head_type,
          due_day,
          sort_order
        )
      `)
      .eq("user_id", userId)
      .eq(
        "monthly_budget_id",
        monthlyBudget.id
      )
      .order("created_at", {
        ascending: true,
      }),
    supabase
      .from("transfers")
      .select(
        "id, source_monthly_head_id, destination_monthly_head_id, amount, created_at"
      )
      .eq("user_id", userId)
      .eq(
        "monthly_budget_id",
        monthlyBudget.id
      )
      .order("created_at", {
        ascending: false,
      }),
  ]);

  const monthlyHeads = monthlyHeadsResult.data;
  const transfers = transfersResult.data;

  if (monthlyHeadsResult.error) {
    throw new Error(
      monthlyHeadsResult.error.message
    );
  }

  if (transfersResult.error) {
    throw new Error(
      transfersResult.error.message
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

  /*
   * Money moved in from the Daily Spending pool counts as a
   * transfer-in on the destination head (PROJECT_SPEC.md
   * section 51). It lifts the head balance and Current Account
   * Balance without changing allocations.
   */
  const spendingMoveRecords =
    await loadSpendingMoveTransferRecords(
      supabase,
      userId,
      (monthlyHeads ?? []).map(
        (head) => head.id
      )
    );

  const allTransferRecords: TransferRecord[] = [
    ...transferRecords,
    ...spendingMoveRecords,
  ];

  // Total moved into each head from the Daily Spending pool this month -
  // shown on the card so "Remaining above Allocated" isn't a mystery.
  const spendingPoolInByHead = new Map<
    string,
    number
  >();

  for (const record of spendingMoveRecords) {
    spendingPoolInByHead.set(
      record.destinationHeadId,
      (spendingPoolInByHead.get(
        record.destinationHeadId
      ) ?? 0) + (record.amount ?? 0)
    );
  }

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
      allTransferRecords
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
      dueDay:
        (budgetHead?.due_day as
          | number
          | null) ?? null,
      sortOrder:
        Number(budgetHead?.sort_order) ||
        Number.MAX_SAFE_INTEGER,
      state,
    };
  });

  /*
   * Order the cards per the user's chosen sort (profiles.head_sort).
   * "custom" is the order set with Reorder heads in Customize Budget;
   * every mode falls back to that order to break ties.
   */
  if (headSort === "name") {
    headStates.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  } else if (headSort === "alloc-desc") {
    headStates.sort(
      (a, b) =>
        Number(b.allocated_amount) -
          Number(a.allocated_amount) ||
        a.sortOrder - b.sortOrder
    );
  } else if (headSort === "alloc-asc") {
    headStates.sort(
      (a, b) =>
        Number(a.allocated_amount) -
          Number(b.allocated_amount) ||
        a.sortOrder - b.sortOrder
    );
  } else if (headSort === "due") {
    // Heads that still owe money and have a due day sort by urgency
    // (most overdue first); everything else sinks to the bottom in
    // custom order.
    const urgency = (
      head: (typeof headStates)[number]
    ) =>
      head.dueDay != null &&
      head.state.finalBalance > 0
        ? daysUntilDue(
            monthlyBudget.month_start,
            head.dueDay,
            viewerNow
          )
        : Number.POSITIVE_INFINITY;

    headStates.sort(
      (a, b) =>
        urgency(a) - urgency(b) ||
        a.sortOrder - b.sortOrder
    );
  } else {
    headStates.sort(
      (a, b) => a.sortOrder - b.sortOrder
    );
  }

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
  const currentAccountBalance = headStates.reduce(
    (total, head) => total + head.state.finalBalance,
    0
  );



  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-50 px-5 py-8 text-zinc-950 sm:px-8">
    <div className="mx-auto max-w-5xl">
    <div className="mb-4 flex items-center justify-between gap-4">
    <div className="flex items-center gap-2">
        <HomeButton />

        <HelpButton
        title="Fixed Expenses"
        align="center"
        >
        <div className="space-y-5">
            <div>
            <p className="font-semibold text-[#26354d]">
                Month Navigator
            </p>
            <p className="mt-1">
                Use the month and year selectors to move between your current,
                previous, and future monthly budgets. The Fixed Expenses page
                updates to show the selected month.
            </p>
            </div>

            <div>
            <p className="font-semibold text-[#26354d]">
                Salary
            </p>
            <p className="mt-1">
                Your monthly income for the selected month. This is the starting
                point for the main budget calculations.
            </p>
            </div>

            <div>
            <p className="font-semibold text-[#26354d]">
                Committed
            </p>
            <p className="mt-1">
                The total amount allocated to your committed budget heads,
                with a breakdown into Fixed Expenses, Investments, and Savings.
            </p>
            </div>

            <div>
            <p className="font-semibold text-[#26354d]">
                Spending Pool
            </p>
            <p className="mt-1">
                The amount left from your salary after subtracting your
                committed allocations.
            </p>
            </div>

            <div>
            <p className="font-semibold text-[#26354d]">
                Daily Budget
            </p>
            <p className="mt-1">
                Your Spending Pool divided across the number of days in the
                selected month. This gives you the daily spending limit.
            </p>
            </div>

            <div>
            <p className="font-semibold text-[#26354d]">
                Budget Heads
            </p>
            <p className="mt-1">
                Each budget head shows its allocation, paid/used amount,
                fund moves, and current remaining balance. The remaining balance
                is updated as you make changes. If you have sent money into a
                head from the Daily Spending pool (via Move remaining), the
                Remaining line shows a green &ldquo;+ X from Spending Pool&rdquo;
                note &mdash; that&apos;s why Remaining can be above Allocated.
                Tap &ldquo;Spending Pool&rdquo; in that note to jump to the
                Move remaining list.
            </p>
            </div>

            <div>
            <p className="font-semibold text-[#26354d]">
                Bill due reminder
            </p>
            <p className="mt-1">
                If a head has a bill due day set (in
                Customize Budget), a tag shows next to its
                name &mdash; &ldquo;Home Rent (due in 12
                days)&rdquo;, &ldquo;due today&rdquo;, or
                &ldquo;overdue by 3 days&rdquo;. It stays
                visible all month as long as the head
                isn&apos;t fully paid, and turns red once
                it&apos;s due or overdue.
            </p>
            </div>

            <div>
            <p className="font-semibold text-[#26354d]">
                History
            </p>
            <p className="mt-1">
                The &ldquo;History&rdquo; button on each
                card opens that head&apos;s money log &mdash;
                payments, fund moves and pool top-ups. It
                has its own ? inside the popup for a full
                explanation.
            </p>
            </div>

            <div>
            <p className="font-semibold text-[#26354d]">
                Push Remaining
            </p>
            <p className="mt-1">
                Moves selected remaining budget-head balances into the
                immediately following month. It has its own ? for more
                information.
            </p>
            </div>

            <div>
            <p className="font-semibold text-[#26354d]">
                Current Balances
            </p>
            <p className="mt-1">
                Shows the remaining balance of each budget head after payments,
                usage, and fund moves. It has its own ? for more information.
            </p>
            </div>
        </div>
        </HelpButton>
    </div>

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
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">
                Budget Heads
              </h2>

              {headStates.length > 1 && (
                <SortHeadsButton
                  current={headSort}
                />
              )}
            </div>

            <p className="mt-1 text-sm text-zinc-500">
              Your monthly allocations and current
              balances.
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
                    budgetHeadId={
                      head.budget_head_id
                    }
                    name={head.name}
                    dueDay={head.dueDay}
                    monthStart={
                      monthlyBudget.month_start
                    }
                    allocation={Number(
                      head.allocated_amount
                    )}
                    paidAmount={Number(
                      head.paid_amount
                    )}
                    remaining={
                      head.state.finalBalance
                    }
                    fromSpendingPool={
                      spendingPoolInByHead.get(
                        head.id
                      ) ?? 0
                    }
                    note={head.note ?? ""}
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

          {/* Current budget head balances summary */}
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">
                  Current Budget Head Balances
                </h2>

                <p className="mt-0.5 text-xs text-zinc-500">
                  After Paid / Used and fund moves
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
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                <span className="text-zinc-500">
                  Latest Move
                </span>

                <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-zinc-100 px-2.5 py-1.5">
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
                      No moves yet
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
            {/* Current account balance */}
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
<div className="flex items-center justify-between gap-4">
  <div>
    <div className="flex items-center gap-1.5">
      <h2 className="text-sm font-semibold">
        Current Account Balance
      </h2>

      <HelpButton
        title="Current Account Balance"
        align="inline"
      >

        <div>
          <p className="font-semibold text-[#26354d]">
            How the Balance is structured?
          </p>

        <p className="mt-1">
        The system assumes that your Fixed Expenses, Investments,
        and Savings are kept in one particular bank account, while
        your Spending Pool is kept in another bank account.
        <br />
        The Current Account Balance shown here represents the money
        remaining across your budget heads based on this budgeting
        structure.
        </p>

        </div>

                <div>
          <p className="font-semibold text-[#26354d]">
            What is Current Account Balance?
          </p>

          <p className="mt-1">
            Your Current Account Balance is the total amount
            currently remaining across all your budget heads.
            It represents the money that is still available
            after your spending, payments, and fund moves.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[#26354d]">
            Budget Head Breakdown
          </p>

          <p className="mt-1">
            The card shows each budget head that has a remaining
            balance, along with the amount remaining in that head.
            Budget heads with nothing remaining are not shown.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[#26354d]">
            Total Balance
          </p>

          <p className="mt-1">
            The Total is the sum of all the remaining balances
            shown above. It updates automatically whenever a
            budget head changes.
          </p>
        </div>
      </HelpButton>
    </div>

    <p className="mt-0.5 text-xs text-zinc-500">
      After Paid / Used and fund moves
    </p>
  </div>
</div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                {headStates
                .filter(
                    (head) => head.state.finalBalance > 0
                )
                .map((head) => (
                    <div
                    key={head.id}
                    className="flex items-baseline gap-2 whitespace-nowrap"
                    >
                    <span className="text-sm text-zinc-500">
                        {head.name}
                    </span>

                    <span className="text-sm font-semibold">
                        {formatCurrency(head.state.finalBalance)}
                    </span>
                    </div>
                ))}
            </div>

            <div className="mt-4 border-t border-zinc-100 pt-3">
                <div className="flex items-baseline gap-2">
                <span className="text-sm text-zinc-500">
                    Total
                </span>

                <span className="text-2xl font-semibold">
                    {formatCurrency(currentAccountBalance)}
                </span>
                </div>
            </div>
            </div>
        </section>
      </div>
    </main>
  );
}
