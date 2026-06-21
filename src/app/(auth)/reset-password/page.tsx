"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Parse hash params — Supabase implicit flow sends tokens as
    // #access_token=...&refresh_token=...&type=recovery
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (accessToken && refreshToken && type === "recovery") {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) setTokenError(true);
          else setReady(true);
        });
      return;
    }

    // Fallback: page refresh after session already established
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      else setTokenError(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  if (tokenError) {
    return (
      <>
        <h1 className="mb-2 text-2xl font-bold text-stone-100">Link expired</h1>
        <p className="mb-6 text-sm text-neutral-400">
          This reset link is invalid or has expired.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block w-full rounded-lg bg-amber-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-amber-500"
        >
          Request a new link
        </Link>
      </>
    );
  }

  if (!ready) {
    return (
      <p className="text-sm text-neutral-400">Verifying reset link…</p>
    );
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold text-stone-100">
        Set new password
      </h1>
      <p className="mb-6 text-sm text-neutral-400">
        Enter your new password below
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800/40 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-neutral-300"
          >
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm text-stone-100 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1.5 block text-sm font-medium text-neutral-300"
          >
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm text-stone-100 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="Repeat your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 min-h-[44px] rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-400">
        <Link
          href="/login"
          className="font-medium text-amber-400 hover:text-amber-300"
        >
          Back to login
        </Link>
      </p>
    </>
  );
}
