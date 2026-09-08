"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import ConfirmDialog from "@/components/ConfirmDialog";
import { useRefresh } from "@/components/RefreshProvider";
import {
  createSpendingCategory,
  updateSpendingCategory,
  deleteSpendingCategory,
} from "./actions";
import {
  CATEGORY_COLOR_PRESETS,
  readableTextOn,
} from "./categoryColors";

type Category = {
  id: string;
  name: string;
  isDefault: boolean;
  color: string | null;
  entryCount: number;
};

type ManageCategoriesButtonProps = {
  categories: Category[];
};

export default function ManageCategoriesButton({
  categories,
}: ManageCategoriesButtonProps) {
  const router = useRouter();

  const { runRefresh } = useRefresh();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");

  const [editingId, setEditingId] = useState<
    string | null
  >(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<
    string | null
  >(null);
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] =
    useState<Category | null>(null);
  const [deleteError, setDeleteError] =
    useState("");

  // Optimistic overlays so the list reacts the instant you act, while
  // the write + refresh run in the background.
  const [nameColorOverrides, setNameColorOverrides] =
    useState<
      Record<
        string,
        { name: string; color: string | null }
      >
    >({});
  const [addedTemp, setAddedTemp] = useState<
    Category[]
  >([]);
  const [removedIds, setRemovedIds] = useState<
    string[]
  >([]);

  const displayCategories: Category[] = [
    ...categories,
    ...addedTemp,
  ]
    .filter(
      (category) =>
        !removedIds.includes(category.id)
    )
    .map((category) => {
      const override =
        nameColorOverrides[category.id];

      return override
        ? { ...category, ...override }
        : category;
    });

  function handleOpen() {
    setOpen(true);
    setNewName("");
    setAddError("");
    setEditingId(null);
    setEditError("");
    setDeleteTarget(null);
    setDeleteError("");
  }

  function handleClose() {
    setOpen(false);
  }

  function handleAdd() {
    const name = newName.trim();

    if (!name || pending) {
      return;
    }

    const tempId = `temp-${Date.now()}`;

    setAddedTemp((current) => [
      ...current,
      {
        id: tempId,
        name,
        isDefault: false,
        color: null,
        entryCount: 0,
      },
    ]);
    setNewName("");
    setAddError("");
    setPending(true);

    runRefresh(async () => {
      const result =
        await createSpendingCategory(name);

      setPending(false);

      if (!result.success) {
        setAddedTemp((current) =>
          current.filter(
            (item) => item.id !== tempId
          )
        );
        setAddError(
          result.error ??
            "Unable to add category."
        );
        return;
      }

      router.refresh();
      setAddedTemp((current) =>
        current.filter(
          (item) => item.id !== tempId
        )
      );
    });
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
    setEditError("");
  }

  function handleSaveEdit() {
    if (!editingId || pending) {
      return;
    }

    const id = editingId;
    const name = editName.trim();
    const color = editColor;

    setNameColorOverrides((current) => ({
      ...current,
      [id]: { name, color },
    }));
    setEditingId(null);
    setEditError("");
    setPending(true);

    runRefresh(async () => {
      const result =
        await updateSpendingCategory(
          id,
          editName,
          color
        );

      setPending(false);

      if (!result.success) {
        setNameColorOverrides((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        setEditError(
          result.error ??
            "Unable to update category."
        );
        return;
      }

      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget || pending) {
      return;
    }

    const id = deleteTarget.id;

    setRemovedIds((current) => [
      ...current,
      id,
    ]);
    setDeleteTarget(null);
    setDeleteError("");
    setPending(true);

    runRefresh(async () => {
      const result =
        await deleteSpendingCategory(id);

      setPending(false);

      if (!result.success) {
        setRemovedIds((current) =>
          current.filter(
            (value) => value !== id
          )
        );
        setDeleteError(
          result.error ??
            "Unable to delete category."
        );
        return;
      }

      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-xl border border-[#f3b9cd] bg-[#ffdce9] px-4 py-2 text-sm font-medium text-[#c4567d] shadow-sm transition hover:bg-[#ffe8f0]"
      >
        Manage categories
      </button>

      {open && (
        <div
          className="popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              handleClose();
            }
          }}
        >
          <div className="popup-panel w-full max-w-lg max-h-[calc(100vh-3rem)] overflow-hidden rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] shadow-xl">
            <div className="help-popup-scrollbar max-h-[calc(100vh-3rem)] overflow-y-auto overscroll-contain p-6">
              <h2 className="text-lg font-semibold tracking-tight text-[#26354d]">
                Manage categories
              </h2>

              <p className="mt-1 text-sm leading-6 text-[#647086]">
                Categories are labels for your expenses. Give one a
                colour and it shows on that category everywhere — the
                Activity list and the By category chart. Deleting one
                moves its expenses to Miscellaneous — the expenses are
                kept.
              </p>

              {/* Add */}
              <div className="mt-5">
                <label className="text-xs font-medium text-[#647086]">
                  New category
                </label>

                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(event) =>
                      setNewName(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Groceries"
                    className="min-w-0 flex-1 rounded-lg border border-[#c9ddea] bg-[#f8fcff] px-3 py-2 text-sm outline-none focus:border-[#4f8fbd]"
                  />

                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!newName.trim()}
                    className="shrink-0 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                  >
                    Add
                  </button>
                </div>

                {addError && (
                  <p className="mt-2 text-xs text-red-600">
                    {addError}
                  </p>
                )}
              </div>

              {/* List */}
              <div className="mt-5 space-y-2">
                {displayCategories.map((category) => {
                  const isEditing =
                    editingId === category.id;
                  const isTemp =
                    category.id.startsWith(
                      "temp-"
                    );

                  return (
                    <div
                      key={category.id}
                      className={`rounded-xl border border-[#f3b9cd] bg-[#ffe8f0] px-3 py-2.5 ${
                        isTemp
                          ? "opacity-60"
                          : ""
                      }`}
                    >
                      {isEditing ? (
                        <div>
                          <input
                            type="text"
                            value={editName}
                            onChange={(event) =>
                              setEditName(
                                event.target
                                  .value
                              )
                            }
                            className="w-full rounded-lg border border-[#c9ddea] bg-[#f8fcff] px-3 py-2 text-sm outline-none focus:border-[#4f8fbd]"
                          />

                          <p className="mt-3 text-xs font-medium text-[#647086]">
                            Colour
                          </p>

                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setEditColor(null)
                              }
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                                editColor === null
                                  ? "border-[#26354d] bg-[#26354d] text-white"
                                  : "border-[#c9ddea] bg-[#f8fcff] text-[#647086] hover:bg-white"
                              }`}
                            >
                              Auto
                            </button>

                            {CATEGORY_COLOR_PRESETS.map(
                              (preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  aria-label={`Use ${preset}`}
                                  onClick={() =>
                                    setEditColor(
                                      preset
                                    )
                                  }
                                  style={{
                                    backgroundColor:
                                      preset,
                                  }}
                                  className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
                                    editColor ===
                                    preset
                                      ? "ring-2 ring-[#26354d] ring-offset-2 ring-offset-[#ffe8f0]"
                                      : "ring-1 ring-black/10"
                                  }`}
                                >
                                  {editColor ===
                                    preset && (
                                    <span
                                      className="text-xs font-bold"
                                      style={{
                                        color:
                                          readableTextOn(
                                            preset
                                          ),
                                      }}
                                    >
                                      ✓
                                    </span>
                                  )}
                                </button>
                              )
                            )}
                          </div>

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={
                                handleSaveEdit
                              }
                              disabled={
                                !editName.trim()
                              }
                              className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                            >
                              Save
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(
                                  null
                                );
                                setEditError(
                                  ""
                                );
                              }}
                              className="rounded-lg border border-[#f3b9cd] px-3 py-1.5 text-xs font-medium text-[#647086] hover:bg-[#ffdce9]"
                            >
                              Cancel
                            </button>
                          </div>

                          {editError && (
                            <p className="mt-2 text-xs text-red-600">
                              {editError}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              aria-hidden="true"
                              className={`h-3 w-3 shrink-0 rounded-full ${
                                category.color
                                  ? ""
                                  : "border border-dashed border-[#b9879b]"
                              }`}
                              style={
                                category.color
                                  ? {
                                      backgroundColor:
                                        category.color,
                                    }
                                  : undefined
                              }
                            />

                            <span className="truncate text-sm font-medium text-[#26354d]">
                              {category.name}
                            </span>

                            {category.isDefault && (
                              <span className="shrink-0 rounded-full bg-[#cfeeff] px-2 py-0.5 text-[10px] font-medium text-[#3978a5]">
                                Default
                              </span>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            {!isTemp && (
                              <button
                                type="button"
                                onClick={() =>
                                  startEdit(
                                    category
                                  )
                                }
                                className="text-xs font-medium text-[#3978a5] underline underline-offset-4 hover:text-[#26354d]"
                              >
                                Edit
                              </button>
                            )}

                            {!category.isDefault &&
                              !isTemp && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteError(
                                      ""
                                    );
                                    setDeleteTarget(
                                      category
                                    );
                                  }}
                                  className="text-xs font-medium text-[#a94444] underline underline-offset-4 hover:text-[#7a2f2f]"
                                >
                                  Delete
                                </button>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {deleteError && (
                <p className="mt-3 text-sm text-red-600">
                  {deleteError}
                </p>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-[#f3b9cd] px-4 py-2 text-sm font-medium text-[#647086] hover:bg-[#ffe8f0]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={
          deleteTarget
            ? `Delete "${deleteTarget.name}"?`
            : "Delete category?"
        }
        message={
          deleteTarget && deleteTarget.entryCount > 0
            ? `This category is used in ${deleteTarget.entryCount} expense${
                deleteTarget.entryCount === 1
                  ? ""
                  : "s"
              }. Those expenses stay, but they move to Miscellaneous.`
            : "This category has no expenses yet."
        }
        confirmLabel="Delete category"
        busyLabel="Deleting..."
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
