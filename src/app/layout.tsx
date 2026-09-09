import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { RefreshProvider } from "@/components/RefreshProvider";

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
  title: "Budget Tracker",
  description: "Personal Budget Tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RefreshProvider>
          {children}
        </RefreshProvider>
      </body>
    </html>
  );
}
