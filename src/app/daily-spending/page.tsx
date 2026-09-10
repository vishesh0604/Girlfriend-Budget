import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/authUser";
import { getViewerNow } from "@/lib/supabase/viewer";
import { monthStartOf } from "@/lib/time";
import { initializeMonthlyBudget } from "../dashboard/actions";
import MonthNavigator from "../dashboard/MonthNavigator";
import HelpButton from "../home/HelpButton";
import HomeButton from "./HomeButton";
import SpendingToolbar from "./SpendingToolbar";
import SpendingEntryRow from "./SpendingEntryRow";
import SpendingCreditRow from "./SpendingCreditRow";
import SpendingBreakdownChart from "./SpendingBreakdownChart";
import CategoryBreakdown from "./CategoryBreakdown";
import MonthlyReportButton from "./MonthlyReportButton";
import { getSpendingSnapshot } from "./spendingSnapshot";
import {
  ensureDefaultSpendingCategories,
} from "./actions";

type DailySpendingPageProps = {
  searchParams: Promise<{
    month?: string;
    move?: string;
  }>;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
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

  const userId = await getAuthUserId(supabase);

  if (!userId) {
    redirect("/");
  }

  const params = await searchParams;

  const viewerNow = await getViewerNow(
    supabase,
    userId
  );
  const currentMonthStart =
    monthStartOf(viewerNow);

  const monthStart = isValidMonthStart(
    params.month
  )
    ? params.month
    : currentMonthStart;

  const nextMonthStart = addMonth(monthStart);

  /*
   * One round-trip of latency instead of a dozen: everything that only
   * needs the signed-in user and the month is fetched together. The
   * spending pool itself comes from the Fixed Expenses side (salary
   * minus committed) via getSpendingSnapshot.
   */
  const [
    categoriesResult,
    entryRowsResult,
    allEntryCategoryResult,
    creditRowsResult,
    moveRowsResult,
    initialSnapshot,
  ] = await Promise.all([
    supabase
      .from("spending_categories")
      .select("id, name, is_default, color")
      .eq("user_id", userId)
      .order("is_default", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("spending_entries")
      .select(
        "id, entry_date, amount, note, category_id, created_at, spending_categories (name)"
      )
      .eq("user_id", userId)
      .gte("entry_date", monthStart)
      .lt("entry_date", nextMonthStart)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("spending_entries")
      .select("category_id")
      .eq("user_id", userId),
    supabase
      .from("spending_credits")
      .select(
        "id, entry_date, amount, note, created_at"
      )
      .eq("user_id", userId)
      .gte("entry_date", monthStart)
      .lt("entry_date", nextMonthStart)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("spending_moves")
      .select(
        "id, amount, destination_kind, destination_monthly_head_id, created_at"
      )
      .eq("user_id", userId)
      .eq("month_start", monthStart)
      .order("created_at", { ascending: false }),
    getSpendingSnapshot(
      supabase,
      userId,
      monthStart
    ),
  ]);

  for (const result of [
    categoriesResult,
    entryRowsResult,
    allEntryCategoryResult,
    creditRowsResult,
    moveRowsResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  // First-ever visit: seed the starter categories, then re-read them.
  let categories = categoriesResult.data ?? [];

  if (categories.length === 0) {
    const seedResult =
      await ensureDefaultSpendingCategories();

    if (!seedResult.success) {
      throw new Error(
        seedResult.error ??
          "Unable to prepare your spending categories."
      );
    }

    const reread = await supabase
      .from("spending_categories")
      .select("id, name, is_default, color")
      .eq("user_id", userId)
      .order("is_default", { ascending: true })
      .order("name", { ascending: true });

    if (reread.error) {
      throw new Error(reread.error.message);
    }

    categories = reread.data ?? [];
  }

  // First visit to a current or future month: create its budget row,
  // then recompute the snapshot against it.
  let snapshot = initialSnapshot;

  if (
    !snapshot.monthlyBudgetId &&
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

    snapshot = await getSpendingSnapshot(
      supabase,
      userId,
      monthStart
    );
  }

  const entryRows = entryRowsResult.data ?? [];
  const allEntryCategoryRows =
    allEntryCategoryResult.data ?? [];
  const creditRows = creditRowsResult.data ?? [];
  const moveRows = moveRowsResult.data ?? [];

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
      .eq("user_id", userId)
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
      color:
        (category.color as string | null) ??
        null,
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

  const categoryColorById = new Map(
    categoryList.map((category) => [
      category.id,
      category.color,
    ])
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
        categoryColor:
          categoryColorById.get(
            row.category_id as string
          ) ?? null,
        amount: Number(row.amount),
        note: (row.note as string) ?? "",
      };
    }
  );

  const totalSpent = snapshot.totalSpent;
  const spendingAvailable = snapshot.available;
  const remaining = snapshot.remaining;

  const credits = (creditRows ?? []).map(
    (row) => ({
      id: row.id as string,
      entryDate: row.entry_date as string,
      amount: Number(row.amount),
      note: (row.note as string) ?? "",
      createdAt:
        (row.created_at as string) ?? "",
    })
  );

  // One chronological feed of expenses (debits) and credits.
  const activity = [
    ...(entryRows ?? []).map((row) => ({
      id: row.id as string,
      kind: "expense" as const,
      entryDate: row.entry_date as string,
      createdAt:
        (row.created_at as string) ?? "",
    })),
    ...credits.map((credit) => ({
      id: credit.id,
      kind: "credit" as const,
      entryDate: credit.entryDate,
      createdAt: credit.createdAt,
    })),
  ].sort((a, b) => {
    if (a.entryDate !== b.entryDate) {
      return a.entryDate < b.entryDate
        ? 1
        : -1;
    }

    return a.createdAt < b.createdAt ? 1 : -1;
  });

  const entryById = new Map(
    entries.map((entry) => [entry.id, entry])
  );

  const creditById = new Map(
    credits.map((credit) => [
      credit.id,
      credit,
    ])
  );

  // Existing "move remaining" records for this month (fetched above).
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

  const daysInMonth = new Date(
    Number(monthStart.slice(0, 4)),
    month,
    0
  ).getDate();

  // Category breakdown for the month, keyed by id so a category's
  // assigned colour follows it even if two share a name.
  const spentByCategory = new Map<
    string,
    number
  >();

  for (const entry of entries) {
    spentByCategory.set(
      entry.categoryId,
      (spentByCategory.get(
        entry.categoryId
      ) ?? 0) + entry.amount
    );
  }

  const categoryNameById = new Map(
    categoryList.map((category) => [
      category.id,
      category.name,
    ])
  );

  const breakdown = Array.from(
    spentByCategory.entries()
  )
    .map(([id, amount]) => ({
      categoryId: id,
      name:
        categoryNameById.get(id) ??
        "Uncategorised",
      amount,
      color:
        categoryColorById.get(id) ?? null,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Expenses always fall inside the month being viewed, so the
  // Add/Edit forms only pick a day of that month. Default to today
  // for the current month, otherwise the 1st.
  const todayDay =
    monthStart === currentMonthStart
      ? viewerNow.getUTCDate()
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
                    forward from last month, plus any credits
                    added this month. The Fixed Expenses page
                    keeps showing the pool without credits.
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
                    Spending Pool plus any credits, minus what you
                    have spent and anything you have moved out.
                    This is what is still available to spend this
                    month.
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
                    Add credit
                  </p>
                  <p className="mt-1">
                    Extra money to spend this month (a gift, a
                    refund). It adds to what is available without
                    changing your Spending Pool, and only affects
                    the month it is logged in. Credits show in
                    green in the Activity list.
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
                    expenses with, and give each one a colour. That
                    colour shows on the category everywhere &mdash;
                    the Activity list and the pie chart. Deleting a
                    category moves its expenses to Miscellaneous; the
                    expenses are kept.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    By category
                  </p>
                  <p className="mt-1">
                    How much you spent per category this month. Each
                    category is a button &mdash; tap it to see every
                    expense in that category with a running total.
                    If the month has any credits, a green
                    &ldquo;Credit&rdquo; button appears too, listing
                    them the same way.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    View chart
                  </p>
                  <p className="mt-1">
                    A pie of the whole spending pool &mdash; every
                    category, plus what was moved out and what is
                    left &mdash; with amounts and percentages.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Monthly report
                  </p>
                  <p className="mt-1">
                    Pick any date range and download a PDF: pool,
                    spent and remaining totals, the category pie, a
                    month-by-month table, and every transaction in
                    the range.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Activity
                  </p>
                  <p className="mt-1">
                    Every expense and credit logged this month,
                    newest first. Credits are shown in green. Each
                    one can be edited or deleted.
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
            openMoveRemaining={params.move === "1"}
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

            {snapshot.credits > 0 && (
              <p className="mt-1 text-xs font-medium text-emerald-700">
                includes{" "}
                {formatCurrency(snapshot.credits)}{" "}
                credited this month
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

        {(breakdown.length > 0 ||
          credits.length > 0) && (
          <section className="mt-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                By category
              </p>

              <div className="flex shrink-0 items-center gap-2">
                <SpendingBreakdownChart
                  categories={breakdown}
                  movedOut={snapshot.movedOut}
                  remaining={remaining}
                  pool={spendingAvailable}
                />

                <MonthlyReportButton
                  monthStart={monthStart}
                />
              </div>
            </div>

            <CategoryBreakdown
              items={breakdown}
              entries={entries}
              credits={credits}
              monthStart={monthStart}
            />
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">
            Activity
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Expenses and credits this month, newest first.
          </p>

          {activity.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-5 py-8 text-center shadow-sm">
              <p className="text-sm text-zinc-500">
                Nothing logged for this month yet. Use{" "}
                <span className="font-medium text-zinc-700">
                  + Add expense
                </span>{" "}
                or{" "}
                <span className="font-medium text-zinc-700">
                  + Add credit
                </span>{" "}
                to start.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {activity.map((item) => {
                if (item.kind === "credit") {
                  const credit = creditById.get(
                    item.id
                  );

                  if (!credit) {
                    return null;
                  }

                  return (
                    <SpendingCreditRow
                      key={`credit-${item.id}`}
                      credit={credit}
                      monthStart={monthStart}
                      daysInMonth={daysInMonth}
                    />
                  );
                }

                const entry = entryById.get(
                  item.id
                );

                if (!entry) {
                  return null;
                }

                return (
                  <SpendingEntryRow
                    key={`expense-${item.id}`}
                    entry={entry}
                    categories={categoryOptions}
                    monthStart={monthStart}
                    daysInMonth={daysInMonth}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
