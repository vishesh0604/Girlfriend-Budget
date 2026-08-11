"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  updateMonthlyHeadAllocation,
  updateMonthlyHeadPaidAmount,
  createTransfer,
  undoTransfer,
} from "./actions";

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
  transferOptions,
  recentTransfer,
}: BudgetHeadEditorProps) {
  const router = useRouter();

  const [editingAllocation, setEditingAllocation] =
    useState(false);

  const [editingPaid, setEditingPaid] =
    useState(false);

  const [transferring, setTransferring] =
    useState(false);

  const [undoingTransfer, setUndoingTransfer] =
    useState(false);

  const [clearedTransferId, setClearedTransferId] =
    useState<string | null>(null);

  const [allocationValue, setAllocationValue] =
    useState(String(allocation));

  const [paidValue, setPaidValue] =
    useState(String(paidAmount));

  const [transferDestination, setTransferDestination] =
    useState("");

  const [transferAmount, setTransferAmount] =
    useState("");

  const [allocationError, setAllocationError] =
    useState("");

  const [paidError, setPaidError] =
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
        "Please enter a transfer amount."
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
          "Unable to create transfer."
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
      `Undo this transfer?\n\n₹${recentTransfer.amount.toLocaleString(
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
          "Unable to undo transfer."
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
      `Clear this recent transfer from the card?\n\n₹${recentTransfer.amount.toLocaleString(
        "en-IN"
      )} ${
        recentTransfer.direction === "out"
          ? `from ${name} to ${recentTransfer.otherHeadName}`
          : `from ${recentTransfer.otherHeadName} to ${name}`
      }\n\nThe transfer itself will NOT be removed. Your balances and the summary card will remain unchanged.\n\nYou won't be able to restore this transfer information to this card after clearing it.`
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

      <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
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
                max={allocation}
                step="1"
                value={paidValue}
                onChange={(event) =>
                  setPaidValue(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-medium outline-none focus:border-zinc-500"
              />

              <p className="mt-1 text-xs text-zinc-500">
                Maximum: ₹
                {allocation.toLocaleString(
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
      </div>

      {/* Recent Transfer */}
      <div className="mt-5 border-t border-zinc-100 pt-4">
        <p className="text-xs font-medium text-zinc-500">
          Recent Transfer
        </p>

        {recentTransfer &&
        !recentTransferHidden ? (
          <>
            <div className="mt-1 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
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
          <p className="mt-1 text-sm text-zinc-400">
            No recent transfer
          </p>
        )}
      </div>

      {/* Transfer */}
      <div className="mt-5 border-t border-zinc-100 pt-4">
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
            className="text-sm font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            Transfer
          </button>
        ) : (
          <div>
            <p className="text-sm font-medium">
              Transfer from {name}
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
                Transfer
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
    </div>
  );
}
