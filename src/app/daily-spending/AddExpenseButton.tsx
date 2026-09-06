"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import ActivityToast from "@/components/ActivityToast";
import { createSpendingEntry } from "./actions";
import {
  MONTH_NAMES,
  ordinalDay,
  buildEntryDate,
} from "./dateHelpers";

type CategoryOption = {
  id: string;
  name: string;
};

type AddExpenseButtonProps = {
  categories: CategoryOption[];
  monthStart: string;
  daysInMonth: number;
  defaultDay: number;
};

export default function AddExpenseButton({
  categories,
  monthStart,
  daysInMonth,
  defaultDay,
}: AddExpenseButtonProps) {
  const router = useRouter();

  const [isRefreshing, startTransition] =
    useTransition();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const busy = saving || isRefreshing;

  const monthLabel =
    MONTH_NAMES[
      Number(monthStart.slice(5, 7)) - 1
    ] ?? "";

  const dayOptions = Array.from(
    { length: daysInMonth },
    (_, index) => index + 1
  );

  const [day, setDay] = useState(
    String(defaultDay)
  );
  const [categoryId, setCategoryId] = useState(
    categories[0]?.id ?? ""
  );
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  function handleOpen() {
    setDay(String(defaultDay));
    setCategoryId(categories[0]?.id ?? "");
    setAmount("");
    setNote("");
    setError("");
    setOpen(true);
  }

  function handleClose() {
    if (busy) {
      return;
    }

    setOpen(false);
  }

  async function handleSave() {
    setError("");
    setSaving(true);

    const result = await createSpendingEntry(
      buildEntryDate(
        monthStart,
        Number(day)
      ),
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
    setOpen(false);

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      <ActivityToast
        show={busy}
        label="Adding expense..."
      />

      <button
        type="button"
        onClick={handleOpen}
        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
      >
        + Add expense
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
          <div className="w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-6 shadow-xl">
            <h2 className="text-lg font-semibold tracking-tight text-[#26354d]">
              Add expense
            </h2>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-[#647086]">
                  Day of {monthLabel}
                </label>

                <select
                  value={day}
                  onChange={(event) =>
                    setDay(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-[#c9ddea] bg-[#f8fcff] px-3 py-2 text-sm outline-none focus:border-[#4f8fbd]"
                >
                  {dayOptions.map((option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {ordinalDay(option)}{" "}
                      {monthLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[#647086]">
                  Category
                </label>

                <select
                  value={categoryId}
                  onChange={(event) =>
                    setCategoryId(
                      event.target.value
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-[#c9ddea] bg-[#f8fcff] px-3 py-2 text-sm outline-none focus:border-[#4f8fbd]"
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
              </div>

              <div>
                <label className="text-xs font-medium text-[#647086]">
                  Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  placeholder="₹0"
                  className="mt-1 w-full rounded-lg border border-[#c9ddea] bg-[#f8fcff] px-3 py-2 text-sm outline-none focus:border-[#4f8fbd]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#647086]">
                  Note (optional)
                </label>

                <input
                  type="text"
                  value={note}
                  onChange={(event) =>
                    setNote(event.target.value)
                  }
                  placeholder="e.g. lunch with Tanishka"
                  className="mt-1 w-full rounded-lg border border-[#c9ddea] bg-[#f8fcff] px-3 py-2 text-sm outline-none focus:border-[#4f8fbd]"
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                className="rounded-lg border border-[#f3b9cd] px-4 py-2 text-sm font-medium text-[#647086] hover:bg-[#ffe8f0] disabled:cursor-not-allowed disabled:text-zinc-400"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={
                  busy ||
                  !amount.trim() ||
                  !categoryId
                }
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {saving ? "Adding..." : "Add expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
