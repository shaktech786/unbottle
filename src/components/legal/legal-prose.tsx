import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared typographic primitives for the static legal pages
 * (Terms, Privacy, Cookies). Styled to match the Unbottle dark theme
 * without depending on the Tailwind typography plugin.
 */

export function LegalPage({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  return (
    <article className="space-y-6">
      <header className="space-y-2 border-b border-white/10 pb-6">
        <h1 className="font-heading text-3xl font-bold text-warm-white sm:text-4xl">
          {title}
        </h1>
        <p className="text-sm text-dim">Effective date: {effectiveDate}</p>
      </header>
      {children}
    </article>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="space-y-3 pt-4">
      <h2 className="font-heading text-xl font-semibold text-warm-white">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-neutral-300">{children}</p>;
}

export function List({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-300 marker:text-amber-500/70">
      {children}
    </ul>
  );
}

export function Mail({ address }: { address: string }) {
  return (
    <a
      href={`mailto:${address}`}
      className="text-amber-500 underline-offset-4 hover:underline"
    >
      {address}
    </a>
  );
}

export function Internal({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-amber-500 underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
