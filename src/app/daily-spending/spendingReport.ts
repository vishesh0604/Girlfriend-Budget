import { CATEGORY_COLOR_PRESETS } from "./categoryColors";

export type SpendingReportEntry = {
  date: string;
  category: string;
  color: string | null;
  amount: number;
  note: string;
};

export type SpendingReportCredit = {
  date: string;
  amount: number;
  note: string;
};

export type SpendingReportMove = {
  month: string;
  amount: number;
  label: string;
};

export type SpendingReportMonth = {
  month: string;
  pool: number | null;
  spent: number;
  credited: number;
  movedOut: number;
  remaining: number | null;
};

export type SpendingReport = {
  from: string;
  to: string;
  generatedAt: string;
  entries: SpendingReportEntry[];
  credits: SpendingReportCredit[];
  moves: SpendingReportMove[];
  months: SpendingReportMonth[];
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Neutral slices, matching the on-screen "View chart" donut.
const MOVED_COLOR = "#9aa1ad";
const REMAINING_COLOR = "#d7dde4";
export const REPORT_TRACK_COLOR = "#f1e3ea";
export const DONUT_RADIUS = 80;
export const DONUT_STROKE = 24;

/* All month-starts from `fromMonth` to `toMonth` inclusive, "YYYY-MM-01". */
export function monthsInRange(
  fromMonth: string,
  toMonth: string
): string[] {
  const out: string[] = [];

  let year = Number(fromMonth.slice(0, 4));
  let month = Number(fromMonth.slice(5, 7));

  const endYear = Number(toMonth.slice(0, 4));
  const endMonth = Number(toMonth.slice(5, 7));

  while (
    year < endYear ||
    (year === endYear && month <= endMonth)
  ) {
    out.push(
      `${year}-${String(month).padStart(
        2,
        "0"
      )}-01`
    );

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }

    if (out.length > 600) {
      break;
    }
  }

  return out;
}

/*
 * Money for the PDF. react-pdf renders in Helvetica, which has no ₹
 * glyph, so INR shows as "Rs". Other currencies use their narrow
 * symbol, falling back to the ISO code.
 */
export function pdfMoney(
  amount: number,
  currency: string
): string {
  const n = Math.round(
    Number.isFinite(amount) ? amount : 0
  );
  const locale =
    currency === "INR" ? "en-IN" : "en-US";
  const num = n.toLocaleString(locale);

  if (currency === "INR") {
    return `Rs ${num}`;
  }

  try {
    const sym =
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(n)
        .find((p) => p.type === "currency")
        ?.value ?? `${currency} `;
    return `${sym}${num}`;
  } catch {
    return `${currency} ${num}`;
  }
}

export function reportDate(iso: string) {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));

  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function reportMonthLabel(
  monthStart: string
) {
  const year = Number(monthStart.slice(0, 4));
  const month = Number(monthStart.slice(5, 7));

  return `${MONTHS[month - 1]} ${year}`;
}

function daysBetween(from: string, to: string) {
  const a = Date.UTC(
    Number(from.slice(0, 4)),
    Number(from.slice(5, 7)) - 1,
    Number(from.slice(8, 10))
  );
  const b = Date.UTC(
    Number(to.slice(0, 4)),
    Number(to.slice(5, 7)) - 1,
    Number(to.slice(8, 10))
  );

  return Math.round((b - a) / 86400000) + 1;
}

function sum(values: number[]) {
  return values.reduce(
    (total, value) => total + value,
    0
  );
}

export type ReportSlice = {
  label: string;
  color: string;
  amount: number;
  sharePct: number;
  // Donut arc for this slice (viewBox 0 0 200 200, radius DONUT_RADIUS).
  pathD: string;
  isFull: boolean;
};

export type ReportTxnRow = {
  date: string;
  label: string;
  note: string;
  amount: number;
  kind: "expense" | "credit" | "move";
};

export type ReportModel = {
  rangeLabel: string;
  generatedOn: string;
  totalPool: number | null;
  totalSpent: number;
  totalCredited: number;
  totalMoved: number;
  totalRemaining: number | null;
  transactionCount: number;
  days: number;
  perDay: number;
  poolMode: boolean;
  donutTotal: number;
  donutCenterLabel: string;
  slices: ReportSlice[];
  months: SpendingReportMonth[];
  monthSections: {
    label: string;
    rows: ReportTxnRow[];
  }[];
};

