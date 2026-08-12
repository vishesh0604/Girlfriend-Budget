"use client";

import { useState } from "react";

export default function DeveloperLogsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-xl border border-[#d8c7e8] bg-[#eee4f7] px-4 py-2 text-sm font-medium text-[#76558f] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#e4d5f1] hover:shadow-md"
      >
        Developer Logs
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="w-full max-w-2xl max-h-[calc(100vh-3rem)] overflow-hidden rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] shadow-xl">
            <div className="help-popup-scrollbar max-h-[calc(100vh-3rem)] overflow-y-auto overscroll-contain p-6 pr-5">
              <h2 className="text-lg font-semibold tracking-tight text-[#26354d]">
                Developer Logs
              </h2>

              <p className="mt-1 text-sm leading-6 text-[#647086]">
                A record of the latest changes and improvements
                made to the Budget Tracker.
              </p>

              <div className="mt-5 space-y-5">
                <div>
                  <p className="font-semibold text-[#26354d]">
                    Current Account Balance
                  </p>
                  <p className="mt-1">
                    Added the Current Account Balance card to the
                    Dashboard. It calculates the total of all
                    remaining budget-head balances and updates
                    whenever the underlying budget changes.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Current Account Balance Breakdown
                  </p>
                  <p className="mt-1">
                    The card now shows individual budget heads
                    with their remaining balances while excluding
                    heads with a zero balance.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Help System
                  </p>
                  <p className="mt-1">
                    Added contextual question-mark help buttons
                    across the platform, including Home, Dashboard,
                    Customize Budget, Push Remaining Amount, and
                    Current Account Balance.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Help Popup Improvements
                  </p>
                  <p className="mt-1">
                    Standardized the help-popup theme, typography,
                    interaction, click-outside behavior, and
                    internal scrolling for longer content.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Push Remaining Popup
                  </p>
                  <p className="mt-1">
                    Improved the Push Remaining popup so larger
                    numbers of budget heads can be viewed using
                    internal scrolling while keeping the popup
                    compact when possible.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Homepage Design
                  </p>
                  <p className="mt-1">
                    Added the decorative pastel background treatment
                    used on the login page to the homepage.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#26354d]">
                    Developer Logs
                  </p>
                  <p className="mt-1">
                    Added this Developer Logs section so future
                    development changes can be recorded and viewed
                    directly from the platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}