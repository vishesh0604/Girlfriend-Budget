import Link from "next/link";

export default function HomeButton() {
  return (
    <Link
      href="/home"
      prefetch
      className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100"
    >
      Home
    </Link>
  );
}
