"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useRefresh } from "@/components/RefreshProvider";
import { setHeadSort } from "./actions";
import {
  HEAD_SORT_MODES,
  HEAD_SORT_LABELS,
  HEAD_SORT_SHORT,
  type HeadSortMode,
} from "./headSort";

export default function SortHeadsButton({
  current,
}: {
  current: HeadSortMode;
}) {
  const router = useRouter();
  const { runRefresh } = useRefresh();

  const [open, setOpen] = useState(false);
  const [pending, setPending] =
    useState<HeadSortMode | null>(null);

  const shown = pending ?? current;

  function choose(mode: HeadSortMode) {
    setOpen(false);

    if (mode === current || pending) {
      return;
    }

    setPending(mode);

    runRefresh(async () => {
      const result = await setHeadSort(mode);

      if (!result.success) {
        setPending(null);
        return;
      }

      router.refresh();
      setPending(null);
    });
  }

  return (
    <div className="relative top-[20px] shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Sort: ${HEAD_SORT_SHORT[shown]}`}
        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-50 sm:px-3"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m3 8 4-4 4 4" />
          <path d="M7 4v16" />
          <path d="m21 16-4 4-4-4" />
          <path d="M17 20V4" />
        </svg>
        <span className="hidden whitespace-nowrap sm:inline">
          Sort: {HEAD_SORT_SHORT[shown]}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`hidden transition sm:block ${
            open ? "rotate-180" : ""
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />

          <div className="popup-panel absolute right-0 top-[calc(100%+0.4rem)] z-40 w-56 origin-top-right overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-xl">
            {HEAD_SORT_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => choose(mode)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                  mode === current
                    ? "bg-[#eaf2fb] text-[#26354d]"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {HEAD_SORT_LABELS[mode]}

                {mode === current && (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="shrink-0"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
