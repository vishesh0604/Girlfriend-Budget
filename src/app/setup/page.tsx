"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type BudgetHead = {
  id: string;
  name: string;
  head_type: string;
  default_monthly_allocation: number;
  is_active: boolean;
};

const HEAD_TYPES = [
  "Fixed Expense",
  "Investment",
  "Saving",
  "Other",
];

export default function SetupPage() {
  const supabase = createClient();

  const [heads, setHeads] = useState<BudgetHead[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("Fixed Expense");
  const [allocation, setAllocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadHeads() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be signed in.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("budget_heads")
      .select(
        "id, name, head_type, default_monthly_allocation, is_active"
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setHeads(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadHeads();
  }, []);

  async function handleAddHead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const amount = Number(allocation);

    if (!trimmedName) {
      setError("Please enter a budget head name.");
      return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      setError("Please enter a valid non-negative allocation.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be signed in.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("budget_heads").insert({
      user_id: user.id,
      name: trimmedName,
      head_type: type,
      default_monthly_allocation: amount,
      is_active: true,
    });

    if (error) {
      if (error.code === "23505") {
        setError("A budget head with that name already exists.");
      } else {
        setError(error.message);
      }

      setSaving(false);
      return;
    }

    setName("");
    setAllocation("");
    setType("Fixed Expense");
    setSuccess(`${trimmedName} added successfully.`);

    await loadHeads();

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <p className="text-sm font-medium text-zinc-500">
            Budget Setup
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Add your budget heads
          </h1>

          <p className="mt-2 max-w-xl text-sm text-zinc-600">
            Add the categories you want to use in your monthly budget.
            These remain editable later.
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Add Budget Head
          </h2>

          <form
            onSubmit={handleAddHead}
            className="mt-5 grid gap-4 sm:grid-cols-3"
          >
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium"
              >
                Name
              </label>

              <input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Electricity"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:border-zinc-600"
              />
            </div>

            <div>
              <label
                htmlFor="type"
                className="mb-2 block text-sm font-medium"
              >
                Type
              </label>

              <select
                id="type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 outline-none focus:border-zinc-600"
              >
                {HEAD_TYPES.map((headType) => (
                  <option key={headType} value={headType}>
                    {headType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="allocation"
                className="mb-2 block text-sm font-medium"
              >
                Monthly Allocation
              </label>

              <input
                id="allocation"
                type="number"
                min="0"
                step="0.01"
                value={allocation}
                onChange={(event) => setAllocation(event.target.value)}
                placeholder="3000"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:border-zinc-600"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Adding..." : "Add Budget Head"}
              </button>
            </div>
          </form>

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </p>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Current Budget Heads
            </h2>

            <span className="text-sm text-zinc-500">
              {heads.length} active
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500">
              Loading...
            </p>
          ) : heads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
              <p className="text-sm text-zinc-500">
                No budget heads have been added yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {heads.map((head) => (
                <div
                  key={head.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm"
                >
                  <div>
                    <p className="font-medium">{head.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {head.head_type}
                    </p>
                  </div>

                  <p className="font-medium">
                    ₹
                    {Number(
                      head.default_monthly_allocation
                    ).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
