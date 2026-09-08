"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  updateMonthlyHeadAllocation,
  updateMonthlyHeadPaidAmount,
  updateMonthlyHeadNote,
  createTransfer,
  undoTransfer,
  getBudgetHeadPaymentHistory,
  deleteHeadPayment,
  type PaymentHistoryEntry,
} from "./actions";
import { calculateMaximumPaidAmount } from "@/lib/supabase/budget/calculations";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useRefresh } from "@/components/RefreshProvider";

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
  budgetHeadId: string;
  name: string;
  dueDay: number | null;
  monthStart: string;
  allocation: number;
  paidAmount: number;
  remaining: number;
  fromSpendingPool: number;
  note: string;
  transferOptions: TransferOption[];
  recentTransfer?: RecentTransfer;
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function currentMonthStart() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-01`;
}

/* A short "(due in 3 days)" style tag, only within ~a week of the date. */
function dueLabel(
  monthStart: string,
  dueDay: number | null,
  settled: boolean
) {
  if (
    dueDay === null ||
    settled ||
    monthStart !== currentMonthStart()
  ) {
    return null;
  }

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();

  const due = new Date(
    now.getFullYear(),
    now.getMonth(),
    Math.min(dueDay, daysInMonth)
  );

  const diffDays = Math.round(
    (due.getTime() - today.getTime()) /
      86400000
  );

  if (diffDays < 0) {
    const by = -diffDays;
    return `overdue by ${by} ${
      by === 1 ? "day" : "days"
    }`;
  }
  if (diffDays === 0) {
    return "due today";
  }
  if (diffDays === 1) {
    return "due tomorrow";
  }

  return `due in ${diffDays} days`;
}

function shortDate(iso: string) {
  const date = new Date(iso);

  return `${date.getDate()} ${
    MONTH_LABELS[date.getMonth()]
  } ${date.getFullYear()}`;
}

function monthLabel(monthStart: string) {
  const year = Number(monthStart.slice(0, 4));
  const month = Number(
    monthStart.slice(5, 7)
  );

  return `${MONTH_LABELS[month - 1]} ${year}`;
}

export default function BudgetHeadEditor({
  monthlyHeadId,
  monthlyBudgetId,
  budgetHeadId,
  name,
  dueDay,
  monthStart,
  allocation,
  paidAmount,
  remaining,
  fromSpendingPool,
  note,
  transferOptions,
  recentTransfer,
}: BudgetHeadEditorProps) {
  const router = useRouter();
  const { runRefresh } = useRefresh();

  const settled = remaining <= 0;
  const due = dueLabel(
    monthStart,
    dueDay,
    settled
  );

  const [historyOpen, setHistoryOpen] =
    useState(false);
  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(false);
  const [history, setHistory] = useState<
    PaymentHistoryEntry[] | null
  >(null);
  const [
    historyDeleteTarget,
    setHistoryDeleteTarget,
  ] = useState<PaymentHistoryEntry | null>(null);
  const [historyDeleting, setHistoryDeleting] =
    useState(false);
  const [historyHelpOpen, setHistoryHelpOpen] =
    useState(false);

  async function openHistory() {
    setHistoryOpen(true);
    setHistoryHelpOpen(false);
    setHistoryLoading(true);

    const result =
      await getBudgetHeadPaymentHistory(
        budgetHeadId
      );

    setHistoryLoading(false);

    if (result.success) {
      setHistory(result.history);
    }
  }

  async function handleDeleteHistoryEntry() {
    const target = historyDeleteTarget;

    if (!target?.id) {
      return;
    }

    setHistoryDeleting(true);

    const result = await deleteHeadPayment(
      target.id
    );

    setHistoryDeleting(false);
    setHistoryDeleteTarget(null);

    if (result.success) {
      setHistory((current) =>
        (current ?? []).filter(
          (entry) => entry.id !== target.id
        )
      );
    }
  }

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

  const [undoConfirmOpen, setUndoConfirmOpen] =
    useState(false);

  const [clearConfirmOpen, setClearConfirmOpen] =
    useState(false);

  const [clearedTransferId, setClearedTransferId] =
    useState<string | null>(() =>
      readClearedPreference()
    );

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
   * Restore the user's "clear recent transfer" preference for this
   * transfer. Derived during render (adjusting state on a prop change)
   * rather than in an effect - see react.dev "You Might Not Need an
   * Effect".
   */
  function readClearedPreference() {
    if (
      typeof window === "undefined" ||
      !recentTransfer
    ) {
      return null;
    }

    const stored =
      window.localStorage.getItem(
        `budget-cleared-transfer-${monthlyHeadId}`
      );

    return stored ===
      recentTransfer.transferId
      ? stored
      : null;
  }

  const [trackedTransferId, setTrackedTransferId] =
    useState(
      recentTransfer?.transferId ?? null
    );

  if (
    trackedTransferId !==
    (recentTransfer?.transferId ?? null)
  ) {
    setTrackedTransferId(
      recentTransfer?.transferId ?? null
    );
    setClearedTransferId(
      readClearedPreference()
    );
  }

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
    runRefresh(() => router.refresh());
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
    runRefresh(() => router.refresh());
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
    runRefresh(() => router.refresh());
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
    runRefresh(() => router.refresh());
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
    runRefresh(() => router.refresh());
  }

  async function handleUndoTransfer() {
    if (!recentTransfer) {
      return;
    }

    setUndoConfirmOpen(false);
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
    runRefresh(() => router.refresh());
  }

  function handleClearRecentTransfer() {
    if (!recentTransfer) {
      return;
    }

    setClearConfirmOpen(false);

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
            {due && (
              <span
                className={`ml-1.5 text-xs font-medium ${
                  due.startsWith("overdue")
                    ? "text-[#c0392b]"
                    : due === "due today" ||
                      due === "due tomorrow"
                    ? "text-[#c0392b]"
                    : "text-[#c4567d]"
                }`}
              >
                ({due})
              </span>
            )}
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
            {fromSpendingPool > 0 && (
              <span className="ml-1 text-[12px] font-medium text-emerald-600">
                (+₹
                {fromSpendingPool.toLocaleString(
                  "en-IN"
                )}{" "}
                from{" "}
                <Link
                  href="/daily-spending?move=1"
                  className="underline underline-offset-2 hover:text-emerald-700"
                >
                  Spending Pool
                </Link>
                )
              </span>
            )}
          </p>
        </div>

        {/* History + Pay in full. On narrow cards the pair is wider than
            this half-width cell, so it overflows left into the empty space
            beside Remaining rather than wrapping and growing the card. */}
        <div className="flex h-full flex-col items-end justify-center pt-2">
          {!editingPaid && (
            <>
              <div className="flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap">
                <button
                  type="button"
                  onClick={openHistory}
                  className="rounded-lg border border-[#d8c7e8] bg-[#eee4f7] px-3.5 py-2 text-sm font-medium text-[#76558f] transition hover:bg-[#e4d5f1]"
                >
                  History
                </button>

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
              </div>

              {payInFullError && (
                <p className="mt-2 text-right text-xs text-red-600">
                  {payInFullError}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {historyOpen && (
        <div
          className="popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setHistoryOpen(false);
            }
          }}
        >
          <div className="popup-panel flex w-full max-w-sm flex-col max-h-[calc(100vh-3rem)] rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] shadow-xl">
            {/* Fixed header */}
            <div className="flex shrink-0 items-center gap-2 border-b border-[#f3b9cd] px-6 pb-4 pt-6">
              <h2 className="text-lg font-semibold tracking-tight text-[#26354d]">
                Payment history
              </h2>

              <button
                type="button"
                aria-label="About payment history"
                onClick={() =>
                  setHistoryHelpOpen(
                    (open) => !open
                  )
                }
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold transition ${
                  historyHelpOpen
                    ? "border-[#e8c96f] bg-[#ffe9a8] text-[#8a7440]"
                    : "border-[#e8c96f] bg-[#fff4c7] text-[#8a7440] hover:bg-[#ffefb0]"
                }`}
              >
                ?
              </button>
            </div>

            {/* Scrollable body */}
            <div className="help-popup-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              {historyHelpOpen ? (
                <div className="space-y-3 text-sm leading-6 text-[#647086]">
                  <p>
                    Everything that has moved money
                    through <strong>{name}</strong>,
                    newest first (last 10).
                  </p>

                  <p>
                    <strong className="text-[#a94444]">
                      Red &minus;
                    </strong>{" "}
                    money left this head.{" "}
                    <strong className="text-emerald-700">
                      Green +
                    </strong>{" "}
                    money came in.
                  </p>

                  <div>
                    <p className="font-semibold text-[#26354d]">
                      The lines
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      <li>
                        <strong>Paid / Used</strong>{" "}
                        &mdash; you marked a bill
                        paid or logged a spend.
                      </li>
                      <li>
                        <strong>
                          Paid / Used reduced
                        </strong>{" "}
                        &mdash; you corrected the
                        amount down.
                      </li>
                      <li>
                        <strong>
                          Received from / Sent to a
                          head
                        </strong>{" "}
                        &mdash; a fund move between
                        budget heads.
                      </li>
                      <li>
                        <strong>
                          Received from Spending Pool
                        </strong>{" "}
                        &mdash; leftover daily-spending
                        money you moved in.
                      </li>
                    </ul>
                  </div>

                  <p>
                    <strong>
                      &ldquo;for [month]&rdquo;
                    </strong>{" "}
                    &mdash; which month the entry
                    belongs to.
                  </p>

                  <p>
                    <strong>The &times;</strong>{" "}
                    removes a{" "}
                    <em>Paid / Used</em> line from
                    this list only &mdash; your Paid /
                    Used total and Remaining
                    don&apos;t change. Fund moves and
                    pool top-ups have no &times;: undo
                    them from Recent Moves or Move
                    remaining and they leave here on
                    their own.
                  </p>
                </div>
              ) : historyLoading ? (
                <p className="text-sm text-[#647086]">
                  Loading...
                </p>
              ) : history &&
                history.length > 0 ? (
                <div className="space-y-1.5">
                  {history.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-2 rounded-lg bg-[#ffe8f0] px-3 py-2 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="text-[#26354d]">
                          {entry.label}
                        </span>
                        <span className="ml-1.5 text-xs text-[#8a94a6]">
                          {shortDate(
                            entry.createdAt
                          )}
                          {entry.forMonth &&
                            ` · for ${monthLabel(
                              entry.forMonth
                            )}`}
                        </span>
                      </span>

                      <span className="flex shrink-0 items-center gap-2">
                        <span
                          className={`font-semibold ${
                            entry.amount < 0
                              ? "text-[#a94444]"
                              : "text-emerald-700"
                          }`}
                        >
                          {entry.amount < 0
                            ? "−"
                            : "+"}
                          ₹
                          {Math.abs(
                            entry.amount
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </span>

                        {entry.id && (
                          <button
                            type="button"
                            aria-label="Remove from history"
                            onClick={() =>
                              setHistoryDeleteTarget(
                                entry
                              )
                            }
                            className="flex h-5 w-5 items-center justify-center rounded-full text-[#a08699] transition hover:bg-[#ffdce9] hover:text-[#7a2f2f]"
                          >
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.6"
                              strokeLinecap="round"
                              aria-hidden="true"
                            >
                              <path d="M6 6l12 12M18 6L6 18" />
                            </svg>
                          </button>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#647086]">
                  No payments recorded for this head
                  yet.
                </p>
              )}
            </div>

            {/* Fixed footer */}
            <div className="flex shrink-0 justify-end gap-2 border-t border-[#f3b9cd] px-6 pb-6 pt-4">
              {historyHelpOpen && (
                <button
                  type="button"
                  onClick={() =>
                    setHistoryHelpOpen(false)
                  }
                  className="rounded-lg border border-[#f3b9cd] px-4 py-2 text-sm font-medium text-[#647086] hover:bg-[#ffe8f0]"
                >
                  &larr; Back
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setHistoryOpen(false)
                }
                className="rounded-lg border border-[#f3b9cd] px-4 py-2 text-sm font-medium text-[#647086] hover:bg-[#ffe8f0]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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
                  onClick={() =>
                    setUndoConfirmOpen(true)
                  }
                  disabled={undoingTransfer}
                  className="text-xs font-medium text-zinc-500 underline underline-offset-4 hover:text-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
                >
                  {undoingTransfer
                    ? "Undoing..."
                    : "Undo"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setClearConfirmOpen(true)
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

      <ConfirmDialog
        open={undoConfirmOpen}
        title="Undo this fund move?"
        message={
          recentTransfer
            ? `₹${recentTransfer.amount.toLocaleString(
                "en-IN"
              )} ${
                recentTransfer.direction === "out"
                  ? `from ${name} to ${recentTransfer.otherHeadName}`
                  : `from ${recentTransfer.otherHeadName} to ${name}`
              }\n\nThis restores both budget heads to their balances before the move.`
            : ""
        }
        confirmLabel="Undo move"
        busyLabel="Undoing..."
        tone="warning"
        busy={undoingTransfer}
        onConfirm={handleUndoTransfer}
        onCancel={() => setUndoConfirmOpen(false)}
      />

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear this move from the card?"
        message={
          recentTransfer
            ? `₹${recentTransfer.amount.toLocaleString(
                "en-IN"
              )} ${
                recentTransfer.direction === "out"
                  ? `from ${name} to ${recentTransfer.otherHeadName}`
                  : `from ${recentTransfer.otherHeadName} to ${name}`
              }\n\nThe move itself is NOT removed and balances do not change — this only hides it from this card. You cannot bring it back to the card afterwards.`
            : ""
        }
        confirmLabel="Clear from card"
        tone="danger"
        onConfirm={handleClearRecentTransfer}
        onCancel={() => setClearConfirmOpen(false)}
      />

      <ConfirmDialog
        open={historyDeleteTarget !== null}
        title="Remove from history?"
        message={
          historyDeleteTarget
            ? `${
                historyDeleteTarget.label
              } · ${
                historyDeleteTarget.amount < 0
                  ? "−"
                  : "+"
              }₹${Math.abs(
                historyDeleteTarget.amount
              ).toLocaleString(
                "en-IN"
              )}\n\nThis only removes the line from this list. Your Paid / Used amount and balance don't change.`
            : ""
        }
        confirmLabel="Remove"
        busyLabel="Removing..."
        tone="danger"
        busy={historyDeleting}
        onConfirm={handleDeleteHistoryEntry}
        onCancel={() =>
          setHistoryDeleteTarget(null)
        }
      />
    </div>
  );
}
