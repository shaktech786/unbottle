"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const CONFIRM_PHRASE = "DELETE";

export function AccountSection() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    window.location.href = "/api/account/export";
  }

  async function handleDelete() {
    setError(null);
    setDeleting(true);

    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Failed to delete account. Please try again.");
      setDeleting(false);
      return;
    }

    await createClient().auth.signOut();
    router.push("/");
  }

  return (
    <Card className="mt-4 border-red-900/40 p-4 sm:mt-6 sm:p-6">
      <h2 className="mb-1 text-lg font-semibold text-neutral-100">Your data</h2>
      <p className="mb-4 text-sm text-neutral-400">
        Download a copy of your data, or permanently delete your account.
      </p>

      <div className="mb-6">
        <Button variant="secondary" onClick={handleExport}>
          Export my data
        </Button>
        <p className="mt-2 text-xs text-neutral-500">
          Downloads a JSON archive of your profile, sessions, and related content.
        </p>
      </div>

      <div className="border-t border-neutral-800/60 pt-5">
        <h3 className="mb-1 text-sm font-semibold text-red-400">Delete account</h3>
        <p className="mb-3 text-sm text-neutral-400">
          This permanently deletes your account, sessions, captures, and all
          associated data. This cannot be undone.
        </p>

        {!confirming ? (
          <Button
            variant="secondary"
            className="border-red-900/50 text-red-400 hover:bg-red-950/30"
            onClick={() => setConfirming(true)}
          >
            Delete my account
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <label htmlFor="delete-confirm" className="text-sm text-neutral-300">
              Type <span className="font-mono font-semibold text-red-400">{CONFIRM_PHRASE}</span>{" "}
              to confirm.
            </label>
            <Input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-2">
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={confirmText !== CONFIRM_PHRASE}
                loading={deleting}
              >
                {deleting ? "Deleting..." : "Permanently delete"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setConfirming(false);
                  setConfirmText("");
                  setError(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
