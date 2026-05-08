import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json(
      {
        error:
          "Stripe is not configured. Set STRIPE_SECRET_KEY to enable billing.",
      },
      { status: 503 },
    );
  }

  try {
    const supabase = await createClient();
    const user = await requireAuth(supabase);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const customerId = (profile as { stripe_customer_id?: string } | null)
      ?.stripe_customer_id;

    if (!customerId) {
      return Response.json(
        { error: "No Stripe customer found for this account." },
        { status: 400 },
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/settings/billing`,
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
