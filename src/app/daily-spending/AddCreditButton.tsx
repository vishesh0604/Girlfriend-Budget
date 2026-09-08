"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useRefresh } from "@/components/RefreshProvider";
import { createSpendingCredit } from "./actions";
import {
  MONTH_NAMES,
  ordinalDay,
  buildEntryDate,
} from "./dateHelpers";

type AddCreditButtonProps = {
  monthStart: string;
  daysInMonth: number;
  defaultDay: number;
};

export default function AddCreditButton({
  monthStart,
  daysInMonth,
  defaultDay,
}: AddCreditButtonProps) {
  const router = useRouter();

  const { runRefresh } = useRefresh();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

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
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  function handleOpen() {
    setDay(String(defaultDay));
    setAmount("");
    setNote("");
    setError("");
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  function handleSave() {
    if (pending) {
      return;
    }

    const payload = {
      date: buildEntryDate(
        monthStart,
        Number(day)
      ),
      amount,
      note,
    };

    setError("");
    setPending(true);
    setOpen(false);

    runRefresh(async () => {
      const result =
        await createSpendingCredit(
          payload.date,
          payload.amount,
          payload.note
        );

      setPending(false);

      if (!result.success) {
        setError(
          result.error ??
            "Unable to add credit."
        );
        setOpen(true);
        return;
      }

      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100"
      >
        + Add credit
      </button>

      {open && (
        <div
          className="popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              handleClose();
            }
          }}
        >
          <div className="popup-panel w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-6 shadow-xl">
            <h2 className="text-lg font-semibold tracking-tight text-[#26354d]">
              Add credit
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#647086]">
              Extra money to spend this month (a gift, a
              refund). It adds to what&apos;s available
              without changing your Spending Pool, and only
              affects this month.
            </p>

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
                  placeholder="e.g. from mom"
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
                className="rounded-lg border border-[#f3b9cd] px-4 py-2 text-sm font-medium text-[#647086] hover:bg-[#ffe8f0]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={
                  pending || !amount.trim()
                }
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Add credit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
