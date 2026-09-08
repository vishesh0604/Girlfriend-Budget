"use client";

import { useState } from "react";

import PopupCloseButton from "@/components/PopupCloseButton";

export default function DeveloperLogsButton() {
  const [open, setOpen] = useState(false);

  /*
   * Developer Logs rotation rule:
   * when new work is added, remove the bottom-most two entries
   * and add the two newest entries at the top.
   * This list stays at five entries.
   */
  const changes = [
    "Fixed Expenses cards now show a green '+ X from Spending Pool' note on Remaining when money was moved in from Daily Spending, so Remaining above Allocated makes sense; tap it to jump to the move. The By category card gained a green 'Credit' button, and the 'Monthly report' button downloads a one-page PDF for any date range.",
    "Made Daily Spending fast: adding, editing or deleting anything responds instantly while the save runs in the background, the page loads its data in parallel, and every popup got a quick open animation.",
    "Added a 'By category' pie chart to Daily Spending: an animated donut of the whole spending pool with amounts and percentages, plus per-category colours you set in Manage categories that carry through to the chart and the activity list.",
    "Added per-month credits to Daily Spending (extra money shown green in one Activity feed), a site-wide loading strip during saves, and a uniform X close button on every help and Developer Logs popup.",
    "Added the Daily Spending Tracker: log day-to-day expenses against your spending pool, with a month calendar overview, custom categories, and 'move remaining' to next month or any fixed budget head.",
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Developer Logs"
        title="Developer Logs"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#d8c7e8] bg-[#eee4f7] text-[#76558f] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#e4d5f1] hover:shadow-md"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 3h9l3 3v15H6z" />
          <path d="M14 3v4h4" />
          <path d="M9 11h6" />
          <path d="M9 15h6" />
          <path d="M9 19h4" />
        </svg>
      </button>

      {open && (
        <div
          className="popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="popup-panel relative w-full max-w-2xl max-h-[calc(100vh-3rem)] overflow-hidden rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] shadow-xl">
            <PopupCloseButton
              onClick={() => setOpen(false)}
            />

            <div className="help-popup-scrollbar max-h-[calc(100vh-3rem)] overflow-y-auto overscroll-contain p-6 pr-5">
              <h2 className="pr-12 text-lg font-semibold tracking-tight text-[#26354d]">
                Developer Logs (Vishesh)
              </h2>

              <p className="mt-1 text-sm leading-6 text-[#647086]">
                A record of the latest changes and improvements made to the
                Budget Tracker.
              </p>

              <div className="mt-5 overflow-hidden rounded-2xl border border-[#e6b7c9] bg-[#ffe7ef] shadow-sm">
                <div className="flex">
                  <div className="w-1.5 shrink-0 bg-[#8b63a8]" />

                  <div className="min-w-0 flex-1 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#26354d]">
                          Budget Tracker Development
                        </p>

                        <p className="mt-1 text-xs text-[#647086]">
                          09 September 2026
                        </p>
                      </div>

                      <span className="shrink-0 text-xs text-[#647086]">
                        1:47 AM
                      </span>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      {changes.map((change, index) => (
                        <p
                          key={index}
                          className="text-sm leading-6 text-[#26354d]"
                        >
                          • {change}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}