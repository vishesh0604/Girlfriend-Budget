"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type SelectOption = {
  value: string;
  label: string;
  /** Extra text matched by the search box but not shown as the label. */
  hint?: string;
};

export default function SearchableSelect({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Select…",
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef =
    useRef<HTMLInputElement>(null);

  const selected = options.find(
    (o) => o.value === value
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.hint ?? "")
          .toLowerCase()
          .includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    function onDown(e: MouseEvent) {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(
          e.target as Node
        )
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener(
      "mousedown",
      onDown
    );
    document.addEventListener("keydown", onKey);

    const t = window.setTimeout(
      () => searchRef.current?.focus(),
      20
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        onDown
      );
      document.removeEventListener(
        "keydown",
        onKey
      );
      window.clearTimeout(t);
    };
  }, [open]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#c9ddea] bg-[#f8fcff] px-4 py-3 text-left text-[#26354d] outline-none transition focus:border-[#4f8fbd] focus:ring-4 focus:ring-[#cfeeff] disabled:opacity-60"
      >
        <span className="truncate">
          {selected
            ? selected.label
            : placeholder}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#647086"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 transition ${
            open ? "rotate-180" : ""
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-40 mt-1.5 overflow-hidden rounded-xl border border-[#c9ddea] bg-white shadow-xl">
          <div className="border-b border-[#e8eef4] p-2">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
              placeholder="Search…"
              className="w-full rounded-lg border border-[#c9ddea] bg-[#f8fcff] px-3 py-2 text-sm text-[#26354d] outline-none focus:border-[#4f8fbd]"
            />
          </div>

          <ul className="help-popup-scrollbar max-h-56 overflow-y-auto overscroll-contain py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-[#647086]">
                No matches
              </li>
            ) : (
              filtered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() =>
                      pick(o.value)
                    }
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition ${
                      o.value === value
                        ? "bg-[#eaf2fb] font-medium text-[#26354d]"
                        : "text-[#34445e] hover:bg-[#f5f9fc]"
                    }`}
                  >
                    <span className="truncate">
                      {o.label}
                    </span>

                    {o.value === value && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="shrink-0"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
