"use client";

import PageTransition from "@/components/PageTransition";

export default function HomeButton() {
  return (
    <PageTransition
      href="/home"
      type="home"
      className="mb-5 inline-flex items-center rounded-xl border border-[#f3b9cd] bg-[#ffdce9] px-4 py-2 text-sm font-medium text-[#26354d] transition hover:bg-[#ffe8f0]"
    >
      ← Home
    </PageTransition>
  );
}
