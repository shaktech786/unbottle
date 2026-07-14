import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Stripe requires the raw body for signature verification — disable body parsing
export const runtime = "nodejs";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role not configured");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return Response.json(
      { error: "Stripe webhook not configured" },
      { status: 503 },
    );
  }

  const stripe = new Stripe(stripeKey);
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    return Response.json({ error: message }, { status: 400 });
  }

  const relevantEvents = new Set([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ]);

  if (!relevantEvents.has(event.type)) {
    return Response.json({ received: true });
  }

  const subscription = event.data.object as Stripe.Subscription;
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    return Response.json({ error: "No price found on subscription" }, { status: 400 });
  }

  const status =
    event.type === "customer.subscription.deleted"
      ? "canceled"
      : subscription.status;

  const periodEnd = subscription.items.data[0]?.current_period_end;
  if (periodEnd === undefined) {
    return Response.json({ error: "No period end found on subscription item" }, { status: 400 });
  }
  const currentPeriodEnd = new Date(periodEnd * 1000).toISOString();

  try {
    const supabase = getServiceClient();

    // Look up user by stripe_customer_id stored on their profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (profileError) {
      console.error("[stripe-webhook] profile lookup error:", profileError);
      return Response.json({ error: "Database error" }, { status: 500 });
    }

    if (!profile) {
      // Unknown customer — still return 200 so Stripe doesn't retry
      console.warn("[stripe-webhook] no profile for customer:", customerId);
      return Response.json({ received: true });
    }

    const { error: upsertError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          id: subscription.id,
          user_id: profile.id,
          stripe_customer_id: customerId,
          stripe_price_id: priceId,
          status,
          current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

    if (upsertError) {
      console.error("[stripe-webhook] upsert error:", upsertError);
      return Response.json({ error: "Database error" }, { status: 500 });
    }

    return Response.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[stripe-webhook] unexpected error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
