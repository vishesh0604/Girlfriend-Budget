import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/authUser";
import { nowInIST } from "@/lib/time";
import { getHomeSummary } from "./homeSummary";
import LogoutButton from "./LogoutButton";
import HelpButton from "./HelpButton";
import DeveloperLogsButton from "./DeveloperLogsButton";
import SettingsButton from "../settings/SettingsButton";

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

  const summary = await getHomeSummary(
    supabase,
    userId
  );

  // End-of-month nudge: from the 28th (26th in February), show what's
  // still unspent in this month's pool. Recomputed on every visit.
  const now = nowInIST();
  const nudgeThreshold =
    now.getUTCMonth() === 1 ? 26 : 28;
  const poolNudge =
    now.getUTCDate() >= nudgeThreshold
      ? {
          remaining: summary.poolRemaining,
          monthName:
            MONTH_NAMES[now.getUTCMonth()],
        }
      : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#e5f6ff] px-4 py-8">
      {/* Decorative background shapes */}
      <div className="bg-blob bg-blob-a pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#cfeeff]" />

      <div className="bg-blob bg-blob-b pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#cfeeff]" />

      <div className="bg-blob bg-blob-c pointer-events-none absolute right-16 top-1/3 h-24 w-24 rounded-full bg-[#dff2ff]" />

      <div className="bg-blob bg-blob-d pointer-events-none absolute bottom-20 left-16 h-20 w-20 rounded-full bg-[#dff2ff]" />

      {/* Developer Logs */}
      <div className="absolute left-4 top-4 z-20">
        <DeveloperLogsButton />
      </div>

      {/* Settings */}
      <div className="absolute right-4 top-4 z-20">
        <SettingsButton />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center justify-center">
        <div className="w-full">
          <div className="mb-2 text-center">
            <p className="mb-2 text-sm font-medium tracking-wide text-[#647086]">
              Built by Vishesh, for Tanishka 💙
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-[#26354d]">
              Welcome to Her Penny
            </h1>

          <p className="mt-2 text-[#647086]">
              Your personal budget tracker, what would you like to do?
            </p>

            <div className="mt-2">
              <HelpButton title="How Her Penny works">
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
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffe8f0] text-[#4f8fbd]">
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

                {summary.hasBudget &&
                  (summary.nextBill ? (
                    <span
                      className={`inline-flex min-w-0 items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] ${
                        summary.nextBill.urgency ===
                        "overdue"
                          ? "bg-[#fdecec] text-[#c0392b]"
                          : summary.nextBill
                              .urgency === "soon"
                          ? "bg-[#fff1d6] text-[#9a6b00]"
                          : "bg-[#ffe8f0] text-[#c4567d]"
                      }`}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="shrink-0"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                        />
                        <path d="M12 7v5l3 2" />
                      </svg>
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate font-semibold">
                          {summary.nextBill.name}
                        </span>
                        <span className="truncate font-medium opacity-80">
                          {summary.nextBill.label
                            .charAt(0)
                            .toUpperCase() +
                            summary.nextBill.label.slice(
                              1
                            )}
                        </span>
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-xl bg-[#e7f6ec] px-2.5 py-1 text-[11px] text-[#2f7d4f]">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="shrink-0"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate font-semibold">
                          Bills
                        </span>
                        <span className="truncate font-medium opacity-80">
                          Nothing due
                        </span>
                      </span>
                    </span>
                  ))}
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
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffe8f0] text-[#4f8fbd]">
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

                {summary.hasBudget && (
                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-xl bg-[#e8f1fb] px-2.5 py-1 text-[11px] text-[#3978a5]">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="shrink-0"
                    >
                      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v2" />
                      <path d="M3 7v10a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-3" />
                      <path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z" />
                    </svg>
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate font-semibold">
                        ₹
                        {Math.round(
                          summary.poolRemaining
                        ).toLocaleString("en-IN")}{" "}
                        left
                      </span>
                      <span className="truncate font-medium opacity-80">
                        ₹
                        {Math.round(
                          summary.perDayLeft
                        ).toLocaleString("en-IN")}
                        /day
                      </span>
                    </span>
                  </span>
                )}
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
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffe8f0] text-[#4f8fbd]">
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

                {summary.hasBudget && (
                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-xl bg-[#e8f1fb] px-2.5 py-1 text-[11px] text-[#3978a5]">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="shrink-0"
                    >
                      <path d="M12 2 3 7l9 5 9-5-9-5Z" />
                      <path d="m3 12 9 5 9-5" />
                      <path d="m3 17 9 5 9-5" />
                    </svg>
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate font-semibold">
                        {summary.headCount}{" "}
                        {summary.headCount === 1
                          ? "head"
                          : "heads"}
                      </span>
                      <span className="truncate font-medium opacity-80">
                        ₹
                        {Math.round(
                          summary.monthlyCommitted
                        ).toLocaleString("en-IN")}
                        /mo committed
                      </span>
                    </span>
                  </span>
                )}
              </div>

              <h2 className="text-xl font-semibold text-[#26354d]">
                Customize Budget
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#647086]">
                Add, edit, rename, allocate, and manage
                your budget heads.
              </p>

              <div className="mt-auto pt-6 font-medium text-[#3978a5]">
                Open Customize Budget →
              </div>
            </Link>
          </div>

          <div className="relative mt-8 text-center">
            <LogoutButton />

            {poolNudge && (
              <div className="absolute inset-x-0 top-full mt-4 flex justify-center">
                <div className="inline-flex max-w-full items-center gap-2 overflow-x-auto whitespace-nowrap rounded-full border border-[#bfe3f5] bg-[#eaf6fe] px-4 py-2 text-xs text-[#3d5573] shadow-sm">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4f8fbd"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>

                  {poolNudge.remaining > 0 ? (
                    <span>
                      <span className="font-semibold text-[#26354d]">
                        ₹
                        {Math.round(
                          poolNudge.remaining
                        ).toLocaleString("en-IN")}
                      </span>{" "}
                      is still unspent in{" "}
                      {poolNudge.monthName}
                      &apos;s spending pool.{" "}
                      <Link
                        href="/daily-spending?move=1"
                        className="font-medium text-[#3978a5] underline underline-offset-2 hover:text-[#26354d]"
                      >
                        Move it before the month ends
                      </Link>
                    </span>
                  ) : (
                    <span>
                      {poolNudge.monthName}&apos;s
                      spending pool is fully used.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}