"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { CATEGORY_COLOR_PRESETS } from "./categoryColors";

type CategorySlice = {
  name: string;
  amount: number;
  color?: string | null;
};

type SpendingBreakdownChartProps = {
  categories: CategorySlice[];
  movedOut: number;
  remaining: number;
  pool: number;
};

// Positional fallback for categories left on "Auto" - assigned in fixed
// order, never cycled. A category with its own assigned colour overrides
// this. A 9th auto category folds into "Other".
const CATEGORY_COLORS =
  CATEGORY_COLOR_PRESETS.slice(0, 8);

const OTHER_COLOR = "#cbc7c3";
const MOVED_COLOR = "#9aa1ad";
const REMAINING_COLOR = "#d7dde4";

const RADIUS = 82;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

type Slice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export default function SpendingBreakdownChart({
  categories,
  movedOut,
  remaining,
  pool,
}: SpendingBreakdownChartProps) {
  const [open, setOpen] = useState(false);

  const slices = useMemo<Slice[]>(() => {
    const sorted = [...categories].sort(
      (a, b) => b.amount - a.amount
    );

    const result: Slice[] = [];

    if (sorted.length > CATEGORY_COLORS.length) {
      const shown = sorted.slice(
        0,
        CATEGORY_COLORS.length - 1
      );
      const rest = sorted.slice(
        CATEGORY_COLORS.length - 1
      );

      shown.forEach((item, index) => {
        result.push({
          key: `cat-${item.name}`,
          label: item.name,
          value: item.amount,
          color:
            item.color ??
            CATEGORY_COLORS[index] ??
            OTHER_COLOR,
        });
      });

      result.push({
        key: "cat-other",
        label: "Other",
        value: rest.reduce(
          (sum, item) => sum + item.amount,
          0
        ),
        color: OTHER_COLOR,
      });
    } else {
      sorted.forEach((item, index) => {
        result.push({
          key: `cat-${item.name}`,
          label: item.name,
          value: item.amount,
          color:
            item.color ??
            CATEGORY_COLORS[index] ??
            OTHER_COLOR,
        });
      });
    }

    if (movedOut > 0) {
      result.push({
        key: "moved-out",
        label: "Moved out",
        value: movedOut,
        color: MOVED_COLOR,
      });
    }

    if (remaining > 0) {
      result.push({
        key: "remaining",
        label: "Remaining",
        value: remaining,
        color: REMAINING_COLOR,
      });
    }

    return result.filter(
      (slice) => slice.value > 0
    );
  }, [categories, movedOut, remaining]);

  const denominator = slices.reduce(
    (sum, slice) => sum + slice.value,
    0
  );

  const overspent = remaining < 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg border border-[#ee8fb2] bg-[#ffbdd4] px-2.5 py-1 text-xs font-semibold text-[#a5305c] transition hover:bg-[#ffa9c7]"
      >
        View chart
      </button>

      {open && (
        <ChartModal
          slices={slices}
          denominator={denominator}
          pool={pool}
          overspent={overspent}
          overspentBy={overspent ? -remaining : 0}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

type ChartModalProps = {
  slices: Slice[];
  denominator: number;
  pool: number;
  overspent: boolean;
  overspentBy: number;
  onClose: () => void;
};

function ChartModal({
  slices,
  denominator,
  pool,
  overspent,
  overspentBy,
  onClose,
}: ChartModalProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setShown(true),
      40
    );

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKey);

    return () =>
      window.removeEventListener(
        "keydown",
        onKey
      );
  }, [onClose]);

  // Cumulative arc lengths so each segment starts where the last ended.
  const fractions = slices.map((slice) =>
    denominator > 0
      ? slice.value / denominator
      : 0
  );

  const arcs = slices.map((slice, index) => {
    const before = fractions
      .slice(0, index)
      .reduce((sum, value) => sum + value, 0);

    // No gap - slices butt straight up against each other.
    const dashLength =
      fractions[index] * CIRCUMFERENCE;

    return {
      key: slice.key,
      color: slice.color,
      dashLength,
      offset: -before * CIRCUMFERENCE,
    };
  });

  return (
    <div
      className="popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-6"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="popup-panel w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-6 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-[#26354d]">
            Where the pool went
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#f3b9cd] px-3 py-1.5 text-xs font-medium text-[#647086] hover:bg-[#ffe8f0]"
          >
            Close
          </button>
        </div>

        <p className="mt-1 text-sm leading-6 text-[#647086]">
          Every category plus what is still left, as a
          share of your spending pool.
        </p>

        <div className="relative mx-auto mt-5 w-full max-w-[240px]">
          <svg
            viewBox="0 0 220 220"
            className="w-full"
            role="img"
            aria-label="Spending pool breakdown"
          >
            <circle
              cx="110"
              cy="110"
              r={RADIUS}
              fill="none"
              stroke="#f6c9d8"
              strokeWidth="30"
            />

            <g transform="rotate(-90 110 110)">
              {arcs.map((arc, index) => (
                <circle
                  key={arc.key}
                  cx="110"
                  cy="110"
                  r={RADIUS}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="30"
                  strokeLinecap="butt"
                  style={{
                    strokeDasharray: shown
                      ? `${arc.dashLength} ${CIRCUMFERENCE}`
                      : `0 ${CIRCUMFERENCE}`,
                    strokeDashoffset: arc.offset,
                    transition: `stroke-dasharray 800ms cubic-bezier(0.22, 1, 0.36, 1) ${
                      index * 70
                    }ms`,
                  }}
                />
              ))}
            </g>
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[#647086]">
              Spending pool
            </span>
            <span className="text-xl font-semibold text-[#26354d]">
              {formatCurrency(pool)}
            </span>
          </div>
        </div>

        {overspent && (
          <p className="mt-3 text-center text-xs font-medium text-[#a94444]">
            Over the pool by{" "}
            {formatCurrency(overspentBy)}
          </p>
        )}

        <ul className="mt-5 space-y-1.5">
          {slices.map((slice, index) => {
            const share =
              denominator > 0
                ? (slice.value / denominator) *
                  100
                : 0;

            const shareLabel =
              share > 0 && share < 1
                ? "<1%"
                : `${Math.round(share)}%`;

            return (
              <li
                key={slice.key}
                className="flex items-center gap-2.5 text-sm"
                style={{
                  animation:
                    "chart-legend-in 260ms ease both",
                  animationDelay: `${
                    180 + index * 45
                  }ms`,
                }}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-[3px]"
                  style={{
                    backgroundColor: slice.color,
                  }}
                />

                <span className="min-w-0 flex-1 truncate text-[#26354d]">
                  {slice.label}
                </span>

                <span className="shrink-0 font-semibold tabular-nums text-[#26354d]">
                  {formatCurrency(slice.value)}
                </span>

                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-[#647086]">
                  {shareLabel}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
