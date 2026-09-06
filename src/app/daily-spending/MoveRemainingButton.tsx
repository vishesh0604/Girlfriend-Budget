"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useRefresh } from "@/components/RefreshProvider";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  createSpendingMove,
  deleteSpendingMove,
} from "./actions";

type FixedHead = {
  id: string;
  name: string;
};

type ExistingMove = {
  id: string;
  amount: number;
  label: string;
};

type MoveRemainingButtonProps = {
  monthStart: string;
  remaining: number;
  fixedHeads: FixedHead[];
  moves: ExistingMove[];
};

const NEXT_MONTH_VALUE = "next_month";

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function MoveRemainingButton({
  monthStart,
  remaining,
  fixedHeads,
  moves,
}: MoveRemainingButtonProps) {
  const router = useRouter();

  const { refreshing, runRefresh } =
    useRefresh();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState(
    NEXT_MONTH_VALUE
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [undoTarget, setUndoTarget] =
    useState<ExistingMove | null>(null);
  const [undoing, setUndoing] = useState(false);

  const busy = saving || undoing || refreshing;

  function handleOpen() {
    setOpen(true);
    setAmount("");
    setDestination(NEXT_MONTH_VALUE);
    setError("");
  }

  function handleClose() {
    if (busy) {
      return;
    }

    setOpen(false);
  }

  async function handleMove() {
    setError("");
    setSaving(true);

    const isHead =
      destination !== NEXT_MONTH_VALUE;

    const result = await createSpendingMove(
      monthStart,
      amount,
      isHead
        ? "budget_head"
        : "next_month",
      isHead ? destination : null
    );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to move the money."
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    setAmount("");

    runRefresh(() => {
      router.refresh();
    });
  }

  async function handleUndo() {
    if (!undoTarget) {
      return;
    }

    setUndoing(true);

    const result = await deleteSpendingMove(
      undoTarget.id
    );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to undo the move."
      );
      setUndoing(false);
      setUndoTarget(null);
      return;
    }

    setUndoing(false);
    setUndoTarget(null);

    runRefresh(() => {
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-xl border border-[#c9ddea] bg-[#f8fcff] px-4 py-2 text-sm font-medium text-[#3978a5] shadow-sm transition hover:bg-[#eaf5fc]"
      >
        Move remaining
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
          <div className="w-full max-w-lg max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-6 shadow-xl">
            <h2 className="text-lg font-semibold tracking-tight text-[#26354d]">
              Move remaining
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#647086]">
              Send leftover Spending Pool money to next
              month, or into a Fixed Expenses budget head.
              It never changes your allocations.
            </p>

            <p className="mt-3 text-sm text-[#26354d]">
              Available to move:{" "}
              <span className="font-semibold">
                {formatCurrency(
                  Math.max(remaining, 0)
                )}
              </span>
            </p>

            {moves.length > 0 && (
              <div className="mt-4 space-y-2">
                {moves.map((move) => (
                  <div
                    key={move.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#f3b9cd] bg-[#ffe8f0] px-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 text-[#26354d]">
                      <span className="font-semibold">
                        {formatCurrency(
                          move.amount
                        )}
                      </span>{" "}
                      to {move.label}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setUndoTarget(move)
                      }
                      disabled={busy}
                      className="shrink-0 text-xs font-medium text-[#a94444] underline underline-offset-4 hover:text-[#7a2f2f] disabled:cursor-not-allowed disabled:text-zinc-400"
                    >
                      Undo
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-2 rounded-xl border border-[#f3b9cd] bg-[#ffe8f0] p-3">
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
                  Move to
                </label>

                <select
                  value={destination}
                  onChange={(event) =>
                    setDestination(
                      event.target.value
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-[#c9ddea] bg-[#f8fcff] px-3 py-2 text-sm outline-none focus:border-[#4f8fbd]"
                >
                  <option value={NEXT_MONTH_VALUE}>
                    Next month&apos;s spending pool
                  </option>

                  {fixedHeads.map((head) => (
                    <option
                      key={head.id}
                      value={head.id}
                    >
                      {head.name} (Fixed Expenses)
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="text-xs text-red-600">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleMove}
                disabled={
                  busy ||
                  !amount.trim() ||
                  remaining <= 0
                }
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {saving
                  ? "Moving..."
                  : refreshing
                  ? "Updating..."
                  : "Move"}
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                className="rounded-lg border border-[#f3b9cd] px-4 py-2 text-sm font-medium text-[#647086] hover:bg-[#ffe8f0] disabled:cursor-not-allowed disabled:text-zinc-400"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={undoTarget !== null}
        title="Undo this move?"
        message={
          undoTarget
            ? `${formatCurrency(
                undoTarget.amount
              )} to ${
                undoTarget.label
              }\n\nThe money returns to this month's remaining balance.`
            : ""
        }
        confirmLabel="Undo move"
        busyLabel="Undoing..."
        tone="warning"
        busy={undoing}
        onConfirm={handleUndo}
        onCancel={() => setUndoTarget(null)}
      />
    </>
  );
}
