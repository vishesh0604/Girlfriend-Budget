"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useRefresh } from "@/components/RefreshProvider";
import SpendingEntryRow from "./SpendingEntryRow";
import { createSpendingEntry } from "./actions";
import {
  MONTH_NAMES,
  ordinalDay,
  buildEntryDate,
  dayFromEntryDate,
} from "./dateHelpers";

type CategoryOption = {
  id: string;
  name: string;
};

type SpendingEntry = {
  id: string;
  entryDate: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  amount: number;
  note: string;
};

type SpendingCalendarProps = {
  entries: SpendingEntry[];
  categories: CategoryOption[];
  monthStart: string;
  daysInMonth: number;
  todayDay: number | null;
};

const WEEKDAYS = [
  "S",
  "M",
  "T",
  "W",
  "T",
  "F",
  "S",
];

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

export default function SpendingCalendar({
  entries,
  categories,
  monthStart,
  daysInMonth,
  todayDay,
}: SpendingCalendarProps) {
  const router = useRouter();

  const { refreshing, runRefresh } =
    useRefresh();

  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<
    number | null
  >(null);

  const [adding, setAdding] = useState(false);
  const [categoryId, setCategoryId] = useState(
    categories[0]?.id ?? ""
  );
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const busy = saving || refreshing;

  const year = Number(monthStart.slice(0, 4));
  const month = Number(monthStart.slice(5, 7));
  const monthLabel = MONTH_NAMES[month - 1];

  const firstWeekday = new Date(
    year,
    month - 1,
    1
  ).getDay();

  const byDay = new Map<
    number,
    { total: number; entries: SpendingEntry[] }
  >();

  for (const entry of entries) {
    const day = dayFromEntryDate(
      entry.entryDate
    );

    const current = byDay.get(day) ?? {
      total: 0,
      entries: [],
    };

    current.total += entry.amount;
    current.entries.push(entry);
    byDay.set(day, current);
  }

  const selectedInfo =
    selectedDay !== null
      ? byDay.get(selectedDay)
      : undefined;

  const cells: Array<number | null> = [
    ...Array(firstWeekday).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => index + 1
    ),
  ];

  function handleOpen() {
    setOpen(true);
    setSelectedDay(null);
  }

  function handleClose() {
    setOpen(false);
    setSelectedDay(null);
  }

  function openDay(day: number) {
    setSelectedDay(day);
    setAdding(false);
    setError("");
    setCategoryId(categories[0]?.id ?? "");
    setAmount("");
    setNote("");
  }

  function closeDay() {
    if (busy) {
      return;
    }

    setSelectedDay(null);
  }

  async function handleAdd() {
    if (selectedDay === null) {
      return;
    }

    setError("");
    setSaving(true);

    const result = await createSpendingEntry(
      buildEntryDate(monthStart, selectedDay),
      categoryId,
      amount,
      note
    );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to add expense."
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    setAmount("");
    setNote("");
    setAdding(false);

    runRefresh(() => {
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-xl border border-[#f3b9cd] bg-[#ffdce9] px-4 py-2 text-sm font-medium text-[#c4567d] shadow-sm transition hover:bg-[#ffe8f0]"
      >
        Month overview
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              handleClose();
            }
          }}
        >
          <div className="w-full max-w-2xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-[#26354d]">
                {monthLabel} overview
              </h2>

              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-[#f3b9cd] px-3 py-1.5 text-xs font-medium text-[#647086] hover:bg-[#ffe8f0]"
              >
                Close
              </button>
            </div>

            <p className="mt-1 text-sm leading-6 text-[#647086]">
              Each day shows what you spent. Tap a day to
              see or add its expenses.
            </p>

            <div className="mt-4 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((weekday, index) => (
                <div
                  key={index}
                  className="text-center text-[11px] font-medium text-[#647086]"
                >
                  {weekday}
                </div>
              ))}

              {cells.map((day, index) => {
                if (day === null) {
                  return <div key={index} />;
                }

                const info = byDay.get(day);
                const isToday =
                  day === todayDay;

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => openDay(day)}
                    className={`flex min-h-[54px] flex-col items-start rounded-lg border px-1.5 py-1 text-left transition hover:bg-[#ffe8f0] ${
                      isToday
                        ? "border-[#4f8fbd] bg-[#eaf5fc]"
                        : "border-[#f3b9cd] bg-[#ffe8f0]"
                    }`}
                  >
                    <span className="text-xs font-medium text-[#26354d]">
                      {day}
                    </span>

                    {info &&
                      info.total > 0 && (
                        <span className="mt-auto w-full truncate text-[11px] font-semibold text-[#26354d]">
                          {formatCurrency(
                            info.total
                          )}
                        </span>
                      )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedDay !== null && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 px-5 py-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeDay();
            }
          }}
        >
          <div className="w-full max-w-lg max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-[#26354d]">
                {ordinalDay(selectedDay)}{" "}
                {monthLabel}
              </h2>

              <span className="text-sm font-semibold text-[#26354d]">
                {formatCurrency(
                  selectedInfo?.total ?? 0
                )}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {(selectedInfo?.entries ?? [])
                .length === 0 ? (
                <p className="text-sm text-[#647086]">
                  No expenses on this day yet.
                </p>
              ) : (
                (selectedInfo?.entries ?? []).map(
                  (entry) => (
                    <SpendingEntryRow
                      key={entry.id}
                      entry={entry}
                      categories={categories}
                      monthStart={monthStart}
                      daysInMonth={daysInMonth}
                    />
                  )
                )
              )}
            </div>

            {adding ? (
              <div className="mt-4 space-y-2 rounded-xl border border-[#f3b9cd] bg-[#ffe8f0] p-3">
                <select
                  value={categoryId}
                  onChange={(event) =>
                    setCategoryId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-[#c9ddea] bg-[#f8fcff] px-3 py-2 text-sm outline-none focus:border-[#4f8fbd]"
                >
                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  placeholder="₹0"
                  className="w-full rounded-lg border border-[#c9ddea] bg-[#f8fcff] px-3 py-2 text-sm outline-none focus:border-[#4f8fbd]"
                />

                <input
                  type="text"
                  value={note}
                  onChange={(event) =>
                    setNote(event.target.value)
                  }
                  placeholder="Note (optional)"
                  className="w-full rounded-lg border border-[#c9ddea] bg-[#f8fcff] px-3 py-2 text-sm outline-none focus:border-[#4f8fbd]"
                />

                {error && (
                  <p className="text-xs text-red-600">
                    {error}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={
                      busy || !amount.trim()
                    }
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                  >
                    {saving
                      ? "Adding..."
                      : refreshing
                      ? "Updating..."
                      : "Add"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setAdding(false)
                    }
                    disabled={busy}
                    className="rounded-lg border border-[#f3b9cd] px-3 py-1.5 text-xs font-medium text-[#647086] hover:bg-[#ffdce9] disabled:cursor-not-allowed disabled:text-zinc-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                + Add expense for this day
              </button>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeDay}
                disabled={busy}
                className="rounded-lg border border-[#f3b9cd] px-4 py-2 text-sm font-medium text-[#647086] hover:bg-[#ffe8f0] disabled:cursor-not-allowed disabled:text-zinc-400"
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
