"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "./auth/AuthShell";
import {
  AuthField,
  AuthError,
  AuthSubmit,
  friendlyAuthError,
} from "./auth/fields";

function LoginTransition() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-[#e5f6ff]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f3b9cd] bg-[#ffdce9] shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffe8f0] text-lg font-semibold text-[#4f8fbd]">
            ₹
          </div>

          <div className="absolute inset-0 animate-ping rounded-2xl border border-[#f3b9cd] opacity-25" />
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-[#26354d]">
          Welcome back
        </h1>

        <p className="mt-1.5 text-sm text-[#647086]">
          Opening your budget...
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] =
    useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error) {
      setError(
        friendlyAuthError(error.message)
      );
      setIsLoading(false);
      return;
    }

    setDone(true);
    router.push("/home");
    router.refresh();
  }

  return (
    <AuthShell
      title="Budget Tracker"
      subtitle="Sign in to manage your monthly budget."
    >
      <form
        onSubmit={handleLogin}
        className="space-y-5"
      >
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          required
          autoComplete="email"
          placeholder="you@example.com"
        />

        <div>
          <AuthField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />

          <div className="mt-2 flex items-center justify-between gap-3 text-xs">
            <span className="text-[#647086]">
              New here?{" "}
              <Link
                href="/auth/sign-up"
                className="font-semibold text-[#3978a5] underline underline-offset-2 hover:text-[#26354d]"
              >
                Create an account
              </Link>
            </span>

            <Link
              href="/auth/reset"
              className="shrink-0 font-medium text-[#647086] underline underline-offset-2 hover:text-[#26354d]"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <AuthError message={error} />

        <AuthSubmit
          loading={isLoading}
          loadingLabel="Signing in..."
        >
          Sign in
        </AuthSubmit>
      </form>

      {done && <LoginTransition />}
    </AuthShell>
  );
}
