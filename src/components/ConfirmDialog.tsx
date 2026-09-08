"use client";

type ConfirmTone = "default" | "warning" | "danger";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busyLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const toneClasses: Record<ConfirmTone, string> = {
  default:
    "bg-emerald-600 hover:bg-emerald-700",
  warning:
    "bg-amber-600 hover:bg-amber-700",
  danger:
    "bg-red-600 hover:bg-red-700",
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  busyLabel = "Working...",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="popup-overlay fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-5"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !busy
        ) {
          onCancel();
        }
      }}
    >
      <div className="popup-panel w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-zinc-950">
          {title}
        </h3>

        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-500">
          {message}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-zinc-300 ${toneClasses[tone]}`}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
