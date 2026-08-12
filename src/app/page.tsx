"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setIsLoading(true);
    setError("");

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#e5f6ff] px-4">

      {/* Decorative background shapes */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#cfeeff]" />

      <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#cfeeff]" />

      <div className="pointer-events-none absolute right-16 top-1/3 h-24 w-24 rounded-full bg-[#dff2ff]" />

      <div className="pointer-events-none absolute bottom-20 left-16 h-20 w-20 rounded-full bg-[#dff2ff]" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">

        <div className="rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-8 shadow-xl shadow-[#9bbfd2]/30">

          {/* Header */}
          <div className="mb-8 text-center">

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ffe8f0]">

              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4f8fbd"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="2"
                />

                <path d="M16 9h5v6h-5a3 3 0 0 1 0-6Z" />

                <circle
                  cx="16"
                  cy="12"
                  r="0.8"
                  fill="#4f8fbd"
                />
              </svg>

            </div>

            <h1 className="text-3xl font-bold tracking-tight text-[#26354d]">
              Budget Tracker
            </h1>

            <p className="mt-2 text-sm text-[#647086]">
              Sign in to manage your monthly budget.
            </p>

          </div>

          {/* Login Form */}
          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[#34445e]"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#c9ddea] bg-[#f8fcff] px-4 py-3 text-[#26354d] outline-none transition focus:border-[#4f8fbd] focus:ring-4 focus:ring-[#cfeeff]"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[#34445e]"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#c9ddea] bg-[#f8fcff] px-4 py-3 text-[#26354d] outline-none transition focus:border-[#4f8fbd] focus:ring-4 focus:ring-[#cfeeff]"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Sign In */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#4f8fbd] px-4 py-3 font-semibold text-white shadow-md shadow-[#9bbfd2]/30 transition hover:bg-[#3978a5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading
                ? "Signing in..."
                : "Sign in"}
            </button>

          </form>
        </div>
      </div>
    </main>
  );
}