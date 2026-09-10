/*
 * Currencies offered in Settings. The code is an ISO 4217 string stored
 * on profiles.currency; `Intl.NumberFormat` does the actual formatting
 * (Step 7). `symbol` is a fallback for places we render by hand.
 */
export type Currency = {
  code: string;
  label: string;
  symbol: string;
};

export const CURRENCIES: Currency[] = [
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "AED", label: "UAE Dirham", symbol: "AED" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { code: "NZD", label: "New Zealand Dollar", symbol: "NZ$" },
  { code: "ZAR", label: "South African Rand", symbol: "R" },
  { code: "SEK", label: "Swedish Krona", symbol: "kr" },
  { code: "SAR", label: "Saudi Riyal", symbol: "SAR" },
];

const CURRENCY_CODES = new Set(
  CURRENCIES.map((c) => c.code)
);

export function isCurrencyCode(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    CURRENCY_CODES.has(value)
  );
}

export function currencyByCode(
  code: string
): Currency {
  return (
    CURRENCIES.find((c) => c.code === code) ??
    CURRENCIES[0]
  );
}
