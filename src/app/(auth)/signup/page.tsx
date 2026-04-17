"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

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
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <>
        <h1 className="mb-2 text-2xl font-bold text-stone-100">
          Check your email
        </h1>
        <p className="mb-4 text-sm text-neutral-400">
          We sent a confirmation link to{" "}
          <span className="font-medium text-neutral-200">{email}</span>. Click it
          to activate your account.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-amber-400 hover:text-amber-300"
        >
          Back to login
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold text-stone-100">
        Create your account
      </h1>
      <p className="mb-6 text-sm text-neutral-400">
        Start producing with an AI co-pilot
      </p>

      <OAuthButtons />

      {error && (
        <div className="mb-4 rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-neutral-300"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm text-stone-100 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-neutral-300"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm text-stone-100 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="At least 6 characters"
          />
          {password.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((i) => {
                  const strength =
                    (password.length >= 6 ? 1 : 0) +
                    (password.length >= 8 ? 1 : 0) +
                    (/[A-Z]/.test(password) && /[a-z]/.test(password) ? 1 : 0) +
                    (/[0-9!@#$%^&*]/.test(password) ? 1 : 0);
                  const colors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500"];
                  return (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= strength ? colors[strength - 1] : "bg-neutral-700"
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] text-neutral-500">
                {(() => {
                  const s =
                    (password.length >= 6 ? 1 : 0) +
                    (password.length >= 8 ? 1 : 0) +
                    (/[A-Z]/.test(password) && /[a-z]/.test(password) ? 1 : 0) +
                    (/[0-9!@#$%^&*]/.test(password) ? 1 : 0);
                  return ["Weak", "Fair", "Good", "Strong"][s - 1] ?? "Too short";
                })()}
              </span>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1.5 block text-sm font-medium text-neutral-300"
          >
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
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
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-amber-400 hover:text-amber-300"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
