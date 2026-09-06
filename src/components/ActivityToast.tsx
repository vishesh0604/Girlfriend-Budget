"use client";

type ActivityToastProps = {
  show: boolean;
  label: string;
};

/*
 * A small top-centre pill with animated dots, matching the
 * MonthNavigator "Updating budget" indicator. Use it to confirm
 * that a save is in progress while the page refreshes.
 */
export default function ActivityToast({
  show,
  label,
}: ActivityToastProps) {
  if (!show) {
    return null;
  }

  return (
    <div
      className="fixed left-1/2 top-9 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#f3b9cd] bg-[#ffdce9] px-3.5 py-1.5 text-xs font-medium text-zinc-600 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-flex items-center gap-1"
        aria-hidden="true"
      >
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" />
      </span>

      <span>{label}</span>
    </div>
  );
}
