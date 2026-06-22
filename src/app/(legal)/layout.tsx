import Link from "next/link";

export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-stone-100">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-white/5 px-4 sm:px-6">
        <Link href="/" className="flex select-none items-center gap-0">
          <span className="font-heading text-lg font-bold text-amber-500">Un</span>
          <span className="font-heading text-lg font-bold text-white">bottle</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-neutral-300">
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/cookies" className="hover:text-white">Cookies</Link>
        </nav>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center">
        <p className="text-sm text-dim">
          &copy; {new Date().getFullYear()} ShakTech Labs LLC &middot;{" "}
          <Link href="/" className="hover:text-white">Unbottle</Link>
        </p>
      </footer>
    </div>
  );
}
