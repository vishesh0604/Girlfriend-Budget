import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { RefreshProvider } from "@/components/RefreshProvider";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/authUser";
import { getViewerCurrency } from "@/lib/supabase/viewer";

// Self-hosted so local dev and production render identically. next/font/google
// under Turbopack dev sometimes only emits the fallback @font-face into the
// head CSS, which made local look like Arial while prod looked correct.
const jakarta = localFont({
  src: [
    {
      path: "./fonts/PlusJakartaSans-latin.woff2",
      weight: "200 800",
      style: "normal",
    },
    {
      path: "./fonts/PlusJakartaSans-latin-ext.woff2",
      weight: "200 800",
      style: "normal",
    },
  ],
  variable: "--font-jakarta",
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Her Penny",
  description: "Her Penny — your personal budget tracker",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);
  const currency = userId
    ? await getViewerCurrency(supabase, userId)
    : "INR";

  return (
    <html
      lang="en"
      className={`${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CurrencyProvider currency={currency}>
          <RefreshProvider>
            {children}
          </RefreshProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
