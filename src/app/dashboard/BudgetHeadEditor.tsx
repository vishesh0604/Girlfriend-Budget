"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  updateMonthlyHeadAllocation,
  updateMonthlyHeadPaidAmount,
  updateMonthlyHeadNote,
  createTransfer,
  undoTransfer,
} from "./actions";
import { calculateMaximumPaidAmount } from "@/lib/supabase/budget/calculations";

type TransferOption = {
  id: string;
  name: string;
};

type RecentTransfer = {
  transferId: string;
  direction: "out" | "in";
  amount: number;
  otherHeadName: string;
  createdAt: string;
};

type BudgetHeadEditorProps = {
  monthlyHeadId: string;
  monthlyBudgetId: string;
  name: string;
  allocation: number;
  paidAmount: number;
  remaining: number;
  note: string;
  transferOptions: TransferOption[];
  recentTransfer?: RecentTransfer;
};

export default function BudgetHeadEditor({
  monthlyHeadId,
  monthlyBudgetId,
  name,
  allocation,
  paidAmount,
  remaining,
  note,
  transferOptions,
  recentTransfer,
}: BudgetHeadEditorProps) {
  const router = useRouter();

  const maximumPaidAmount =
    calculateMaximumPaidAmount(
      paidAmount,
      remaining
    );

  const [editingAllocation, setEditingAllocation] =
    useState(false);

  const [editingPaid, setEditingPaid] =
    useState(false);

  const [payingInFull, setPayingInFull] =
    useState(false);

  const [transferring, setTransferring] =
    useState(false);

  const [editingNote, setEditingNote] =
    useState(false);

  const [savingNote, setSavingNote] =
    useState(false);

  const [undoingTransfer, setUndoingTransfer] =
    useState(false);

  const [clearedTransferId, setClearedTransferId] =
    useState<string | null>(null);

  const [allocationValue, setAllocationValue] =
    useState(String(allocation));

  const [paidValue, setPaidValue] =
    useState(String(paidAmount));

  const [noteValue, setNoteValue] =
    useState(note);

  const [transferDestination, setTransferDestination] =
    useState("");

  const [transferAmount, setTransferAmount] =
    useState("");

  const [allocationError, setAllocationError] =
    useState("");

  const [paidError, setPaidError] =
    useState("");

  const [payInFullError, setPayInFullError] =
    useState("");

  const [noteError, setNoteError] =
    useState("");

  const [transferError, setTransferError] =
    useState("");

  const [undoError, setUndoError] =
    useState("");

  /*
   * Restore the user's "clear recent transfer"
   * preference for this specific transfer.
   */
  useEffect(() => {
    if (!recentTransfer) {
      setClearedTransferId(null);
      return;
    }

    const storageKey =
      `budget-cleared-transfer-${monthlyHeadId}`;

    const storedTransferId =
      window.localStorage.getItem(
        storageKey
      );

    if (
      storedTransferId ===
      recentTransfer.transferId
    ) {
      setClearedTransferId(
        storedTransferId
      );
    } else {
      setClearedTransferId(null);
    }
  }, [
    monthlyHeadId,
    recentTransfer?.transferId,
  ]);

  const recentTransferHidden =
    Boolean(
      recentTransfer &&
        clearedTransferId ===
          recentTransfer.transferId
    );

  async function handleAllocationSave() {
    setAllocationError("");

    const result =
      await updateMonthlyHeadAllocation(
        monthlyHeadId,
        allocationValue
      );

    if (!result.success) {
      setAllocationError(
        result.error ??
          "Unable to update allocation."
      );
      return;
    }

    setEditingAllocation(false);
  }

  async function handlePaidSave() {
    setPaidError("");

    const result =
      await updateMonthlyHeadPaidAmount(
        monthlyHeadId,
        paidValue
      );

    if (!result.success) {
      setPaidError(
        result.error ??
          "Unable to update paid amount."
      );
      return;
    }

    setEditingPaid(false);
  }

  async function handleNoteSave() {
    setNoteError("");
    setSavingNote(true);

    const result =
      await updateMonthlyHeadNote(
        monthlyHeadId,
        noteValue
      );

    if (!result.success) {
      setNoteError(
        result.error ??
          "Unable to save note."
      );
      setSavingNote(false);
      return;
    }

    setSavingNote(false);
    setEditingNote(false);
    router.refresh();
  }

  async function handlePayInFull() {
    setPayInFullError("");
    setPayingInFull(true);

    const result =
      await updateMonthlyHeadPaidAmount(
        monthlyHeadId,
        String(maximumPaidAmount)
      );

    if (!result.success) {
      setPayInFullError(
        result.error ??
          "Unable to update paid amount."
      );
      setPayingInFull(false);
      return;
    }

    setPayingInFull(false);
    router.refresh();
  }

  async function handleTransferSave() {
    setTransferError("");

    if (!transferDestination) {
      setTransferError(
        "Please select a destination budget head."
      );
      return;
    }

    if (!transferAmount) {
      setTransferError(
        "Please enter an amount to move."
      );
      return;
    }

    const result = await createTransfer(
      monthlyBudgetId,
      monthlyHeadId,
      transferDestination,
      transferAmount
    );

    if (!result.success) {
      setTransferError(
        result.error ??
          "Unable to move funds."
      );
      return;
    }

    setTransferAmount("");
    setTransferDestination("");
    setTransferring(false);
  }

  async function handleUndoTransfer() {
    if (!recentTransfer) {
      return;
    }

    const confirmed = window.confirm(
      `Undo this fund move?\n\n₹${recentTransfer.amount.toLocaleString(
        "en-IN"
      )} ${
        recentTransfer.direction === "out"
          ? `from ${name} to ${recentTransfer.otherHeadName}`
          : `from ${recentTransfer.otherHeadName} to ${name}`
      }\n\nThis will restore the balances to their previous state.`
    );

    if (!confirmed) {
      return;
    }

    setUndoError("");
    setUndoingTransfer(true);

    const result = await undoTransfer(
      recentTransfer.transferId,
      monthlyBudgetId
    );

    if (!result.success) {
      setUndoError(
        result.error ??
          "Unable to undo the fund move."
      );
      setUndoingTransfer(false);
      return;
    }

    /*
     * Refresh the server component immediately.
     *
     * This removes the deleted transfer from
     * the current props and also restores the
     * previous balances without requiring the
     * user to manually refresh the browser.
     */
    setUndoingTransfer(false);
    router.refresh();
  }

  function handleClearRecentTransfer() {
    if (!recentTransfer) {
      return;
    }

    const confirmed = window.confirm(
      `Clear this recent move from the card?\n\n₹${recentTransfer.amount.toLocaleString(
        "en-IN"
      )} ${
        recentTransfer.direction === "out"
          ? `from ${name} to ${recentTransfer.otherHeadName}`
          : `from ${recentTransfer.otherHeadName} to ${name}`
      }\n\nThe fund move itself will NOT be removed. Your balances and the summary card will remain unchanged.\n\nYou won't be able to restore this move information to this card after clearing it.`
    );

    if (!confirmed) {
      return;
    }

    const storageKey =
      `budget-cleared-transfer-${monthlyHeadId}`;

    window.localStorage.setItem(
      storageKey,
      recentTransfer.transferId
    );

    setClearedTransferId(
      recentTransfer.transferId
    );
  }

  function cancelTransfer() {
    setTransferAmount("");
    setTransferDestination("");
    setTransferError("");
    setTransferring(false);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">
            {name}
          </h3>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
        {/* Allocated */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-zinc-500">
              Allocated
            </p>

            {!editingAllocation && (
              <button
                type="button"
                onClick={() => {
                  setAllocationValue(
                    String(allocation)
                  );
                  setAllocationError("");
                  setEditingAllocation(true);
                }}
                className="text-xs font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-950"
              >
                Edit
              </button>
            )}
          </div>

          {editingAllocation ? (
            <div className="mt-2">
              <input
                type="number"
                min="0"
                step="1"
                value={allocationValue}
                onChange={(event) =>
                  setAllocationValue(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-medium outline-none focus:border-zinc-500"
              />

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={
                    handleAllocationSave
                  }
                  className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                >
                  Save
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAllocationValue(
                      String(allocation)
                    );
                    setAllocationError("");
                    setEditingAllocation(false);
                  }}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </div>

              {allocationError && (
                <p className="mt-2 text-xs text-red-600">
                  {allocationError}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1 font-medium">
              ₹
              {allocation.toLocaleString(
                "en-IN"
              )}
            </p>
          )}
        </div>

        {/* Paid / Used */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-zinc-500">
              Paid / Used
            </p>

            {!editingPaid && (
              <button
                type="button"
                onClick={() => {
                  setPaidValue(
                    String(paidAmount)
                  );
                  setPaidError("");
                  setEditingPaid(true);
                }}
                className="text-xs font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-950"
              >
                Edit
              </button>
            )}
          </div>

          {editingPaid ? (
            <div className="mt-2">
              <input
                type="number"
                min="0"
                max={maximumPaidAmount}
                step="1"
                value={paidValue}
                onChange={(event) =>
                  setPaidValue(event.target.value)
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-medium outline-none focus:border-zinc-500"
              />

              <p className="mt-1 text-xs text-zinc-500">
                Maximum: ₹
                {maximumPaidAmount.toLocaleString(
                  "en-IN"
                )}
              </p>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handlePaidSave}
                  className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                >
                  Save
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaidValue(
                      String(paidAmount)
                    );
                    setPaidError("");
                    setEditingPaid(false);
                  }}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </div>

              {paidError && (
                <p className="mt-2 text-xs text-red-600">
                  {paidError}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1 font-medium">
              ₹
              {paidAmount.toLocaleString(
                "en-IN"
              )}
            </p>
          )}
        </div>

        {/* Remaining */}
        <div>
          <p className="text-zinc-500">
            Remaining
          </p>

          <p className="mt-1 font-medium">
            ₹
            {remaining.toLocaleString(
              "en-IN"
            )}
          </p>
        </div>

        {/* Pay in full */}
        <div className="flex h-full flex-col items-end justify-center pt-2">
          {!editingPaid && (
            <>
              <button
                type="button"
                onClick={handlePayInFull}
                disabled={
                  payingInFull ||
                  remaining <= 0
                }
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                {payingInFull
                  ? "Paying..."
                  : "Pay in full"}
              </button>

              {payInFullError && (
                <p className="mt-2 text-right text-xs text-red-600">
                  {payInFullError}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Recent Move */}
      <div className="mt-3 border-t border-zinc-100 pt-3">
        <p className="text-xs font-medium text-zinc-500">
          Recent Moves
        </p>

        <div className="mt-1.5 rounded-md bg-zinc-100 px-2.5 py-1.5">
        {recentTransfer &&
        !recentTransferHidden ? (
          <>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <span className="font-semibold">
                  {recentTransfer.direction ===
                  "out"
                    ? "→"
                    : "←"}
                </span>

                <span className="font-medium">
                  ₹
                  {recentTransfer.amount.toLocaleString(
                    "en-IN"
                  )}
                </span>

                <span className="min-w-0 break-words text-zinc-500">
                  {recentTransfer.direction ===
                  "out"
                    ? `to ${recentTransfer.otherHeadName}`
                    : `from ${recentTransfer.otherHeadName}`}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={handleUndoTransfer}
                  disabled={undoingTransfer}
                  className="text-xs font-medium text-zinc-500 underline underline-offset-4 hover:text-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
                >
                  {undoingTransfer
                    ? "Undoing..."
                    : "Undo"}
                </button>

                <button
                  type="button"
                  onClick={
                    handleClearRecentTransfer
                  }
                  disabled={undoingTransfer}
                  className="text-xs font-medium text-zinc-400 underline underline-offset-4 hover:text-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-300"
                >
                  Clear
                </button>
              </div>
            </div>

            {undoError && (
              <p className="mt-2 text-xs text-red-600">
                {undoError}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-zinc-400">
            No recent moves
          </p>
        )}
        </div>
      </div>

      {/* Move funds */}
      <div className="mt-3 border-t border-zinc-100 pt-3">
        {!transferring ? (
          <button
            type="button"
            onClick={() => {
              setTransferError("");
              setTransferAmount("");
              setTransferDestination("");
              setTransferring(true);
            }}
            disabled={
              transferOptions.length === 0 ||
              remaining <= 0
            }
            className="rounded-lg border border-[#d8c7e8] bg-[#eee4f7] px-3.5 py-2 text-sm font-medium text-[#76558f] transition hover:bg-[#e4d5f1] disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            Move funds
          </button>
        ) : (
          <div>
            <p className="text-sm font-medium">
              Move funds from {name}
            </p>

            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs text-zinc-500">
                  To
                </label>

                <select
                  value={transferDestination}
                  onChange={(event) =>
                    setTransferDestination(
                      event.target.value
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
                >
                  <option value="">
                    Select budget head
                  </option>

                  {transferOptions.map(
                    (option) => (
                      <option
                        key={option.id}
                        value={option.id}
                      >
                        {option.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-500">
                  Amount
                </label>

                <input
                  type="number"
                  min="0"
                  max={remaining}
                  step="1"
                  value={transferAmount}
                  onChange={(event) =>
                    setTransferAmount(
                      event.target.value
                    )
                  }
                  placeholder="₹0"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                />

                <p className="mt-1 text-xs text-zinc-500">
                  Maximum: ₹
                  {remaining.toLocaleString(
                    "en-IN"
                  )}
                </p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleTransferSave}
                className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
              >
                Move funds
              </button>

              <button
                type="button"
                onClick={cancelTransfer}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>

            {transferError && (
              <p className="mt-2 text-xs text-red-600">
                {transferError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="mt-3 border-t border-zinc-100 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-zinc-500">
            Notes
          </p>

          {!editingNote && (
            <button
              type="button"
              onClick={() => {
                setNoteValue(note);
                setNoteError("");
                setEditingNote(true);
              }}
              className="text-xs font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-950"
            >
              {note.trim()
                ? "Edit"
                : "Add note"}
            </button>
          )}
        </div>

        {editingNote ? (
          <div className="mt-2">
            <textarea
              rows={3}
              value={noteValue}
              onChange={(event) =>
                setNoteValue(
                  event.target.value
                )
              }
              placeholder="Add details about this payment..."
              className="w-full resize-y rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleNoteSave}
                disabled={savingNote}
                className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {savingNote
                  ? "Saving..."
                  : "Save"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setNoteValue(note);
                  setNoteError("");
                  setEditingNote(false);
                }}
                disabled={savingNote}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
              >
                Cancel
              </button>
            </div>

            {noteError && (
              <p className="mt-2 text-xs text-red-600">
                {noteError}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-1.5 rounded-md bg-zinc-100 px-2.5 py-1.5">
            {note.trim() ? (
              <p className="whitespace-pre-wrap break-words text-sm text-zinc-700">
                {note}
              </p>
            ) : (
              <p className="text-sm text-zinc-400">
                No notes
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
