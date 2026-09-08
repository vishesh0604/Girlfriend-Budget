"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Reorder } from "motion/react";

import { useRefresh } from "@/components/RefreshProvider";
import { reorderBudgetHeads } from "@/app/dashboard/actions";

type Head = {
  id: string;
  name: string;
};

export default function ReorderHeadsButton({
  heads,
}: {
  heads: Head[];
}) {
  const router = useRouter();
  const { runRefresh } = useRefresh();

  const [open, setOpen] = useState(false);
  const [order, setOrder] =
    useState<Head[]>(heads);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleOpen() {
    setOrder(heads);
    setError("");
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const result = await reorderBudgetHeads(
      order.map((head) => head.id)
    );

    setSaving(false);

    if (!result.success) {
      setError(
        result.error ??
          "Could not save the new order."
      );
      return;
    }

    setOpen(false);
    runRefresh(() => router.refresh());
  }

  if (heads.length < 2) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="shrink-0 rounded-xl border border-[#d8c7e8] bg-[#eee4f7] px-4 py-2 text-sm font-medium text-[#76558f] shadow-sm transition hover:bg-[#e4d5f1]"
      >
        Reorder heads
      </button>

      {open && (
        <div
          className="popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setOpen(false);
            }
          }}
        >
          <div className="popup-panel flex w-full max-w-sm flex-col max-h-[calc(100vh-3rem)] rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] shadow-xl">
            {/* Fixed header */}
            <div className="shrink-0 border-b border-[#f3b9cd] px-6 pb-4 pt-6">
              <h2 className="text-lg font-semibold tracking-tight text-[#26354d]">
                Reorder budget heads
              </h2>

              <p className="mt-1 text-sm leading-6 text-[#647086]">
                Drag to change the order they appear
                on the Fixed Expenses page.
              </p>
            </div>

            {/* Scrollable list */}
            <div className="help-popup-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              <Reorder.Group
                axis="y"
                values={order}
                onReorder={setOrder}
                className="space-y-2"
              >
                {order.map((head) => (
                  <Reorder.Item
                    key={head.id}
                    value={head}
                    className="flex cursor-grab select-none items-center gap-3 rounded-xl border border-[#f3b9cd] bg-[#ffe8f0] px-3 py-2.5 text-sm text-[#26354d] shadow-sm active:cursor-grabbing"
                  >
                    <span
                      aria-hidden="true"
                      className="text-base leading-none text-[#b9879b]"
                    >
                      ⠿
                    </span>
                    <span className="truncate">
                      {head.name}
                    </span>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>

            {/* Fixed footer */}
            <div className="shrink-0 border-t border-[#f3b9cd] px-6 pb-6 pt-4">
              {error && (
                <p className="mb-2 text-xs text-red-600">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-[#f3b9cd] px-4 py-2 text-sm font-medium text-[#647086] hover:bg-[#ffe8f0]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-[#76558f] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#634978] disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {saving
                    ? "Saving..."
                    : "Save order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
