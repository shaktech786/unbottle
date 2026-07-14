"use client";

import { useState } from "react";

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Failed to open billing portal.");
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
        className="inline-flex items-center rounded-lg bg-neutral-700 px-5 py-2.5 text-sm font-semibold text-neutral-100 transition-colors duration-200 hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500/50 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Opening portal…" : "Manage subscription"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
