import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getUserSubscriptionTier(
  userId: string,
): Promise<"pro" | "free"> {
  const supabase = getServiceClient();
  if (!supabase) return "free";

  const { data } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return "free";

  const row = data as { status: string; current_period_end: string };
  if (row.status !== "active") return "free";

  const periodEnd = new Date(row.current_period_end);
  if (periodEnd <= new Date()) return "free";

  return "pro";
}
