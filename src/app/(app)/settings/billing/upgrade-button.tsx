"use client";

import { useState } from "react";

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Failed to start checkout.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors duration-200 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Redirecting…" : "Upgrade to Pro"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
