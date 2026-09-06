"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import ConfirmDialog from "@/components/ConfirmDialog";
import {
  createSpendingCategory,
  renameSpendingCategory,
  deleteSpendingCategory,
} from "./actions";

type Category = {
  id: string;
  name: string;
  isDefault: boolean;
  entryCount: number;
};

type ManageCategoriesButtonProps = {
  categories: Category[];
};

export default function ManageCategoriesButton({
  categories,
}: ManageCategoriesButtonProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [editingId, setEditingId] = useState<
    string | null
  >(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] =
    useState(false);
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] =
    useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] =
    useState("");

  const busy =
    adding || savingEdit || deleting;

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
    if (busy) {
      return;
    }

    setOpen(false);
  }

  async function handleAdd() {
    setAddError("");
    setAdding(true);

    const result = await createSpendingCategory(
      newName
    );

    if (!result.success) {
      setAddError(
        result.error ??
          "Unable to add category."
      );
      setAdding(false);
      return;
    }

    setNewName("");
    setAdding(false);
    router.refresh();
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditError("");
  }

  async function handleRename() {
    if (!editingId) {
      return;
    }

    setEditError("");
    setSavingEdit(true);

    const result =
      await renameSpendingCategory(
        editingId,
        editName
      );

    if (!result.success) {
      setEditError(
        result.error ??
          "Unable to rename category."
      );
      setSavingEdit(false);
      return;
    }

    setEditingId(null);
    setSavingEdit(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleteError("");
    setDeleting(true);

    const result =
      await deleteSpendingCategory(
        deleteTarget.id
      );

    if (!result.success) {
      setDeleteError(
        result.error ??
          "Unable to delete category."
      );
      setDeleting(false);
      return;
    }

    setDeleteTarget(null);
    setDeleting(false);
    router.refresh();
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              handleClose();
            }
          }}
        >
          <div className="w-full max-w-lg max-h-[calc(100vh-3rem)] overflow-hidden rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] shadow-xl">
            <div className="help-popup-scrollbar max-h-[calc(100vh-3rem)] overflow-y-auto overscroll-contain p-6">
              <h2 className="text-lg font-semibold tracking-tight text-[#26354d]">
                Manage categories
              </h2>

              <p className="mt-1 text-sm leading-6 text-[#647086]">
                Categories are labels for your expenses. Deleting one
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
                    disabled={
                      busy || !newName.trim()
                    }
                    className="shrink-0 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                  >
                    {adding ? "Adding..." : "Add"}
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
                {categories.map((category) => {
                  const isEditing =
                    editingId === category.id;

                  return (
                    <div
                      key={category.id}
                      className="rounded-xl border border-[#f3b9cd] bg-[#ffe8f0] px-3 py-2.5"
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

                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={
                                handleRename
                              }
                              disabled={busy}
                              className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                            >
                              {savingEdit
                                ? "Saving..."
                                : "Save"}
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
                              disabled={busy}
                              className="rounded-lg border border-[#f3b9cd] px-3 py-1.5 text-xs font-medium text-[#647086] hover:bg-[#ffdce9] disabled:cursor-not-allowed disabled:text-zinc-400"
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
                            <button
                              type="button"
                              onClick={() =>
                                startEdit(
                                  category
                                )
                              }
                              disabled={busy}
                              className="text-xs font-medium text-[#3978a5] underline underline-offset-4 hover:text-[#26354d] disabled:cursor-not-allowed disabled:text-zinc-400"
                            >
                              Rename
                            </button>

                            {!category.isDefault && (
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
                                disabled={busy}
                                className="text-xs font-medium text-[#a94444] underline underline-offset-4 hover:text-[#7a2f2f] disabled:cursor-not-allowed disabled:text-zinc-400"
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
                  disabled={busy}
                  className="rounded-lg border border-[#f3b9cd] px-4 py-2 text-sm font-medium text-[#647086] hover:bg-[#ffe8f0] disabled:cursor-not-allowed disabled:text-zinc-400"
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
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
