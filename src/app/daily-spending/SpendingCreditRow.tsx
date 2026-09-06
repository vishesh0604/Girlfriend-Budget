"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import ConfirmDialog from "@/components/ConfirmDialog";
import { useRefresh } from "@/components/RefreshProvider";
import {
  updateSpendingCredit,
  deleteSpendingCredit,
} from "./actions";
import {
  MONTH_NAMES,
  ordinalDay,
  formatEntryDate,
  dayFromEntryDate,
  buildEntryDate,
} from "./dateHelpers";

type SpendingCredit = {
  id: string;
  entryDate: string;
  amount: number;
  note: string;
};

type SpendingCreditRowProps = {
  credit: SpendingCredit;
  monthStart: string;
  daysInMonth: number;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function SpendingCreditRow({
  credit,
  monthStart,
  daysInMonth,
}: SpendingCreditRowProps) {
  const router = useRouter();

  const { refreshing, runRefresh } =
    useRefresh();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [confirmOpen, setConfirmOpen] =
    useState(false);
  const [deleting, setDeleting] = useState(false);

  const busy =
    saving || deleting || refreshing;

  const monthLabel =
    MONTH_NAMES[
      Number(monthStart.slice(5, 7)) - 1
    ] ?? "";

  const dayOptions = Array.from(
    { length: daysInMonth },
    (_, index) => index + 1
  );

  const [day, setDay] = useState(
    String(dayFromEntryDate(credit.entryDate))
  );
  const [amount, setAmount] = useState(
    String(credit.amount)
  );
  const [note, setNote] = useState(credit.note);

  function startEdit() {
    setDay(
      String(
        dayFromEntryDate(credit.entryDate)
      )
    );
    setAmount(String(credit.amount));
    setNote(credit.note);
    setError("");
    setEditing(true);
  }

  async function handleSave() {
    setError("");
    setSaving(true);

    const result = await updateSpendingCredit(
      credit.id,
      buildEntryDate(
        monthStart,
        Number(day)
      ),
      amount,
      note
    );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to update credit."
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);

    runRefresh(() => {
      router.refresh();
    });
  }

  async function handleDelete() {
    setDeleting(true);

    const result = await deleteSpendingCredit(
      credit.id
    );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to delete credit."
      );
      setDeleting(false);
      setConfirmOpen(false);
      return;
    }

    setDeleting(false);
    setConfirmOpen(false);

    runRefresh(() => {
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            value={day}
            onChange={(event) =>
              setDay(event.target.value)
            }
            className="w-full rounded-lg border border-[#c9ddea] bg-[#f8fcff] px-3 py-2 text-sm outline-none focus:border-[#4f8fbd]"
          >
            {dayOptions.map((option) => (
              <option
                key={option}
                value={option}
              >
                {ordinalDay(option)} {monthLabel}
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
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-600">
            {error}
          </p>
        )}

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {saving
              ? "Saving..."
              : refreshing
              ? "Updating..."
              : "Save"}
          </button>

          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={busy}
            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 text-xs text-emerald-700/80">
            {formatEntryDate(credit.entryDate)}
          </span>

          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            Credit
          </span>

          {credit.note && (
            <span className="truncate text-sm text-emerald-800">
              {credit.note}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm font-semibold text-emerald-700">
            + {formatCurrency(credit.amount)}
          </span>

          <button
            type="button"
            onClick={startEdit}
            className="text-xs font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="text-xs font-medium text-[#a94444] underline underline-offset-4 hover:text-[#7a2f2f]"
          >
            Delete
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this credit?"
        message={`+ ${formatCurrency(
          credit.amount
        )}${
          credit.note
            ? ` · ${credit.note}`
            : ""
        }\n\nThis removes the credit and lowers what's available to spend this month.`}
        confirmLabel="Delete credit"
        busyLabel="Deleting..."
        tone="danger"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
