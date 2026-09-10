"use client";

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";

import { formatMoney, currencySymbol } from "@/lib/money";

const CurrencyContext =
  createContext<string>("INR");

export function CurrencyProvider({
  currency,
  children,
}: {
  currency: string;
  children: ReactNode;
}) {
  return (
    <CurrencyContext.Provider value={currency}>
      {children}
    </CurrencyContext.Provider>
  );
}

/** The viewer's ISO-4217 currency code. */
export function useCurrency() {
  return useContext(CurrencyContext);
}

/** `money(1500)` → "₹1,500" in the viewer's currency. */
export function useMoney() {
  const currency = useContext(CurrencyContext);
  return useCallback(
    (
      amount: number,
      opts?: { maxDecimals?: number }
    ) => formatMoney(amount, currency, opts),
    [currency]
  );
}

/** Just the symbol, for input placeholders etc. */
export function useCurrencySymbol() {
  return currencySymbol(
    useContext(CurrencyContext)
  );
}
