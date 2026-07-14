import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { ManageSubscriptionButton } from "./manage-subscription-button";
import { UpgradeButton } from "./upgrade-button";

const AI_CALL_LIMIT_FREE = 50;
const AI_CALL_LIMIT_PRO = 1000;

interface BillingStatus {
  plan: "free" | "pro";
  usage: { aiCalls: number; limit: number };
}

async function getBillingStatus(): Promise<BillingStatus> {
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!supabaseConfigured) {
    return { plan: "free", usage: { aiCalls: 0, limit: AI_CALL_LIMIT_FREE } };
  }

  try {
    const supabase = await createClient();
    const user = await getCurrentUser(supabase);
    if (!user) {
      return { plan: "free", usage: { aiCalls: 0, limit: AI_CALL_LIMIT_FREE } };
    }

    // Determine plan from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();

    const plan: "free" | "pro" =
      (profile as { plan?: string } | null)?.plan === "pro" ? "pro" : "free";
    const limit = plan === "pro" ? AI_CALL_LIMIT_PRO : AI_CALL_LIMIT_FREE;

    // Count AI (user-role) chat messages in the current calendar month
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ).toISOString();

    let aiCalls = 0;
    try {
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id")
        .eq("user_id", user.id);

      if (sessions && sessions.length > 0) {
        const sessionIds = (sessions as { id: string }[]).map((s) => s.id);
        const { count } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .in("session_id", sessionIds)
          .eq("role", "user")
          .gte("created_at", monthStart);

        aiCalls = count ?? 0;
      }
    } catch {
      // chat_messages table may not exist yet — return 0
    }

    return { plan, usage: { aiCalls, limit } };
  } catch {
    return { plan: "free", usage: { aiCalls: 0, limit: AI_CALL_LIMIT_FREE } };
  }
}

export default async function BillingPage() {
  const { plan, usage } = await getBillingStatus();
  const usagePercent = Math.min(
    100,
    Math.round((usage.aiCalls / usage.limit) * 100),
  );

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8 overflow-y-auto">
      <h1 className="mb-2 text-2xl font-bold text-neutral-100">Billing</h1>
      <p className="mb-8 text-neutral-400">
        Your current plan and usage for this billing period.
      </p>

      {/* Plan card */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-100">
            Current Plan
          </h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              plan === "pro"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-neutral-700 text-neutral-400"
            }`}
          >
            {plan === "pro" ? "Pro" : "Free"}
          </span>
        </div>

        {/* Usage */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-neutral-400">AI calls this month</span>
            <span className="font-mono font-medium text-neutral-200">
              {usage.aiCalls} / {usage.limit}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePercent >= 90
                  ? "bg-red-500"
                  : usagePercent >= 70
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {usagePercent >= 90 && (
            <p className="mt-2 text-xs text-red-400">
              You&apos;re close to your limit. Upgrade to Pro for more calls.
            </p>
          )}
        </div>

        {/* CTA */}
        {plan === "pro" ? (
          <ManageSubscriptionButton />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-neutral-400">
              Upgrade to Pro for unlimited AI calls, priority support, and more.
            </p>
            <UpgradeButton />
          </div>
        )}
      </div>
    </div>
  );
}
