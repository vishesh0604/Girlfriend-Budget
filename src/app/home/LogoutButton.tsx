"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    const supabase = createClient();

    await supabase.auth.signOut();

    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="rounded-xl border border-[#f3b9cd] bg-[#ffe8f0] px-5 py-2.5 text-sm font-medium text-[#c4567d] transition hover:bg-[#ffdce9] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoggingOut ? "Logging out..." : "Log out"}
    </button>
  );
}
