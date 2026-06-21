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

  useEffect(() => {
    const supabase = createClient();
    // The Supabase client processes the #access_token hash on init and fires
    // PASSWORD_RECOVERY before rendering the form — this prevents updateUser
    // from being called before the recovery session is established.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Also handle the case where the session is already active (page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
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
