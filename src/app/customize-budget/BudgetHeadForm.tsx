"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  createBudgetHead,
  updateBudgetHead,
  activateBudgetHead,
  deactivateBudgetHead,
  deleteBudgetHead,
} from "@/app/dashboard/actions";

type BudgetHead = {
  id: string;
  name: string;
  headType: string;
  allocation: string;
};

type Props = {
  mode?: "create" | "edit";
  budgetHead?: BudgetHead;
  isActive?: boolean;
};

const HEAD_TYPES = [
  "Fixed Expense",
  "Investment",
  "Saving",
  "Other",
];

export default function BudgetHeadForm({
  mode = "create",
  budgetHead,
  isActive = true,
}: Props) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [name, setName] = useState(
    budgetHead?.name ?? ""
  );

  const [headType, setHeadType] = useState(
    budgetHead?.headType ?? "Fixed Expense"
  );

  const [allocation, setAllocation] =
    useState(
      budgetHead?.allocation ?? ""
    );

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSave() {
    setError("");
    setIsSaving(true);

    let result;

    if (mode === "create") {
      result = await createBudgetHead(
        name,
        headType,
        allocation
      );
    } else {
      if (!budgetHead) {
        setError(
          "Budget head could not be identified."
        );
        setIsSaving(false);
        return;
      }

      result = await updateBudgetHead(
        budgetHead.id,
        name,
        headType,
        allocation
      );
    }

    if (!result.success) {
      setError(
        result.error ??
          "Something went wrong."
      );
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setIsOpen(false);

    if (mode === "create") {
      setName("");
      setHeadType("Fixed Expense");
      setAllocation("");
    }

    router.refresh();
  }

  async function handleDeactivate() {
    if (!budgetHead) {
      return;
    }

    const confirmed =
      window.confirm(
        `Deactivate "${budgetHead.name}"?\n\nIt will be removed from the current dashboard, but you can activate it again later.`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setIsSaving(true);

    const result =
      await deactivateBudgetHead(
        budgetHead.id
      );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to deactivate budget head."
      );
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    router.refresh();
  }

  async function handleActivate() {
    if (!budgetHead) {
      return;
    }

    setError("");
    setIsSaving(true);

    const result =
      await activateBudgetHead(
        budgetHead.id
      );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to activate budget head."
      );
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!budgetHead) {
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to permanently delete "${budgetHead.name}"?\n\nThis will permanently remove this budget head and its associated monthly records. This action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setIsSaving(true);

    const result =
      await deleteBudgetHead(
        budgetHead.id
      );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to delete budget head."
      );
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    router.refresh();
  }

  /*
   * CREATE MODE
   */
  if (mode === "create") {
    if (!isOpen) {
      return (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full rounded-2xl border-2 border-dashed border-[#f3b9cd] bg-[#ffdce9] px-5 py-4 text-sm font-semibold text-[#c4567d] transition hover:bg-[#ffe8f0]"
        >
          + Add Budget Head
        </button>
      );
    }

    return (
      <div className="rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#26354d]">
          Add Budget Head
        </h2>

        <p className="mt-1 text-sm text-[#647086]">
          This becomes available for future
          monthly budgets.
        </p>

        <FormFields
          name={name}
          setName={setName}
          headType={headType}
          setHeadType={setHeadType}
          allocation={allocation}
          setAllocation={setAllocation}
          error={error}
          isSaving={isSaving}
          onSave={handleSave}
          onCancel={() => {
            setIsOpen(false);
            setError("");
          }}
        />
      </div>
    );
  }

  /*
   * EDIT MODE — FORM OPEN
   */
  if (isOpen) {
    return (
      <div className="w-full sm:max-w-md">
        <FormFields
          name={name}
          setName={setName}
          headType={headType}
          setHeadType={setHeadType}
          allocation={allocation}
          setAllocation={setAllocation}
          error={error}
          isSaving={isSaving}
          onSave={handleSave}
          onCancel={() => {
            setIsOpen(false);
            setError("");
          }}
        />
      </div>
    );
  }

  /*
   * EDIT MODE — CLOSED
   */
  return (
    <div className="flex flex-wrap items-start gap-2">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={isSaving}
        className="rounded-xl border border-[#c9ddea] bg-[#f8fcff] px-4 py-2 text-sm font-medium text-[#3978a5] transition hover:bg-[#cfeeff] disabled:opacity-50"
      >
        Edit
      </button>

      {isActive ? (
        <button
          type="button"
          onClick={handleDeactivate}
          disabled={isSaving}
          className="rounded-xl border border-[#f3b9cd] bg-[#ffe8f0] px-4 py-2 text-sm font-medium text-[#c4567d] transition hover:bg-[#ffdce9] disabled:opacity-50"
        >
          Deactivate
        </button>
      ) : (
        <button
          type="button"
          onClick={handleActivate}
          disabled={isSaving}
          className="rounded-xl border border-[#b9dfca] bg-[#e7f8ee] px-4 py-2 text-sm font-medium text-[#3c7d58] transition hover:bg-[#d9f2e3] disabled:opacity-50"
        >
          Activate
        </button>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={isSaving}
        className="rounded-xl border border-[#e4b4b4] bg-[#fff1f1] px-4 py-2 text-sm font-medium text-[#a94444] transition hover:bg-[#ffe4e4] disabled:opacity-50"
      >
        Delete
      </button>

      {error && (
        <div className="basis-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

type FormFieldsProps = {
  name: string;
  setName: (value: string) => void;
  headType: string;
  setHeadType: (value: string) => void;
  allocation: string;
  setAllocation: (value: string) => void;
  error: string;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
};

function FormFields({
  name,
  setName,
  headType,
  setHeadType,
  allocation,
  setAllocation,
  error,
  isSaving,
  onSave,
  onCancel,
}: FormFieldsProps) {
  return (
    <div className="mt-5 space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-[#34445e]">
          Name
        </label>

        <input
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          placeholder="e.g. Electricity"
          className="w-full rounded-xl border border-[#c9ddea] bg-[#f8fcff] px-4 py-3 text-[#26354d] outline-none focus:border-[#4f8fbd] focus:ring-4 focus:ring-[#cfeeff]"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[#34445e]">
          Type
        </label>

        <select
          value={headType}
          onChange={(e) =>
            setHeadType(e.target.value)
          }
          className="w-full rounded-xl border border-[#c9ddea] bg-[#f8fcff] px-4 py-3 text-[#26354d] outline-none focus:border-[#4f8fbd] focus:ring-4 focus:ring-[#cfeeff]"
        >
          {HEAD_TYPES.map((type) => (
            <option
              key={type}
              value={type}
            >
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[#34445e]">
          Default Monthly Allocation
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={allocation}
          onChange={(e) =>
            setAllocation(e.target.value)
          }
          placeholder="0"
          className="w-full rounded-xl border border-[#c9ddea] bg-[#f8fcff] px-4 py-3 text-[#26354d] outline-none focus:border-[#4f8fbd] focus:ring-4 focus:ring-[#cfeeff]"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="rounded-xl bg-[#4f8fbd] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3978a5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? "Saving..."
            : "Save"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-xl border border-[#c9ddea] bg-[#f8fcff] px-5 py-2.5 text-sm font-medium text-[#465671] transition hover:bg-[#cfeeff]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}