export function computeReportModel(
  report: SpendingReport
): ReportModel {
  const totalSpent = sum(
    report.entries.map((entry) => entry.amount)
  );
  const totalCredited = sum(
    report.credits.map((credit) => credit.amount)
  );
  const totalMoved = sum(
    report.moves.map((move) => move.amount)
  );

  const poolKnown =
    report.months.length > 0 &&
    report.months.every(
      (month) => month.pool !== null
    );

  const totalPool = poolKnown
    ? sum(
        report.months.map(
          (month) => month.pool ?? 0
        )
      )
    : null;

  const totalRemaining =
    totalPool === null
      ? null
      : totalPool - totalSpent - totalMoved;

  const days = daysBetween(
    report.from,
    report.to
  );
  const perDay =
    days > 0 ? totalSpent / days : 0;

  // Category totals, largest first, colour from the category or the
  // fixed preset order.
  const categoryMap = new Map<
    string,
    { color: string | null; amount: number }
  >();

  for (const entry of report.entries) {
    const current = categoryMap.get(
      entry.category
    ) ?? { color: entry.color, amount: 0 };
    current.amount += entry.amount;
    if (!current.color && entry.color) {
      current.color = entry.color;
    }
    categoryMap.set(entry.category, current);
  }

  const rawCategories = Array.from(
    categoryMap.entries()
  )
    .map(([label, value]) => ({
      label,
      color: value.color,
      amount: value.amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .map((item, index) => ({
      label: item.label,
      color:
        item.color ??
        CATEGORY_COLOR_PRESETS[
          index % CATEGORY_COLOR_PRESETS.length
        ],
      amount: item.amount,
    }));

  const poolMode =
    totalPool !== null && totalPool > 0;

  const flatSlices: {
    label: string;
    color: string;
    amount: number;
  }[] = poolMode
    ? [
        ...rawCategories,
        ...(totalMoved > 0
          ? [
              {
                label: "Moved out",
                color: MOVED_COLOR,
                amount: totalMoved,
              },
            ]
          : []),
        ...(totalRemaining !== null &&
        totalRemaining > 0
          ? [
              {
                label: "Remaining",
                color: REMAINING_COLOR,
                amount: totalRemaining,
              },
            ]
          : []),
      ]
    : rawCategories;

  const donutTotal = poolMode
    ? (totalPool as number)
    : totalSpent;

  const cx = 100;
  const cy = 100;
  let angle = -Math.PI / 2;

  const slices: ReportSlice[] = flatSlices.map(
    (slice) => {
      const fraction =
        donutTotal > 0
          ? slice.amount / donutTotal
          : 0;

      const start = angle;
      const end =
        angle + fraction * 2 * Math.PI;
      angle = end;

      const isFull = fraction >= 0.999;

      const x1 =
        cx + DONUT_RADIUS * Math.cos(start);
      const y1 =
        cy + DONUT_RADIUS * Math.sin(start);
      const x2 =
        cx + DONUT_RADIUS * Math.cos(end);
      const y2 =
        cy + DONUT_RADIUS * Math.sin(end);
      const largeArc =
        end - start > Math.PI ? 1 : 0;

      return {
        label: slice.label,
        color: slice.color,
        amount: slice.amount,
        sharePct: fraction * 100,
        isFull,
        pathD: isFull
          ? ""
          : `M ${x1.toFixed(2)} ${y1.toFixed(
              2
            )} A ${DONUT_RADIUS} ${DONUT_RADIUS} 0 ${largeArc} 1 ${x2.toFixed(
              2
            )} ${y2.toFixed(2)}`,
      };
    }
  );

  const monthSections = report.months
    .map((month) => {
      const key = month.month.slice(0, 7);

      const rows: ReportTxnRow[] = [
        ...report.entries
          .filter(
            (entry) =>
              entry.date.slice(0, 7) === key
          )
          .map((entry) => ({
            date: reportDate(entry.date),
            label: entry.category,
            note: entry.note,
            amount: entry.amount,
            kind: "expense" as const,
          })),
        ...report.credits
          .filter(
            (credit) =>
              credit.date.slice(0, 7) === key
          )
          .map((credit) => ({
            date: reportDate(credit.date),
            label: "Credit",
            note: credit.note,
            amount: credit.amount,
            kind: "credit" as const,
          })),
        ...report.moves
          .filter(
            (move) => move.month === month.month
          )
          .map((move) => ({
            date: "-",
            label: "Moved out",
            note: `to ${move.label}`,
            amount: move.amount,
            kind: "move" as const,
          })),
      ];

      return {
        label: reportMonthLabel(month.month),
        rows,
      };
    })
    .filter((section) => section.rows.length > 0);

  const rangeLabel =
    report.from === report.to
      ? reportDate(report.from)
      : `${reportDate(
          report.from
        )} - ${reportDate(report.to)}`;

  return {
    rangeLabel,
    generatedOn: reportDate(
      report.generatedAt.slice(0, 10)
    ),
    totalPool,
    totalSpent,
    totalCredited,
    totalMoved,
    totalRemaining,
    transactionCount: report.entries.length,
    days,
    perDay,
    poolMode,
    donutTotal,
    donutCenterLabel: poolMode
      ? "POOL"
      : "SPENT",
    slices,
    months: report.months,
    monthSections,
  };
}
