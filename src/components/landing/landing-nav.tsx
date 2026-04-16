"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Sticky navigation header for the landing page.
 * Transparent at top, gains a dark backdrop on scroll.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    handleScroll(); // check initial position
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 sm:px-6 transition-colors duration-300 ${
        scrolled ? "bg-[#0a0a0a]/80 backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-0 select-none">
        <span className="font-heading text-lg font-bold text-amber-500">
          Un
        </span>
        <span className="font-heading text-lg font-bold text-white">
          bottle
        </span>
      </Link>

      {/* Auth links */}
      <nav className="flex items-center gap-4">
        <Link
          href="/login"
          className="text-sm font-medium text-neutral-100 hover:text-white transition-colors"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
        >
          Sign up
        </Link>
      </nav>
    </header>
  );
}
