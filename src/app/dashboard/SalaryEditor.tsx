"use client";

import { useState } from "react";
import { updateSalary } from "./actions";

type SalaryEditorProps = {
  monthlyBudgetId: string;
  salary: number;
};

export default function SalaryEditor({
  monthlyBudgetId,
  salary,
}: SalaryEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(salary));
  const [error, setError] = useState("");

  if (!editing) {
    return (
      <div>
        <p className="text-sm text-zinc-500">
          Salary
        </p>

        <p className="mt-2 text-2xl font-semibold">
          ₹{salary.toLocaleString("en-IN")}
        </p>

        <button
          type="button"
          onClick={() => {
            setValue(String(salary));
            setError("");
            setEditing(true);
          }}
          className="mt-3 text-sm font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-950"
        >
          Edit Salary
        </button>
      </div>
    );
  }

  async function handleSave() {
    setError("");

    const result = await updateSalary(
      monthlyBudgetId,
      value
    );

    if (!result.success) {
      setError(
        result.error ?? "Unable to update salary."
      );
      return;
    }

    setEditing(false);
  }

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Salary
      </p>

      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(event) =>
          setValue(event.target.value)
        }
        className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-xl font-semibold outline-none focus:border-zinc-500"
      />

      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Save
        </button>

        <button
          type="button"
          onClick={() => {
            setValue(String(salary));
            setError("");
            setEditing(false);
          }}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
