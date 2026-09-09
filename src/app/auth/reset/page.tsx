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

type Step = "email" | "reset";

export default function ResetPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] =
    useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleEmail(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } =
      await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });

    setLoading(false);

    if (error) {
      setError(
        friendlyAuthError(error.message)
      );
      return;
    }

    setStep("reset");
  }

  async function handleReset(
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

    const { error: otpError } =
      await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });

    if (otpError) {
      setLoading(false);
      setError(
        friendlyAuthError(otpError.message)
      );
      return;
    }

    const { error: updateError } =
      await supabase.auth.updateUser({
        password,
      });

    if (updateError) {
      setLoading(false);
      setError(
        friendlyAuthError(updateError.message)
      );
      return;
    }

    router.push("/home");
    router.refresh();
  }

  if (step === "reset") {
    return (
      <AuthShell
        title="Set a new password"
        subtitle={`Enter the 6-digit code sent to ${email.trim()} and choose a new password.`}
        footer={
          <button
            type="button"
            onClick={() => {
              setStep("email");
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
          onSubmit={handleReset}
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

          <AuthField
            id="password"
            label="New password"
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
            label="Confirm new password"
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
            loadingLabel="Updating..."
          >
            Update password
          </AuthSubmit>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a 6-digit code to confirm it's you."
      footer={
        <Link
          href="/"
          className="font-semibold text-[#3978a5] underline underline-offset-2 hover:text-[#26354d]"
        >
          Back to sign in
        </Link>
      }
    >
      <form
        onSubmit={handleEmail}
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

        <AuthError message={error} />

        <AuthSubmit
          loading={loading}
          loadingLabel="Sending code..."
        >
          Send code
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}
