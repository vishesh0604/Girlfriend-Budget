export default function Loading() {
  return (
    <main className="min-h-screen bg-[#e6f6ff]">
      <div className="flex min-h-screen items-center justify-center px-6">
        <div
          className="flex flex-col items-center text-center"
          role="status"
          aria-live="polite"
        >
          {/* Budget icon */}
          <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f3b9cd] bg-[#ffdce9] shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3b9cd] bg-white">
              <span className="text-lg font-semibold text-[#26354d]">
                ₹
              </span>
            </div>

            <div className="absolute inset-0 animate-ping rounded-2xl border border-[#f3b9cd] opacity-30" />
          </div>

          {/* Title */}
          <h1 className="text-xl font-semibold tracking-tight text-[#26354d]">
            Opening your budget
          </h1>

          {/* Subtitle */}
          <p className="mt-1.5 text-sm text-[#65748b]">
            Getting everything ready...
          </p>

          {/* Loading dots */}
          <div className="mt-5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#26354d] [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#26354d] [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#26354d]" />
          </div>
        </div>
      </div>
    </main>
  );
}