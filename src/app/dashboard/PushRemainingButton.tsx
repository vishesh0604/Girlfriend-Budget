"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  pushRemainingToNextMonth,
  reversePushToNextMonth,
  reverseAllPushesToNextMonth,
} from "./actions";

type PushHead = {
  id: string;
  name: string;
  remaining: number;
};

type PushRemainingButtonProps = {
  monthlyBudgetId: string;
  heads: PushHead[];
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function PushRemainingButton({
  monthlyBudgetId,
  heads,
}: PushRemainingButtonProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [selectedHeadIds, setSelectedHeadIds] =
    useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reverseConfirmOpen, setReverseConfirmOpen] =
    useState(false);
  const [reverseAllConfirmOpen, setReverseAllConfirmOpen] =
    useState(false);

  function handleOpen() {
    setSelectedHeadIds([]);
    setError("");
    setReverseConfirmOpen(false);
    setReverseAllConfirmOpen(false);
    setOpen(true);
  }

  function handleClose() {
    if (loading) return;

    setOpen(false);
    setSelectedHeadIds([]);
    setError("");
    setReverseConfirmOpen(false);
    setReverseAllConfirmOpen(false);
  }

  async function handleConfirm() {
    if (selectedHeadIds.length === 0) {
      setError("Please select at least one budget head.");
      return;
    }

    setError("");
    setLoading(true);

    for (const headId of selectedHeadIds) {
      const result =
        await pushRemainingToNextMonth(
          monthlyBudgetId,
          headId
        );

      if (!result.success) {
        setError(
          result.error ??
            "Unable to push one or more remaining amounts."
        );
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setOpen(false);
    setSelectedHeadIds([]);

    router.refresh();
  }

  async function handleReverseConfirm() {
    if (selectedHeadIds.length === 0) {
      setError("Please select at least one budget head.");
      setReverseConfirmOpen(false);
      return;
    }

    setError("");
    setLoading(true);

    for (const headId of selectedHeadIds) {
      const result =
        await reversePushToNextMonth(
          monthlyBudgetId,
          headId
        );

      if (!result.success) {
        setError(
          result.error ??
            "Unable to reverse one or more pushes."
        );
        setLoading(false);
        setReverseConfirmOpen(false);
        return;
      }
    }

    setLoading(false);
    setReverseConfirmOpen(false);
    setOpen(false);
    setSelectedHeadIds([]);

    router.refresh();
  }

  async function handleReverseAllConfirm() {
    setError("");
    setLoading(true);

    const result =
      await reverseAllPushesToNextMonth(
        monthlyBudgetId
      );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to reverse all pushes."
      );
      setLoading(false);
      setReverseAllConfirmOpen(false);
      return;
    }

    setLoading(false);
    setReverseAllConfirmOpen(false);
    setOpen(false);
    setSelectedHeadIds([]);

    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100"
      >
        Push remaining amount →
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleClose();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">
                Push remaining amount
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Select the budget heads whose remaining
                amounts you want to push to the next month.
              </p>
            </div>

            <div className="mt-5 space-y-2">
              {heads
                .filter(
                  (head) => head.remaining > 0
                )
                .map((head) => {
                  const selected =
                    selectedHeadIds.includes(
                      head.id
                    );

                  return (
                    <button
                      key={head.id}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setSelectedHeadIds(
                          (current) =>
                            current.includes(head.id)
                              ? current.filter(
                                  (id) =>
                                    id !== head.id
                                )
                              : [
                                  ...current,
                                  head.id,
                                ]
                        );
                      }}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        selected
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-zinc-200 bg-white hover:bg-zinc-50"
                      } ${
                        loading
                          ? "cursor-not-allowed opacity-60"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                            selected
                              ? "border-emerald-600"
                              : "border-zinc-300"
                          }`}
                        >
                          {selected && (
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                          )}
                        </span>

                        <span className="text-sm font-medium">
                          {head.name}
                        </span>
                      </div>

                      <span className="text-sm font-semibold">
                        {formatCurrency(
                          head.remaining
                        )}
                      </span>
                    </button>
                  );
                })}
            </div>

            {selectedHeadIds.length > 0 && (
              <div className="mt-4 rounded-xl bg-zinc-50 px-4 py-3">
                <p className="text-xs text-zinc-500">
                  Selected
                </p>

                <p className="mt-1 text-sm font-semibold text-zinc-950">
                  {selectedHeadIds.length} budget head
                  {selectedHeadIds.length === 1
                    ? ""
                    : "s"}{" "}
                  selected
                </p>
              </div>
            )}

            {error && (
              <p className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  setReverseAllConfirmOpen(true)
                }
                disabled={loading}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                Reverse Push All
              </button>

              <button
                type="button"
                onClick={() =>
                  setReverseConfirmOpen(true)
                }
                disabled={
                  selectedHeadIds.length === 0 ||
                  loading
                }
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                Reverse Push
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={
                  selectedHeadIds.length === 0 ||
                  loading
                }
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {loading
                  ? "Pushing..."
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reverseConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-950">
              Reverse Push?
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              This will remove the pushed amounts from
              the selected budget heads in the next month
              and restore their carry-forward to ₹0.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setReverseConfirmOpen(false)
                }
                disabled={loading}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReverseConfirm}
                disabled={loading}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {loading
                  ? "Reversing..."
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reverseAllConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-950">
              Reverse All Pushes?
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              This will remove{" "}
              <strong>all carry-forward amounts</strong>{" "}
              from the next month for every budget head.
              Your current month will not be changed.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setReverseAllConfirmOpen(false)
                }
                disabled={loading}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReverseAllConfirm}
                disabled={loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {loading
                  ? "Reversing..."
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
