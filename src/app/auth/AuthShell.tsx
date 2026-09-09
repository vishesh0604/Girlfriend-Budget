import type { ReactNode } from "react";

/*
 * Shared frame for the login / sign-up / reset screens: the baby-blue
 * page with the drifting decorative blobs, and a centred pink card.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#e5f6ff] px-4">
      <div className="bg-blob bg-blob-a pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#cfeeff]" />
      <div className="bg-blob bg-blob-b pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#cfeeff]" />
      <div className="bg-blob bg-blob-c pointer-events-none absolute right-16 top-1/3 h-24 w-24 rounded-full bg-[#dff2ff]" />
      <div className="bg-blob bg-blob-d pointer-events-none absolute bottom-20 left-16 h-20 w-20 rounded-full bg-[#dff2ff]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-8 shadow-xl shadow-[#9bbfd2]/30">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ffe8f0]">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4f8fbd"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="2"
                />
                <path d="M16 9h5v6h-5a3 3 0 0 1 0-6Z" />
                <circle
                  cx="16"
                  cy="12"
                  r="0.8"
                  fill="#4f8fbd"
                />
              </svg>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-[#26354d]">
              {title}
            </h1>

            <p className="mt-2 text-sm text-[#647086]">
              {subtitle}
            </p>
          </div>

          {children}
        </div>

        {footer && (
          <p className="mt-5 text-center text-sm text-[#647086]">
            {footer}
          </p>
        )}
      </div>
    </main>
  );
}
