"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "../AuthShell";
import {
  AuthField,
  AuthError,
  AuthSubmit,
  friendlyAuthError,
} from "../fields";

type Step = "details" | "code";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] =
    useState<Step>("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleDetails(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }

    setLoading(true);

    const { data, error } =
      await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

    setLoading(false);

    if (error) {
      setError(
        friendlyAuthError(error.message)
      );
      return;
    }

    // Supabase returns a user with an empty identities array when the
    // email is already registered (it won't say so, to avoid leaking).
    if (
      data.user &&
      data.user.identities &&
      data.user.identities.length === 0
    ) {
      setError(
        "That email already has an account. Log in instead."
      );
      return;
    }

    setNotice(
      `We sent a 6-digit code to ${email.trim()}.`
    );
    setStep("code");
  }

  async function handleCode(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } =
      await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "signup",
      });

    if (error) {
      setLoading(false);
      setError(
        friendlyAuthError(error.message)
      );
      return;
    }

    router.push("/home");
    router.refresh();
  }

  async function resend() {
    setError("");
    setNotice("");
    setLoading(true);

    const { error } =
      await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });

    setLoading(false);
    if (error) {
      setError(
        friendlyAuthError(error.message)
      );
      return;
    }
    setNotice("New code sent.");
  }

  if (step === "code") {
    return (
      <AuthShell
        title="Check your email"
        subtitle={
          notice ||
          `Enter the 6-digit code sent to ${email.trim()}.`
        }
        footer={
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setError("");
              setCode("");
            }}
            className="font-medium text-[#647086] underline underline-offset-2 hover:text-[#26354d]"
          >
            Use a different email
          </button>
        }
      >
        <form
          onSubmit={handleCode}
          className="space-y-5"
        >
          <AuthField
            id="code"
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value.replace(
                  /\D/g,
                  ""
                )
              )
            }
            maxLength={6}
            required
            placeholder="123456"
          />

          <AuthError message={error} />

          <AuthSubmit
            loading={loading}
            loadingLabel="Verifying..."
          >
            Verify &amp; continue
          </AuthSubmit>

          <button
            type="button"
            onClick={resend}
            disabled={loading}
            className="w-full text-center text-xs font-medium text-[#647086] underline underline-offset-2 hover:text-[#26354d] disabled:opacity-50"
          >
            Resend code
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Track your monthly budget and daily spending."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/"
            className="font-semibold text-[#3978a5] underline underline-offset-2 hover:text-[#26354d]"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleDetails}
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

        <AuthField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />

        <AuthField
          id="confirm"
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={(e) =>
            setConfirm(e.target.value)
          }
          required
          autoComplete="new-password"
          placeholder="••••••••"
        />

        <AuthError message={error} />

        <AuthSubmit
          loading={loading}
          loadingLabel="Creating account..."
        >
          Create account
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}
