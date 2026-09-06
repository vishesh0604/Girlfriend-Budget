import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  calculateCommittedAmount,
  calculateSpendingPool,
  calculateTotalSpent,
  calculateSpendingAvailable,
  calculateSpendingRemaining,
} from "@/lib/supabase/budget/calculations";
import { initializeMonthlyBudget } from "../dashboard/actions";
import MonthNavigator from "../dashboard/MonthNavigator";
import HomeButton from "./HomeButton";
import ManageCategoriesButton from "./ManageCategoriesButton";
import AddExpenseButton from "./AddExpenseButton";
import SpendingEntryRow from "./SpendingEntryRow";
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
  let monthlyBudget: {
    id: string;
    salary: number | string | null;
  } | null = null;

  const {
    data: existingBudget,
    error: existingBudgetError,
  } = await supabase
    .from("monthly_budgets")
    .select("id, salary")
    .eq("user_id", user.id)
    .eq("month_start", monthStart)
    .maybeSingle();

  if (existingBudgetError) {
    throw new Error(
      existingBudgetError.message
    );
  }

  monthlyBudget = existingBudget;

  if (
    !monthlyBudget &&
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

    const { data: refreshed } = await supabase
      .from("monthly_budgets")
      .select("id, salary")
      .eq("user_id", user.id)
      .eq("month_start", monthStart)
      .maybeSingle();

    monthlyBudget = refreshed;
  }

  let committedAmount = 0;

  if (monthlyBudget) {
    const {
      data: monthlyHeads,
      error: monthlyHeadsError,
    } = await supabase
      .from("monthly_budget_heads")
      .select(
        "allocated_amount, budget_heads (head_type)"
      )
      .eq("user_id", user.id)
      .eq(
        "monthly_budget_id",
        monthlyBudget.id
      );

    if (monthlyHeadsError) {
      throw new Error(
        monthlyHeadsError.message
      );
    }

    committedAmount = calculateCommittedAmount(
      (monthlyHeads ?? []).map((head) => {
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

  const salary = Number(
    monthlyBudget?.salary ?? 0
  );

  const spendingPool = calculateSpendingPool(
    salary,
    committedAmount
  );

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

  const totalSpent = calculateTotalSpent(
    entries
  );

  const spendingAvailable =
    calculateSpendingAvailable(
      spendingPool,
      0
    );

  const remaining =
    calculateSpendingRemaining(
      spendingAvailable,
      totalSpent,
      0
    );

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
  const defaultDay =
    monthStart === currentMonthStart
      ? now.getDate()
      : 1;

  return (
    <main className="min-h-screen bg-[#e5f6ff] px-4 py-8 text-zinc-950">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HomeButton />
          </div>

          <div className="flex items-center gap-2">
            <ManageCategoriesButton
              categories={categoryList}
            />

            <AddExpenseButton
              categories={categoryOptions}
              monthStart={monthStart}
              daysInMonth={daysInMonth}
              defaultDay={defaultDay}
            />
          </div>
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
