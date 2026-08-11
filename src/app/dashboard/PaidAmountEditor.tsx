"use client";

import { useState } from "react";
import { updateMonthlyHeadPaidAmount } from "./actions";

type PaidAmountEditorProps = {
  monthlyHeadId: string;
  paidAmount: number;
  allocatedAmount: number;
};

export default function PaidAmountEditor({
  monthlyHeadId,
  paidAmount,
  allocatedAmount,
}: PaidAmountEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    String(paidAmount)
  );
  const [error, setError] = useState("");

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-zinc-500">
            Paid / Used
          </p>

          <button
            type="button"
            onClick={() => {
              setValue(String(paidAmount));
              setError("");
              setEditing(true);
            }}
            className="text-xs font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-950"
          >
            Edit
          </button>
        </div>

        <p className="mt-1 font-medium">
          ₹{paidAmount.toLocaleString("en-IN")}
        </p>
      </div>
    );
  }

  async function handleSave() {
    setError("");

    const result =
      await updateMonthlyHeadPaidAmount(
        monthlyHeadId,
        value
      );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to update paid amount."
      );
      return;
    }

    setEditing(false);
  }

  return (
    <div>
      <p className="text-zinc-500">
        Paid / Used
      </p>

      <input
        type="number"
        min="0"
        max={allocatedAmount}
        step="1"
        value={value}
        onChange={(event) =>
          setValue(event.target.value)
        }
        className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium outline-none focus:border-zinc-500"
      />

      <p className="mt-1 text-xs text-zinc-500">
        Maximum: ₹
        {allocatedAmount.toLocaleString("en-IN")}
      </p>

      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
        >
          Save
        </button>

        <button
          type="button"
          onClick={() => {
            setValue(String(paidAmount));
            setError("");
            setEditing(false);
          }}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
