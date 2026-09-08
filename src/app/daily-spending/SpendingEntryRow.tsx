"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import ConfirmDialog from "@/components/ConfirmDialog";
import { useRefresh } from "@/components/RefreshProvider";
import {
  updateSpendingEntry,
  deleteSpendingEntry,
} from "./actions";
import {
  MONTH_NAMES,
  ordinalDay,
  formatEntryDate,
  dayFromEntryDate,
  buildEntryDate,
} from "./dateHelpers";
import { readableTextOn } from "./categoryColors";

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

type SpendingEntryRowProps = {
  entry: SpendingEntry;
  categories: CategoryOption[];
  monthStart: string;
  daysInMonth: number;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function SpendingEntryRow({
  entry,
  categories,
  monthStart,
  daysInMonth,
}: SpendingEntryRowProps) {
  const router = useRouter();

  const { runRefresh } = useRefresh();

  // Optimistic overlays: what the row shows before the server catches up.
  const [localEntry, setLocalEntry] =
    useState<SpendingEntry | null>(null);
  const [removed, setRemoved] = useState(false);

  const displayEntry = localEntry ?? entry;

  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const [confirmOpen, setConfirmOpen] =
    useState(false);

  const monthLabel =
    MONTH_NAMES[
      Number(monthStart.slice(5, 7)) - 1
    ] ?? "";

  const dayOptions = Array.from(
    { length: daysInMonth },
    (_, index) => index + 1
  );

  const [day, setDay] = useState(
    String(
      dayFromEntryDate(displayEntry.entryDate)
    )
  );
  const [categoryId, setCategoryId] = useState(
    displayEntry.categoryId
  );
  const [amount, setAmount] = useState(
    String(displayEntry.amount)
  );
  const [note, setNote] = useState(
    displayEntry.note
  );

  function startEdit() {
    setDay(
      String(
        dayFromEntryDate(displayEntry.entryDate)
      )
    );
    setCategoryId(displayEntry.categoryId);
    setAmount(String(displayEntry.amount));
    setNote(displayEntry.note);
    setError("");
    setEditing(true);
  }

  function handleSave() {
    if (pending) {
      return;
    }

    const nextDate = buildEntryDate(
      monthStart,
      Number(day)
    );
    const nextCategory = categories.find(
      (category) => category.id === categoryId
    );

    const previous = localEntry;
    const categoryChanged =
      categoryId !== displayEntry.categoryId;

    // Show the edit straight away, then reconcile in the background.
    setLocalEntry({
      ...displayEntry,
      entryDate: nextDate,
      categoryId,
      categoryName:
        nextCategory?.name ??
        displayEntry.categoryName,
      // Colour isn't known here - let the refresh fill it in.
      categoryColor: categoryChanged
        ? null
        : displayEntry.categoryColor,
      amount: Number(amount),
      note: note.trim(),
    });
    setError("");
    setEditing(false);
    setPending(true);

    runRefresh(async () => {
      const result =
        await updateSpendingEntry(
          entry.id,
          nextDate,
          categoryId,
          amount,
          note
        );

      setPending(false);

      if (!result.success) {
        setLocalEntry(previous);
        setError(
          result.error ??
            "Unable to update expense."
        );
        setEditing(true);
        return;
      }

      router.refresh();
    });
  }

  function handleDelete() {
    if (pending) {
      return;
    }

    setConfirmOpen(false);
    setRemoved(true);
    setError("");
    setPending(true);

    runRefresh(async () => {
      const result =
        await deleteSpendingEntry(entry.id);

      setPending(false);

      if (!result.success) {
        setRemoved(false);
        setError(
          result.error ??
            "Unable to delete expense."
        );
        return;
      }

      router.refresh();
    });
  }

  if (removed) {
    return null;
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-[#f3b9cd] bg-[#ffe8f0] p-3">
        <div className="grid gap-2 sm:grid-cols-2">
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
            disabled={pending || !amount.trim()}
            className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            Save
          </button>

          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-[#f3b9cd] px-3 py-1.5 text-xs font-medium text-[#647086] hover:bg-[#ffdce9]"
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
            {formatEntryDate(
              displayEntry.entryDate
            )}
          </span>

          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              displayEntry.categoryColor
                ? ""
                : "bg-[#cfeeff] text-[#3978a5]"
            }`}
            style={
              displayEntry.categoryColor
                ? {
                    backgroundColor:
                      displayEntry.categoryColor,
                    color: readableTextOn(
                      displayEntry.categoryColor
                    ),
                  }
                : undefined
            }
          >
            {displayEntry.categoryName}
          </span>

          {displayEntry.note && (
            <span className="truncate text-sm text-[#26354d]">
              {displayEntry.note}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm font-semibold text-[#26354d]">
            {formatCurrency(displayEntry.amount)}
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

      {error && (
        <p className="mt-1 px-1 text-xs text-red-600">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this expense?"
        message={`${formatCurrency(
          displayEntry.amount
        )} · ${displayEntry.categoryName}${
          displayEntry.note
            ? ` · ${displayEntry.note}`
            : ""
        }\n\nThis removes the expense from your spending log.`}
        confirmLabel="Delete expense"
        busyLabel="Deleting..."
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
