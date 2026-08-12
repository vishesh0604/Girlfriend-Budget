"use client";

import { ReactNode, useState } from "react";

type HelpButtonProps = {
  title: string;
  children: ReactNode;
  align?: "center" | "right"| "inline";
};

export default function HelpButton({
  title,
  children,
  align = "center",
}: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Help"
        className={`${align === "right" ? "ml-auto" : "mx-auto"} ${align === "inline" ? "ml-0" : "mt-0"} flex h-8 w-8 items-center justify-center rounded-full border border-[#e8c96f] bg-[#fff4c7] text-sm font-semibold text-[#8a7440] shadow-sm transition hover:-translate-y-1 hover:bg-[#ffefb0] hover:shadow-md active:translate-y-0`}
      >
        ?
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
                {title}
              </h2>

              <div className="mt-4 space-y-4 text-sm leading-6 text-[#647086]">
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}