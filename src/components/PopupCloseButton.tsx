"use client";

type PopupCloseButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

/*
 * The shared X close control for the app's popups. Sits pinned to the
 * top-right corner of the popup panel (position it inside a `relative`
 * container) so it never adds a header row or shifts content down.
 */
export default function PopupCloseButton({
  onClick,
  disabled = false,
}: PopupCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Close"
      className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#f3b9cd] bg-[#ffe8f0] text-[#647086] shadow-sm transition hover:bg-[#ffdce9] hover:text-[#26354d] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
