"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type MonthNavigatorProps = {
  monthStart: string;
};

const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function getMonthParts(monthStart: string) {
  const match = /^(\d{4})-(\d{2})-01$/.exec(
    monthStart
  );

  if (!match) {
    return {
      year: new Date().getFullYear(),
      month: String(
        new Date().getMonth() + 1
      ).padStart(2, "0"),
    };
  }

  return {
    year: Number(match[1]),
    month: match[2],
  };
}

function getAdjacentMonth(
  monthStart: string,
  offset: number
) {
  const { year, month } =
    getMonthParts(monthStart);

  const date = new Date(
    year,
    Number(month) - 1 + offset,
    1
  );

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-01`;
}

function buildMonthStart(
  year: number,
  month: string
) {
  return `${year}-${month}-01`;
}

function LoadingDots() {
  return (
    <span
      className="inline-flex items-center gap-1"
      aria-hidden="true"
    >
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" />
    </span>
  );
}

export default function MonthNavigator({
  monthStart,
}: MonthNavigatorProps) {
  const router = useRouter();

  const [isNavigating, startTransition] =
    useTransition();

  const { year, month } =
    getMonthParts(monthStart);

  const years = Array.from(
    { length: 21 },
    (_, index) => year - 10 + index
  );

  const previousMonth = getAdjacentMonth(
    monthStart,
    -1
  );

  const nextMonth = getAdjacentMonth(
    monthStart,
    1
  );

  function navigateToMonth(
    targetMonth: string
  ) {
    if (isNavigating) {
      return;
    }

    startTransition(() => {
      router.push(
        `/dashboard?month=${targetMonth}`
      );
    });
  }

  return (
    <div className="relative mb-8 flex items-center justify-between gap-3">

      {/* Updating budget indicator */}
      <div
        className={`pointer-events-none absolute left-1/2 top-[-55px] z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#f3b9cd] bg-[#ffdce9] px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition-opacity duration-150 ${
          isNavigating
            ? "opacity-100"
            : "opacity-0"
        }`}
        aria-live="polite"
      >
        <LoadingDots />
        <span>Updating budget</span>
      </div>

      {/* Previous month */}
      <button
        type="button"
        onClick={() =>
          navigateToMonth(previousMonth)
        }
        disabled={isNavigating}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-lg text-zinc-600 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-zinc-50 hover:text-zinc-950 hover:shadow-md active:translate-y-0.5 active:scale-95 disabled:cursor-wait disabled:opacity-60"
        aria-label="Previous month"
      >
        ←
      </button>

      {/* Month / Year selectors */}
      <div className="flex min-w-0 items-center justify-center gap-2">
        <select
          value={month}
          disabled={isNavigating}
          onChange={(event) =>
            navigateToMonth(
              buildMonthStart(
                year,
                event.target.value
              )
            )
          }
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-lg font-semibold text-zinc-950 shadow-sm outline-none transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus:border-zinc-400 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
          aria-label="Select month"
        >
          {months.map((item) => (
            <option
              key={item.value}
              value={item.value}
            >
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={String(year)}
          disabled={isNavigating}
          onChange={(event) =>
            navigateToMonth(
              buildMonthStart(
                Number(event.target.value),
                month
              )
            )
          }
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-lg font-semibold text-zinc-950 shadow-sm outline-none transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus:border-zinc-400 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
          aria-label="Select year"
        >
          {years.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>
      </div>

      {/* Next month */}
      <button
        type="button"
        onClick={() =>
          navigateToMonth(nextMonth)
        }
        disabled={isNavigating}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-lg text-zinc-600 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-zinc-50 hover:text-zinc-950 hover:shadow-md active:translate-y-0.5 active:scale-95 disabled:cursor-wait disabled:opacity-60"
        aria-label="Next month"
      >
        →
      </button>
    </div>
  );
}