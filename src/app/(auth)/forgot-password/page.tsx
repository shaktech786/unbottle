"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    // The server route always responds 200 with the same body whether the
    // email exists or not, so we can ignore the response shape and always
    // show the success state. Network/server errors fall through to the
    // same screen — better to look successful than to leak information.
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Intentional swallow — see comment above
    }

    setSubmittedEmail(email);
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
          If an account exists for{" "}
          <span className="font-medium text-neutral-200">{submittedEmail}</span>
          , we sent a password reset link. Check your inbox and spam folder.
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
        Reset your password
      </h1>
      <p className="mb-6 text-sm text-neutral-400">
        Enter your email and we&apos;ll send you a reset link
      </p>

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
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm text-stone-100 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 min-h-[44px] rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-400">
        Remember your password?{" "}
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
