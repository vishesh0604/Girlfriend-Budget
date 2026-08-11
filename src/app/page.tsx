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

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setIsLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-100 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-purple-100 bg-white/95 p-8 shadow-xl shadow-purple-100/60 backdrop-blur-sm">

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="text-purple-600"
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="2"
                />
                <path d="M16 9h5v6h-5a3 3 0 0 1 0-6Z" />
                <circle cx="16" cy="12" r="0.8" fill="currentColor" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-purple-700">
              Budget Tracker
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Sign in to manage your monthly budget.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
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
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-md shadow-purple-200 transition hover:from-purple-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>

      {/* Decorative background elements */}
      <div className="pointer-events-none fixed -right-24 -top-24 h-72 w-72 rounded-full bg-purple-200/40 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-32 -left-24 h-80 w-80 rounded-full bg-violet-200/50 blur-3xl" />
    </main>
  );
}
