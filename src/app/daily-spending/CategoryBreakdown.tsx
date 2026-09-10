"use client";

import { useMoney } from "@/components/CurrencyProvider";

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

type Credit = {
  entryDate: string;
  note: string;
  amount: number;
};

type CategoryBreakdownProps = {
  items: BreakdownItem[];
  entries: Entry[];
  credits: Credit[];
  monthStart: string;
};

type Selection =
  | { kind: "category"; item: BreakdownItem }
  | { kind: "credit" }
  | null;

export default function CategoryBreakdown({
  items,
  entries,
  credits,
  monthStart,
}: CategoryBreakdownProps) {
  const formatCurrency = useMoney();

  const [selection, setSelection] =
    useState<Selection>(null);

  const totalCredited = credits.reduce(
    (sum, credit) => sum + credit.amount,
    0
  );

  const monthLabel = new Date(
    `${monthStart}T00:00:00`
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const categoryEntries =
    selection?.kind === "category"
      ? entries
          .filter(
            (entry) =>
              entry.categoryId ===
              selection.item.categoryId
          )
          .sort((a, b) =>
            a.entryDate < b.entryDate ? 1 : -1
          )
      : [];

  const sortedCredits = [...credits].sort(
    (a, b) =>
      a.entryDate < b.entryDate ? 1 : -1
  );

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item.categoryId}
            type="button"
            onClick={() =>
              setSelection({
                kind: "category",
                item,
              })
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

        {credits.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setSelection({ kind: "credit" })
            }
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs transition hover:bg-emerald-100"
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
            />

            <span className="text-emerald-700/80">
              Credit
            </span>

            <span className="font-semibold text-emerald-700">
              +{formatCurrency(totalCredited)}
            </span>
          </button>
        )}
      </div>

      {selection?.kind === "category" && (
        <div
          className="popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setSelection(null);
            }
          }}
        >
          <div className="popup-panel w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-6 shadow-xl">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-3 w-3 shrink-0 rounded-full ${
                  selection.item.color
                    ? ""
                    : "border border-[#b9879b]"
                }`}
                style={
                  selection.item.color
                    ? {
                        backgroundColor:
                          selection.item.color,
                      }
                    : undefined
                }
              />

              <h2 className="text-lg font-semibold tracking-tight text-[#26354d]">
                {selection.item.name}
              </h2>
            </div>

            <p className="mt-1 text-sm text-[#647086]">
              {categoryEntries.length} expense
              {categoryEntries.length === 1
                ? ""
                : "s"}{" "}
              in {monthLabel}
            </p>

            <div className="mt-4 space-y-1.5">
              {categoryEntries.map(
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
                {formatCurrency(
                  selection.item.amount
                )}
              </span>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelection(null)}
                className="rounded-lg border border-[#f3b9cd] px-4 py-2 text-sm font-medium text-[#647086] hover:bg-[#ffe8f0]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {selection?.kind === "credit" && (
        <div
          className="popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setSelection(null);
            }
          }}
        >
          <div className="popup-panel w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border border-emerald-200 bg-[#ffdce9] p-6 shadow-xl">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-full bg-emerald-500"
              />

              <h2 className="text-lg font-semibold tracking-tight text-[#26354d]">
                Credit
              </h2>
            </div>

            <p className="mt-1 text-sm text-[#647086]">
              {sortedCredits.length} credit
              {sortedCredits.length === 1
                ? ""
                : "s"}{" "}
              in {monthLabel}
            </p>

            <div className="mt-4 space-y-1.5">
              {sortedCredits.map(
                (credit, index) => (
                  <div
                    key={index}
                    className="flex items-baseline justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="shrink-0 text-xs text-emerald-700/80">
                        {formatEntryDate(
                          credit.entryDate
                        )}
                      </span>

                      {credit.note && (
                        <span className="truncate text-emerald-800">
                          {credit.note}
                        </span>
                      )}
                    </div>

                    <span className="shrink-0 font-semibold text-emerald-700">
                      +
                      {formatCurrency(
                        credit.amount
                      )}
                    </span>
                  </div>
                )
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-emerald-200 pt-3 text-sm">
              <span className="font-medium text-[#647086]">
                Total
              </span>

              <span className="text-base font-semibold text-emerald-700">
                +{formatCurrency(totalCredited)}
              </span>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelection(null)}
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
