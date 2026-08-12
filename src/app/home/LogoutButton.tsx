"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LogoutOverlay() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-[#e5f6ff]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f3b9cd] bg-[#ffdce9] shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffe8f0] text-lg font-semibold text-[#d96b91]">
            →
          </div>

          <div className="absolute inset-0 animate-ping rounded-2xl border border-[#f3b9cd] opacity-25" />
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-[#26354d]">
          See you soon
        </h1>

        <p className="mt-1.5 text-sm text-[#647086]">
          Signing you out securely...
        </p>

        <div className="mt-5 flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#26354d]"
            style={{
              animationDelay: "-0.2s",
            }}
          />

          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#26354d]"
            style={{
              animationDelay: "-0.1s",
            }}
          />

          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#26354d]" />
        </div>
      </div>
    </div>
  );
}

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] =
    useState(false);

  async function handleLogout() {
    if (loading) {
      return;
    }

    setLoading(true);

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      setLoading(false);
      return;
    }

    window.setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="rounded-xl border border-[#c9ddea] bg-white px-4 py-2 text-sm font-medium text-[#647086] shadow-sm transition hover:bg-[#f8fcff] active:scale-95 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Signing out..." : "Log out"}
      </button>

      {loading && <LogoutOverlay />}
    </>
  );
}