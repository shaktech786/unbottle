import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role not configured");
  }
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRO_PRICE_ID) {
    return Response.json(
      {
        error:
          "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID to enable billing.",
      },
      { status: 503 },
    );
  }

  try {
    const supabase = await createClient();
    const user = await requireAuth(supabase);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Look up or create Stripe customer
    const serviceClient = getServiceClient();
    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    let customerId = (profile as { stripe_customer_id?: string } | null)
      ?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;

      const { error: updateError } = await serviceClient
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);

      if (updateError) throw updateError;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      customer: customerId,
      success_url: `${appUrl}/settings?upgraded=true`,
      cancel_url: `${appUrl}/settings`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
