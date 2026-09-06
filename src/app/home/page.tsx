import PageTransition from "@/components/PageTransition";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";
import HelpButton from "./HelpButton";
import DeveloperLogsButton from "./DeveloperLogsButton";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#e5f6ff] px-4 py-8">
      {/* Decorative background shapes */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#cfeeff]" />

      <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#cfeeff]" />

      <div className="pointer-events-none absolute right-16 top-1/3 h-24 w-24 rounded-full bg-[#dff2ff]" />

      <div className="pointer-events-none absolute bottom-20 left-16 h-20 w-20 rounded-full bg-[#dff2ff]" />

      {/* Developer Logs */}
      <div className="absolute left-4 top-4 z-20">
        <DeveloperLogsButton />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center justify-center">
        <div className="w-full">
          <div className="mb-2 text-center">
            <p className="mb-2 text-sm font-medium tracking-wide text-[#647086]">
              Built by Vishesh, for Tanishka 💙
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-[#26354d]">
              Budget Tracker
            </h1>

            <p className="mt-2 text-[#647086]">
              What would you like to do?
            </p>

            <div className="mt-2">
              <HelpButton title="How Budget Tracker works">
                <div>
                  <h3 className="font-semibold text-[#26354d]">
                    Fixed Expenses
                  </h3>

                  <p className="mt-1">
                    Your monthly budget overview for fixed, committed
                    money. Open it to see your salary, committed
                    expenses, spending pool, daily budget, and all your
                    budget heads with their allocations, payments, fund
                    moves, and remaining balances.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-[#26354d]">
                    Daily Spending Tracker
                  </h3>

                  <p className="mt-1">
                    Log your day-to-day spending against the month&apos;s
                    spending pool. Add each expense with a category, note
                    and date, and see how much is left and how much you
                    can spend per day.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-[#26354d]">
                    Customize Budget
                  </h3>

                  <p className="mt-1">
                    Set up and manage your budget heads. You can add,
                    edit, rename, allocate, and manage the budget
                    categories used throughout your monthly budget.
                  </p>
                </div>
              </HelpButton>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <PageTransition
              href="/dashboard"
              type="dashboard"
              className="group flex flex-col rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffe8f0] text-[#4f8fbd]">
                <svg
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                  />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              </div>

              <h2 className="text-xl font-semibold text-[#26354d]">
                Fixed Expenses
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#647086]">
                Salary, committed heads, spending pool and
                daily budget for the month.
              </p>

              <div className="mt-auto pt-6 font-medium text-[#3978a5]">
                Open Fixed Expenses →
              </div>
            </PageTransition>

            <PageTransition
              href="/daily-spending"
              type="dailySpending"
              className="group flex flex-col rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffe8f0] text-[#4f8fbd]">
                <svg
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="17"
                    rx="2"
                  />
                  <path d="M3 10h18" />
                  <path d="M8 2v4" />
                  <path d="M16 2v4" />
                </svg>
              </div>

              <h2 className="text-xl font-semibold text-[#26354d]">
                Daily Spending Tracker
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#647086]">
                Log day-to-day expenses against your
                spending pool.
              </p>

              <div className="mt-auto pt-6 font-medium text-[#3978a5]">
                Open Daily Spending →
              </div>
            </PageTransition>

            <PageTransition
              href="/customize-budget"
              type="customize"
              className="group flex flex-col rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffe8f0] text-[#d96b91]">
                <svg
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v18" />
                  <path d="M3 12h18" />
                  <path d="M5 5l14 14" />
                  <path d="M19 5L5 19" />
                </svg>
              </div>

              <h2 className="text-xl font-semibold text-[#26354d]">
                Customize Budget
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#647086]">
                Add, edit, rename, allocate, and manage
                your budget heads.
              </p>

              <div className="mt-auto pt-6 font-medium text-[#c4567d]">
                Open Customize Budget →
              </div>
            </PageTransition>
          </div>

          <div className="mt-8 text-center">
            <LogoutButton />
          </div>
        </div>
      </div>
    </main>
  );
}