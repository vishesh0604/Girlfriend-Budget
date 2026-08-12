import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";


export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#e5f6ff] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center justify-center">
        <div className="w-full">
            <div className="mb-8 text-center">
            <p className="mb-2 text-sm font-medium tracking-wide text-[#647086]">
            Built by Vishesh, for Tanishka 💙 
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-[#26354d]">
                Budget Tracker
            </h1>
            <p className="mt-2 text-[#647086]">
              What would you like to do?
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Link
              href="/dashboard"
              className="group rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
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
                Dashboard
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#647086]">
                View your monthly budget, spending pool,
                daily budget, and budget heads.
              </p>

              <div className="mt-6 font-medium text-[#3978a5]">
                Open Dashboard →
              </div>
            </Link>

            <Link
              href="/customize-budget"
              className="group rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
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

              <div className="mt-6 font-medium text-[#c4567d]">
                Customize Budget →
              </div>
            </Link>
          </div>

          <div className="mt-8 text-center">
            <LogoutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
