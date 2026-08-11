"use client";

import Link from "next/link";

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

export default function MonthNavigator({
  monthStart,
}: MonthNavigatorProps) {
  const { year, month } =
    getMonthParts(monthStart);

  /*
   * Give the selector a useful range around the
   * current year without affecting any database data.
   */
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

  const selectedMonth = buildMonthStart(
    year,
    month
  );

  return (
    <div className="mb-8 flex items-center justify-between gap-3">
      {/* Previous month */}
      <Link
        href={`/dashboard?month=${previousMonth}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-lg text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-950"
        aria-label="Previous month"
      >
        ←
      </Link>

      {/* Month / Year selectors */}
      <div className="flex min-w-0 items-center justify-center gap-2">
        <select
          value={month}
          onChange={(event) => {
            window.location.href =
              `/dashboard?month=${buildMonthStart(
                year,
                event.target.value
              )}`;
          }}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-lg font-semibold text-zinc-950 shadow-sm outline-none transition focus:border-zinc-400"
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
          onChange={(event) => {
            window.location.href =
              `/dashboard?month=${buildMonthStart(
                Number(event.target.value),
                month
              )}`;
          }}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-lg font-semibold text-zinc-950 shadow-sm outline-none transition focus:border-zinc-400"
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
      <Link
        href={`/dashboard?month=${nextMonth}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-lg text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-950"
        aria-label="Next month"
      >
        →
      </Link>
    </div>
  );
}