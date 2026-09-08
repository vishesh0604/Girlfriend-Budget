"use client";

import { useState } from "react";

import { formatEntryDate } from "./dateHelpers";

type BreakdownItem = {
  categoryId: string;
  name: string;
  amount: number;
  color: string | null;
};

type Entry = {
  categoryId: string;
  entryDate: string;
  note: string;
  amount: number;
};

type CategoryBreakdownProps = {
  items: BreakdownItem[];
  entries: Entry[];
  monthStart: string;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function CategoryBreakdown({
  items,
  entries,
  monthStart,
}: CategoryBreakdownProps) {
  const [selectedId, setSelectedId] = useState<
    string | null
  >(null);

  const selected =
    items.find(
      (item) => item.categoryId === selectedId
    ) ?? null;

  const selectedEntries = selected
    ? entries
        .filter(
          (entry) =>
            entry.categoryId ===
            selected.categoryId
        )
        .sort((a, b) =>
          a.entryDate < b.entryDate ? 1 : -1
        )
    : [];

  const monthLabel = new Date(
    `${monthStart}T00:00:00`
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item.categoryId}
            type="button"
            onClick={() =>
              setSelectedId(item.categoryId)
            }
            className="flex items-center gap-1.5 rounded-lg border border-[#f3b9cd] bg-[#ffe8f0] px-2 py-1 text-xs transition hover:bg-[#ffdce9]"
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                item.color
                  ? ""
                  : "border border-[#b9879b]"
              }`}
              style={
                item.color
                  ? {
                      backgroundColor:
                        item.color,
                    }
                  : undefined
              }
            />

            <span className="text-zinc-500">
              {item.name}
            </span>

            <span className="font-semibold text-[#26354d]">
              {formatCurrency(item.amount)}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setSelectedId(null);
            }
          }}
        >
          <div className="popup-panel w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-6 shadow-xl">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-3 w-3 shrink-0 rounded-full ${
                  selected.color
                    ? ""
                    : "border border-[#b9879b]"
                }`}
                style={
                  selected.color
                    ? {
                        backgroundColor:
                          selected.color,
                      }
                    : undefined
                }
              />

              <h2 className="text-lg font-semibold tracking-tight text-[#26354d]">
                {selected.name}
              </h2>
            </div>

            <p className="mt-1 text-sm text-[#647086]">
              {selectedEntries.length} expense
              {selectedEntries.length === 1
                ? ""
                : "s"}{" "}
              in {monthLabel}
            </p>

            <div className="mt-4 space-y-1.5">
              {selectedEntries.map(
                (entry, index) => (
                  <div
                    key={index}
                    className="flex items-baseline justify-between gap-3 rounded-lg bg-[#ffe8f0] px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="shrink-0 text-xs text-[#647086]">
                        {formatEntryDate(
                          entry.entryDate
                        )}
                      </span>

                      {entry.note && (
                        <span className="truncate text-[#26354d]">
                          {entry.note}
                        </span>
                      )}
                    </div>

                    <span className="shrink-0 font-semibold text-[#26354d]">
                      {formatCurrency(
                        entry.amount
                      )}
                    </span>
                  </div>
                )
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#f3b9cd] pt-3 text-sm">
              <span className="font-medium text-[#647086]">
                Total
              </span>

              <span className="text-base font-semibold text-[#26354d]">
                {formatCurrency(selected.amount)}
              </span>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-lg border border-[#f3b9cd] px-4 py-2 text-sm font-medium text-[#647086] hover:bg-[#ffe8f0]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
