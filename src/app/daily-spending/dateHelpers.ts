export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function ordinalDay(day: number) {
  const remainder = day % 100;

  if (remainder >= 11 && remainder <= 13) {
    return `${day}th`;
  }

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/*
 * "2026-09-06" -> "6th September" (no year; the month
 * navigator already shows the month and year).
 */
export function formatEntryDate(isoDate: string) {
  const [, month, day] = isoDate
    .split("-")
    .map(Number);

  return `${ordinalDay(day)} ${
    MONTH_NAMES[month - 1] ?? ""
  }`;
}

export function dayFromEntryDate(
  isoDate: string
) {
  return Number(isoDate.slice(8, 10));
}

/*
 * Combine the viewed month ("2026-09-01") with a chosen
 * day (6) into an entry date ("2026-09-06").
 */
export function buildEntryDate(
  monthStart: string,
  day: number
) {
  return `${monthStart.slice(0, 8)}${String(
    day
  ).padStart(2, "0")}`;
}
