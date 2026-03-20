"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { OfflineBanner } from "@/components/ui/offline-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0a0a0a] text-stone-100">
      <OfflineBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile top bar with hamburger */}
          <div className="flex h-12 shrink-0 items-center border-b border-neutral-800 bg-[#0a0a0a] px-4 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
              aria-label="Open menu"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span
              className="ml-3 text-sm font-bold tracking-tight text-stone-100"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              <span className="text-amber-500">Un</span>bottle
            </span>
          </div>

          <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
}
