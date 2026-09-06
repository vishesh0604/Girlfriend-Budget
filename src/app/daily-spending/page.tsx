import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { initializeMonthlyBudget } from "../dashboard/actions";
import MonthNavigator from "../dashboard/MonthNavigator";
import HelpButton from "../home/HelpButton";
import HomeButton from "./HomeButton";
import SpendingToolbar from "./SpendingToolbar";
import SpendingEntryRow from "./SpendingEntryRow";
import { getSpendingSnapshot } from "./spendingSnapshot";
import {
  ensureDefaultSpendingCategories,
} from "./actions";

type DailySpendingPageProps = {
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
): value is string {
  return (
    !!value && /^\d{4}-\d{2}-01$/.test(value)
  );
}

function addMonth(monthStart: string) {
  const [year, month] = monthStart
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1 + 1, 1)
  );

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}-01`;
}

export default async function DailySpendingPage({
  searchParams,
}: DailySpendingPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const params = await searchParams;

  const currentMonthStart =
    getCurrentMonthStart();

  const monthStart = isValidMonthStart(
    params.month
  )
    ? params.month
    : currentMonthStart;

  const nextMonthStart = addMonth(monthStart);

  const seedResult =
    await ensureDefaultSpendingCategories();

  if (!seedResult.success) {
    throw new Error(
      seedResult.error ??
        "Unable to prepare your spending categories."
    );
  }

  /*
   * The spending pool comes from the Fixed Expenses side
   * (salary minus committed). Make sure the month exists for
   * the current or a future month; leave past months alone.
   */
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
    throw new Error(
      existingBudgetError.message
    );
  }

  if (
    !existingBudget &&
    monthStart >= currentMonthStart
  ) {
    const initResult =
      await initializeMonthlyBudget(monthStart);

    if (!initResult.success) {
      throw new Error(
        initResult.error ??
          "Unable to prepare this month."
      );
    }
  }

  const snapshot = await getSpendingSnapshot(
    supabase,
    user.id,
    monthStart
  );

  // Active fixed-expense heads for this month, as targets for
  // "move remaining".
  let fixedHeads: Array<{
    id: string;
    name: string;
  }> = [];

  if (snapshot.monthlyBudgetId) {
    const {
      data: fixedHeadRows,
      error: fixedHeadRowsError,
    } = await supabase
      .from("monthly_budget_heads")
      .select(
        "id, budget_heads (name, is_active)"
      )
      .eq("user_id", user.id)
      .eq(
        "monthly_budget_id",
        snapshot.monthlyBudgetId
      );

    if (fixedHeadRowsError) {
      throw new Error(
        fixedHeadRowsError.message
      );
    }

    fixedHeads = (fixedHeadRows ?? [])
      .map((row) => {
        const budgetHead = Array.isArray(
          row.budget_heads
        )
          ? row.budget_heads[0]
          : row.budget_heads;

        return {
          id: row.id as string,
          name:
            (budgetHead?.name as string) ??
            "Budget head",
          isActive:
            budgetHead?.is_active !== false,
        };
      })
      .filter((head) => head.isActive)
      .map((head) => ({
        id: head.id,
        name: head.name,
      }));
  }

  const {
    data: categories,
    error: categoriesError,
  } = await supabase
    .from("spending_categories")
    .select("id, name, is_default")
    .eq("user_id", user.id)
    .order("is_default", { ascending: true })
    .order("name", { ascending: true });

  if (categoriesError) {
    throw new Error(categoriesError.message);
  }

  const {
    data: entryRows,
    error: entryRowsError,
  } = await supabase
    .from("spending_entries")
    .select(
      "id, entry_date, amount, note, category_id, spending_categories (name)"
    )
    .eq("user_id", user.id)
    .gte("entry_date", monthStart)
    .lt("entry_date", nextMonthStart)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (entryRowsError) {
    throw new Error(entryRowsError.message);
  }

  const {
    data: allEntryCategoryRows,
    error: allEntryCategoryError,
  } = await supabase
    .from("spending_entries")
    .select("category_id")
    .eq("user_id", user.id);

  if (allEntryCategoryError) {
    throw new Error(
      allEntryCategoryError.message
    );
  }

  const entryCountByCategory = new Map<
    string,
    number
  >();

  for (const row of allEntryCategoryRows ??
    []) {
    entryCountByCategory.set(
      row.category_id,
      (entryCountByCategory.get(
        row.category_id
      ) ?? 0) + 1
    );
  }

  const categoryList = (categories ?? []).map(
    (category) => ({
      id: category.id as string,
      name: category.name as string,
      isDefault:
        category.is_default as boolean,
      entryCount:
        entryCountByCategory.get(
          category.id as string
        ) ?? 0,
    })
  );

  const categoryOptions = categoryList.map(
    (category) => ({
      id: category.id,
      name: category.name,
    })
  );

  const entries = (entryRows ?? []).map(
    (row) => {
      const category = Array.isArray(
        row.spending_categories
      )
        ? row.spending_categories[0]
        : row.spending_categories;

      return {
        id: row.id as string,
        entryDate: row.entry_date as string,
        categoryId:
          row.category_id as string,
        categoryName:
          (category?.name as string) ??
          "Uncategorised",
        amount: Number(row.amount),
        note: (row.note as string) ?? "",
      };
    }
  );

  const totalSpent = snapshot.totalSpent;
  const spendingAvailable = snapshot.spendingPool;
  const remaining = snapshot.remaining;

  // Existing "move remaining" records for this month.
  const {
    data: moveRows,
    error: moveRowsError,
  } = await supabase
    .from("spending_moves")
    .select(
      "id, amount, destination_kind, destination_monthly_head_id, created_at"
    )
    .eq("user_id", user.id)
    .eq("month_start", monthStart)
    .order("created_at", { ascending: false });

  if (moveRowsError) {
    throw new Error(moveRowsError.message);
  }

  const fixedHeadNameById = new Map(
    fixedHeads.map((head) => [
      head.id,
      head.name,
    ])
  );

  const moves = (moveRows ?? []).map((row) => ({
    id: row.id as string,
    amount: Number(row.amount),
    label:
      row.destination_kind === "next_month"
        ? "next month's pool"
        : fixedHeadNameById.get(
            row.destination_monthly_head_id as string
          ) ?? "a budget head",
  }));

  const [, month] = monthStart
    .split("-")
    .map(Number);

  const now = new Date();

  const daysInMonth = new Date(
    Number(monthStart.slice(0, 4)),
    month,
    0
  ).getDate();

  // Category breakdown for the month.
  const spentByCategory = new Map<
    string,
    number
  >();

  for (const entry of entries) {
    spentByCategory.set(
      entry.categoryName,
      (spentByCategory.get(
        entry.categoryName
      ) ?? 0) + entry.amount
    );
  }

  const breakdown = Array.from(
    spentByCategory.entries()
  )
    .map(([name, amount]) => ({
      name,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Expenses always fall inside the month being viewed, so the
  // Add/Edit forms only pick a day of that month. Default to today
  // for the current month, otherwise the 1st.
  const todayDay =
    monthStart === currentMonthStart
      ? now.getDate()
      : null;

  const defaultDay = todayDay ?? 1;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#e5f6ff] px-5 py-8 text-zinc-950 sm:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HomeButton />

            <HelpButton
              title="Daily Spending Tracker"
              align="center"
            >
              <div className="space-y-5">
                <div>
                  <p className="font-semibold text-[#26354d]">
                    What this page is for
                  </p>
                  <p className="mt-1">
                    A running log of your day-to-day spending
                    for the month, drawn from your Spending Pool.
                    It is separate from Fixed Expenses and never
                    changes your allocations.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Month Navigator
                  </p>
                  <p className="mt-1">
                    Use the month and year selectors to move
                    between your current, previous, and future
                    months. The page updates to show the selected
                    month.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Spending Pool
                  </p>
                  <p className="mt-1">
                    Your salary minus your committed allocations
                    (from Fixed Expenses), plus anything carried
                    forward from last month.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Spent
                  </p>
                  <p className="mt-1">
                    The total of every expense you have logged in
                    the selected month.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Remaining
                  </p>
                  <p className="mt-1">
                    Spending Pool minus what you have spent minus
                    anything you have moved out. This is what is
                    still available to spend this month.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Add expense
                  </p>
                  <p className="mt-1">
                    Log a single expense with a day, a category,
                    an amount and an optional note.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Month overview
                  </p>
                  <p className="mt-1">
                    A calendar of the month showing what you spent
                    on each day. Tap a day to see or add its
                    expenses.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Move remaining
                  </p>
                  <p className="mt-1">
                    Send leftover Spending Pool money to next
                    month&apos;s pool and/or into any Fixed
                    Expenses budget head. You can split it and
                    undo any move. A move into a Fixed head lifts
                    that head&apos;s balance without changing its
                    allocation.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Manage categories
                  </p>
                  <p className="mt-1">
                    Add, rename or delete the categories you tag
                    expenses with. Deleting one moves its expenses
                    to Miscellaneous; the expenses are kept.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    By category
                  </p>
                  <p className="mt-1">
                    A breakdown of how much you spent per category
                    this month.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Expenses
                  </p>
                  <p className="mt-1">
                    Every expense logged this month, newest first.
                    Each one can be edited or deleted.
                  </p>
                </div>
              </div>
            </HelpButton>
          </div>

          <SpendingToolbar
            monthStart={monthStart}
            daysInMonth={daysInMonth}
            defaultDay={defaultDay}
            todayDay={todayDay}
            remaining={remaining}
            categoryOptions={categoryOptions}
            categoryList={categoryList}
            entries={entries}
            fixedHeads={fixedHeads}
            moves={moves}
          />
        </div>

        <MonthNavigator
          monthStart={monthStart}
          basePath="/daily-spending"
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">
              Spending Pool
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(spendingAvailable)}
            </p>

            {snapshot.carriedIn > 0 && (
              <p className="mt-1 text-xs text-zinc-500">
                includes{" "}
                {formatCurrency(
                  snapshot.carriedIn
                )}{" "}
                carried from last month
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">
              Spent
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalSpent)}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">
              Remaining
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(remaining)}
            </p>

            {snapshot.movedOut > 0 && (
              <p className="mt-1 text-xs text-zinc-500">
                {formatCurrency(
                  snapshot.movedOut
                )}{" "}
                moved out
              </p>
            )}
          </div>
        </section>

        {breakdown.length > 0 && (
          <section className="mt-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-sm font-semibold">
              By category
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              {breakdown.map((item) => (
                <div
                  key={item.name}
                  className="flex items-baseline gap-2 whitespace-nowrap"
                >
                  <span className="text-sm text-zinc-500">
                    {item.name}
                  </span>

                  <span className="text-sm font-semibold">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">
            Expenses
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Everything logged this month, newest first.
          </p>

          {entries.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-5 py-8 text-center shadow-sm">
              <p className="text-sm text-zinc-500">
                No expenses logged for this month yet.
                Use{" "}
                <span className="font-medium text-zinc-700">
                  + Add expense
                </span>{" "}
                to start.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {entries.map((entry) => (
                <SpendingEntryRow
                  key={entry.id}
                  entry={entry}
                  categories={categoryOptions}
                  monthStart={monthStart}
                  daysInMonth={daysInMonth}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
