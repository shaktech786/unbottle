export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <span className="text-2xl font-bold tracking-tight text-stone-100" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          <span className="text-amber-500">Un</span>bottle
        </span>
      </div>

      {/* Card container */}
      <div className="w-full max-w-md rounded-xl border border-neutral-800/60 bg-neutral-900/80 p-5 shadow-xl backdrop-blur-sm sm:p-8">
        {children}
      </div>
    </div>
  );
}
