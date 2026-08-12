import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import BudgetHeadForm from "./BudgetHeadForm";

export default async function CustomizeBudgetPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const {
    data: budgetHeads,
    error,
  } = await supabase
    .from("budget_heads")
    .select(
      "id, name, head_type, default_monthly_allocation, is_active"
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="min-h-screen bg-[#e5f6ff] px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">

        <div className="mb-8">
          <Link
            href="/home"
            className="mb-5 inline-flex items-center rounded-xl border border-[#f3b9cd] bg-[#ffdce9] px-4 py-2 text-sm font-medium text-[#26354d] transition hover:bg-[#ffe8f0]"
          >
            ← Home
          </Link>

          <h1 className="text-3xl font-bold tracking-tight text-[#26354d]">
            Customize Budget
          </h1>

          <p className="mt-2 text-sm text-[#647086]">
            Manage your budget heads and their default
            monthly allocations.
          </p>
        </div>

        <BudgetHeadForm />

        <div className="mt-8 space-y-4">
          {budgetHeads.length === 0 ? (
            <div className="rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-8 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-[#26354d]">
                No budget heads yet
              </h2>

              <p className="mt-2 text-sm text-[#647086]">
                Add your first budget head above.
              </p>
            </div>
          ) : (
            budgetHeads.map((head) => (
              <div
                key={head.id}
                className="rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[#26354d]">
                        {head.name}
                      </h2>

                      <span className="rounded-full bg-[#ffe8f0] px-3 py-1 text-xs font-medium text-[#c4567d]">
                        {head.head_type}
                      </span>

                      {!head.is_active && (
                        <span className="rounded-full bg-[#cfeeff] px-3 py-1 text-xs font-medium text-[#3978a5]">
                          Inactive
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-[#647086]">
                      Default monthly allocation
                    </p>

                    <p className="mt-1 text-xl font-bold text-[#26354d]">
                      ₹
                      {Number(
                        head.default_monthly_allocation
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <BudgetHeadForm
                    mode="edit"
                    budgetHead={{
                      id: head.id,
                      name: head.name,
                      headType: head.head_type,
                      allocation:
                        String(
                          head.default_monthly_allocation
                        ),
                    }}
                    isActive={head.is_active}
                  />

                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}