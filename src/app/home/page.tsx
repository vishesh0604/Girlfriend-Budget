import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/authUser";
import { getSpendingSnapshot } from "../daily-spending/spendingSnapshot";
import LogoutButton from "./LogoutButton";
import HelpButton from "./HelpButton";
import DeveloperLogsButton from "./DeveloperLogsButton";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default async function HomePage() {
  const supabase = await createClient();

  const userId = await getAuthUserId(supabase);

  if (!userId) {
    redirect("/");
  }

  // End-of-month nudge: from the 28th (26th in February), show what's
  // still unspent in this month's pool. Recomputed on every visit.
  const now = new Date();
  const nudgeThreshold =
    now.getMonth() === 1 ? 26 : 28;
  let poolNudge: {
    remaining: number;
    monthName: string;
  } | null = null;

  if (now.getDate() >= nudgeThreshold) {
    const monthStart = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-01`;

    const snapshot = await getSpendingSnapshot(
      supabase,
      userId,
      monthStart
    );

    poolNudge = {
      remaining: snapshot.remaining,
      monthName:
        MONTH_NAMES[now.getMonth()],
    };
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
              Welcome to Budget Tracker
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
                    edit, rename, allocate, reorder, and set a bill due
                    day for each. You can also deactivate the ones you
                    no longer use.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-[#26354d]">
                    Month-end reminder
                  </h3>

                  <p className="mt-1">
                    From the 28th (26th in February), a small note
                    appears below Log out showing what&apos;s still
                    unspent in this month&apos;s Spending Pool, with a
                    link to move it before the month ends. It updates
                    every time you open this page.
                  </p>
                </div>
              </HelpButton>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Link
              href="/dashboard"
              prefetch
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
            </Link>

            <Link
              href="/daily-spending"
              prefetch
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
            </Link>

            <Link
              href="/customize-budget"
              prefetch
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
            </Link>
          </div>

          <div className="mt-8 text-center">
            <LogoutButton />

            {poolNudge && (
              <p className="mx-auto mt-4 max-w-md text-xs leading-5 text-[#647086]">
                <span className="mr-1 font-semibold text-[#4f8fbd]">
                  &#9432;
                </span>
                {poolNudge.remaining > 0 ? (
                  <>
                    ₹
                    {Math.round(
                      poolNudge.remaining
                    ).toLocaleString("en-IN")}{" "}
                    is still unspent in{" "}
                    {poolNudge.monthName}
                    &apos;s spending pool.{" "}
                    <Link
                      href="/daily-spending?move=1"
                      className="underline underline-offset-2 hover:text-[#26354d]"
                    >
                      Move it before the month
                      ends
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    {poolNudge.monthName}&apos;s
                    spending pool is fully used.
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}