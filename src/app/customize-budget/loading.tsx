export default function Loading() {
  return (
    <main className="min-h-screen bg-[#e5f6ff]">
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f3b9cd] bg-[#ffdce9] shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffe8f0] text-lg font-semibold text-[#d96b91]">
              ✦
            </div>

            <div className="absolute inset-0 animate-ping rounded-2xl border border-[#f3b9cd] opacity-25" />
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-[#26354d]">
            Preparing your budget
          </h1>

          <p className="mt-1.5 text-sm text-[#647086]">
            Opening your budget settings...
          </p>

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