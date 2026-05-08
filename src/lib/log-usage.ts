import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client created once — bypasses RLS for writes
let _serviceClient: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient | null {
  if (_serviceClient) return _serviceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _serviceClient = createClient(url, key, { auth: { persistSession: false } }) as SupabaseClient;
  return _serviceClient;
}

interface UsageLogRow {
  user_id: string;
  tokens_input: number;
  tokens_output: number;
  model: string;
  endpoint: string;
}

export async function logUsage(params: {
  userId: string;
  tokensInput: number;
  tokensOutput: number;
  model: string;
  endpoint: string;
}): Promise<void> {
  try {
    const client = getServiceClient();
    if (!client) return;
    const row: UsageLogRow = {
      user_id: params.userId,
      tokens_input: params.tokensInput,
      tokens_output: params.tokensOutput,
      model: params.model,
      endpoint: params.endpoint,
    };
    await (client.from("usage_logs") as ReturnType<SupabaseClient["from"]>).insert(row as never);
  } catch (err) {
    console.error("[logUsage] failed to write usage log:", err);
  }
}
