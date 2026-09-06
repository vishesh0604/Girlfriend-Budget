"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import ConfirmDialog from "@/components/ConfirmDialog";
import {
  updateSpendingEntry,
  deleteSpendingEntry,
} from "./actions";

type CategoryOption = {
  id: string;
  name: string;
};

type SpendingEntry = {
  id: string;
  entryDate: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  note: string;
};

type SpendingEntryRowProps = {
  entry: SpendingEntry;
  categories: CategoryOption[];
  minDate: string;
  maxDate: string;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default function SpendingEntryRow({
  entry,
  categories,
  minDate,
  maxDate,
}: SpendingEntryRowProps) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [confirmOpen, setConfirmOpen] =
    useState(false);
  const [deleting, setDeleting] = useState(false);

  const [date, setDate] = useState(
    entry.entryDate
  );
  const [categoryId, setCategoryId] = useState(
    entry.categoryId
  );
  const [amount, setAmount] = useState(
    String(entry.amount)
  );
  const [note, setNote] = useState(entry.note);

  function startEdit() {
    setDate(entry.entryDate);
    setCategoryId(entry.categoryId);
    setAmount(String(entry.amount));
    setNote(entry.note);
    setError("");
    setEditing(true);
  }

  async function handleSave() {
    setError("");
    setSaving(true);

    const result = await updateSpendingEntry(
      entry.id,
      date,
      categoryId,
      amount,
      note
    );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to update expense."
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);

    const result = await deleteSpendingEntry(
      entry.id
    );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to delete expense."
      );
      setDeleting(false);
      setConfirmOpen(false);
      return;
    }

    setDeleting(false);
    setConfirmOpen(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-[#f3b9cd] bg-[#ffe8f0] p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="date"
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(event) =>
              setDate(event.target.value)
            }
            className="w-full rounded-lg border border-[#c9ddea] bg-[#f8fcff] px-3 py-2 text-sm outline-none focus:border-[#4f8fbd]"
          />

          <select
            value={categoryId}
            onChange={(event) =>
              setCategoryId(event.target.value)
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
            disabled={saving}
            className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={saving}
            className="rounded-lg border border-[#f3b9cd] px-3 py-1.5 text-xs font-medium text-[#647086] hover:bg-[#ffdce9] disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#f3b9cd] bg-[#ffe8f0] px-3 py-2.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 text-xs text-[#647086]">
            {formatDate(entry.entryDate)}
          </span>

          <span className="shrink-0 rounded-full bg-[#cfeeff] px-2 py-0.5 text-[10px] font-medium text-[#3978a5]">
            {entry.categoryName}
          </span>

          {entry.note && (
            <span className="truncate text-sm text-[#26354d]">
              {entry.note}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm font-semibold text-[#26354d]">
            {formatCurrency(entry.amount)}
          </span>

          <button
            type="button"
            onClick={startEdit}
            className="text-xs font-medium text-[#3978a5] underline underline-offset-4 hover:text-[#26354d]"
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
        title="Delete this expense?"
        message={`${formatCurrency(
          entry.amount
        )} · ${entry.categoryName}${
          entry.note ? ` · ${entry.note}` : ""
        }\n\nThis removes the expense from your spending log.`}
        confirmLabel="Delete expense"
        busyLabel="Deleting..."
        tone="danger"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
