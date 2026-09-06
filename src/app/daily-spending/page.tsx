import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import HomeButton from "./HomeButton";
import ManageCategoriesButton from "./ManageCategoriesButton";
import { ensureDefaultSpendingCategories } from "./actions";

type SpendingCategoryRow = {
  id: string;
  name: string;
  is_default: boolean;
};

export default async function DailySpendingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const seedResult =
    await ensureDefaultSpendingCategories();

  if (!seedResult.success) {
    throw new Error(
      seedResult.error ??
        "Unable to prepare your spending categories."
    );
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
    data: entryCategoryRows,
    error: entryCategoryError,
  } = await supabase
    .from("spending_entries")
    .select("category_id")
    .eq("user_id", user.id);

  if (entryCategoryError) {
    throw new Error(entryCategoryError.message);
  }

  const entryCountByCategory = new Map<
    string,
    number
  >();

  for (const row of entryCategoryRows ?? []) {
    entryCountByCategory.set(
      row.category_id,
      (entryCountByCategory.get(
        row.category_id
      ) ?? 0) + 1
    );
  }

  const categoryList = (
    (categories ?? []) as SpendingCategoryRow[]
  ).map((category) => ({
    id: category.id,
    name: category.name,
    isDefault: category.is_default,
    entryCount:
      entryCountByCategory.get(category.id) ?? 0,
  }));

  return (
    <main className="min-h-screen bg-[#e5f6ff] px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <HomeButton />

          <ManageCategoriesButton
            categories={categoryList}
          />
        </div>

        <div className="mt-4">
          <h1 className="text-3xl font-bold tracking-tight text-[#26354d]">
            Daily Spending Tracker
          </h1>

          <p className="mt-2 text-sm text-[#647086]">
            Log your day-to-day spending against the month&apos;s
            spending pool.
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-[#26354d]">
            Coming soon
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#647086]">
            Adding expenses, the daily calendar and the spending-pool
            summary are being built. Your categories are ready — use
            Manage categories to set them up.
          </p>
        </div>
      </div>
    </main>
  );
}
