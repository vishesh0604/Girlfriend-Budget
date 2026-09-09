import HomeButton from "./HomeButton";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/authUser";
import BudgetHeadForm from "./BudgetHeadForm";
import ReorderHeadsButton from "./ReorderHeadsButton";
import HelpButton from "../home/HelpButton";

export default async function CustomizeBudgetPage() {
  const supabase = await createClient();

  const userId = await getAuthUserId(supabase);

  if (!userId) {
    redirect("/");
  }

  const {
    data: budgetHeads,
    error,
  } = await supabase
    .from("budget_heads")
    .select(
      "id, name, head_type, default_monthly_allocation, is_active, due_day, sort_order"
    )
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HomeButton />

              <HelpButton
                title="Customize Budget"
                align="inline"
              >
              <div>
                <p className="font-semibold text-[#26354d]">
                  Manage Your Budget Heads
                </p>

                <p className="mt-1">
                  Customize Budget is where you set up and
                  manage the budget heads used throughout
                  your monthly budget.
                </p>
              </div>

              <div>
                <p className="font-semibold text-[#26354d]">
                  Add Budget Heads
                </p>

                <p className="mt-1">
                  Create a new budget head by giving it a
                  name, selecting its type, and setting its
                  default monthly allocation.
                </p>
              </div>

              <div>
                <p className="font-semibold text-[#26354d]">
                  Edit Budget Heads
                </p>

                <p className="mt-1">
                  You can change a budget head&apos;s name,
                  type, and default monthly allocation
                  whenever needed.
                </p>
              </div>

              <div>
                <p className="font-semibold text-[#26354d]">
                  Bill due day
                </p>

                <p className="mt-1">
                  Optionally set the day of the month a
                  head&apos;s bill is due. As that day
                  approaches, the Fixed Expenses card shows
                  a reminder next to the head&apos;s name
                  (e.g. &ldquo;due in 3 days&rdquo;).
                </p>
              </div>

              <div>
                <p className="font-semibold text-[#26354d]">
                  Reorder heads
                </p>

                <p className="mt-1">
                  The button at the top opens a list you can
                  drag to reorder. The order you set is the
                  order the heads appear on the Fixed
                  Expenses page.
                </p>
              </div>

              <div>
                <p className="font-semibold text-[#26354d]">
                  Deactivate Budget Heads
                </p>

                <p className="mt-1">
                  Deactivating a budget head removes it from
                  newly created monthly budgets while
                  preserving its existing history.
                </p>
              </div>

              <div>
                <p className="font-semibold text-[#26354d]">
                  Future vs. Historical Months
                </p>

                <p className="mt-1">
                  Changes to your budget configuration apply
                  to future monthly budgets. Existing
                  historical monthly records are kept
                  unchanged.
                </p>
              </div>
            </HelpButton>
            </div>

            <ReorderHeadsButton
              heads={budgetHeads.map((head) => ({
                id: head.id,
                name: head.name,
              }))}
            />
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#26354d]">
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

                    {head.due_day && (
                      <p className="mt-2 text-xs font-medium text-[#c4567d]">
                        Bill due on the{" "}
                        {head.due_day}
                        {head.due_day === 1 ||
                        head.due_day === 21 ||
                        head.due_day === 31
                          ? "st"
                          : head.due_day === 2 ||
                            head.due_day === 22
                          ? "nd"
                          : head.due_day === 3 ||
                            head.due_day === 23
                          ? "rd"
                          : "th"}
                      </p>
                    )}
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
                      dueDay: head.due_day
                        ? String(head.due_day)
                        : "",
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