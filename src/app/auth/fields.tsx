"use client";

import type { InputHTMLAttributes } from "react";

const INPUT_CLASS =
  "w-full rounded-xl border border-[#c9ddea] bg-[#f8fcff] px-4 py-3 text-[#26354d] outline-none transition focus:border-[#4f8fbd] focus:ring-4 focus:ring-[#cfeeff] disabled:opacity-60";

export function AuthField({
  label,
  ...props
}: {
  label: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        htmlFor={props.id}
        className="mb-2 block text-sm font-medium text-[#34445e]"
      >
        {label}
      </label>
      <input className={INPUT_CLASS} {...props} />
    </div>
  );
}

export function AuthError({
  message,
}: {
  message: string;
}) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function AuthSubmit({
  loading,
  loadingLabel,
  children,
}: {
  loading: boolean;
  loadingLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-xl bg-[#4f8fbd] px-4 py-3 font-semibold text-white shadow-md shadow-[#9bbfd2]/30 transition hover:bg-[#3978a5] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? loadingLabel : children}
    </button>
  );
}

/*
 * Turn Supabase's raw auth errors into something a normal person can act
 * on. Falls back to the original message when we don't recognise it.
 */
export function friendlyAuthError(
  raw: string
): string {
  const m = raw.toLowerCase();

  if (m.includes("invalid login credentials")) {
    return "Wrong email or password.";
  }
  if (
    m.includes("token has expired") ||
    m.includes("otp_expired") ||
    m.includes("expired")
  ) {
    return "That code has expired. Request a new one.";
  }
  if (
    m.includes("invalid") &&
    m.includes("token")
  ) {
    return "That code isn't right. Check it and try again.";
  }
  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already registered")
  ) {
    return "That email already has an account. Log in instead.";
  }
  if (m.includes("password")) {
    return "Password must be at least 8 characters.";
  }
  if (
    m.includes("rate limit") ||
    m.includes("too many")
  ) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (m.includes("for security purposes")) {
    return "Please wait a few seconds before requesting another code.";
  }

  return raw;
}
