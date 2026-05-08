import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

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

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/dashboard`,
      metadata: {
        user_id: user.id,
      },
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
