import { currencyByCode } from "./currencies";

/*
 * Format an amount in the given ISO-4217 currency. Whole amounts show no
 * decimals; fractional amounts show up to two. INR uses Indian digit
 * grouping (1,00,000); everything else uses Western grouping.
 */
export function formatMoney(
  amount: number,
  currency: string,
  opts?: { maxDecimals?: number }
): string {
  const n = Number.isFinite(amount)
    ? amount
    : 0;
  const locale =
    currency === "INR" ? "en-IN" : "en-US";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits:
        opts?.maxDecimals ?? 2,
    }).format(n);
  } catch {
    return `${currencySymbol(
      currency
    )}${n.toLocaleString(locale)}`;
  }
}

export function currencySymbol(
  currency: string
): string {
  return currencyByCode(currency).symbol;
}
