import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import HomeButton from "./HomeButton";

export default async function DailySpendingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#e5f6ff] px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <HomeButton />

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
            This is where you&apos;ll add expenses, see a calendar of
            your daily spending, and track how much of your spending
            pool is left. It is being built now.
          </p>
        </div>
      </div>
    </main>
  );
}
