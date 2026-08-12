"use client";

import { useState } from "react";

export default function DeveloperLogsButton() {
  const [open, setOpen] = useState(false);

  const changes = [
    "Added all five contextual Help buttons '(?)' with shared popup behavior and location-specific descriptions.",
    "Added Developer Logs with a dedicated popup for tracking recent development changes.",
    "Added Current Account Balance with a budget-head-level balance breakdown.",
    "Added the login page's decorative background design to home page.",
    "Added internal scrolling for long popups.",
    
  ];

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
                          13 August 2026
                        </p>
                      </div>

                      <span className="shrink-0 text-xs text-[#647086]">
                        02:34 AM
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