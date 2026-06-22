import { NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Pad every response to this minimum so an attacker cannot use response time
// to distinguish "user exists" from "user does not exist".
const MIN_RESPONSE_MS = 800;

async function padTo(start: number) {
  const remaining = MIN_RESPONSE_MS - (Date.now() - start);
  if (remaining > 0) {
    await new Promise((r) => setTimeout(r, remaining));
  }
}

function buildResetEmail(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;">
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:24px;font-weight:700;letter-spacing:-0.5px;color:#f5f5f4;">
                <span style="color:#d97706;">Un</span>bottle
              </span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#171717;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:40px 32px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f5f5f4;line-height:1.3;">
                Reset your password
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:#a3a3a3;line-height:1.6;">
                We received a request to reset the password for your Unbottle account. Click the button below to choose a new one.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}"
                       style="display:inline-block;background-color:#d97706;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;letter-spacing:0.2px;">
                      Reset password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;color:#525252;line-height:1.6;">
                This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#404040;">
                Unbottle &middot; <a href="https://unbottle-rouge.vercel.app" style="color:#404040;text-decoration:underline;">unbottle.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * POST /api/auth/forgot-password
 *
 * Always returns { ok: true } after at least MIN_RESPONSE_MS regardless of
 * whether the email is registered — prevents account enumeration. The actual
 * link generation and send happen in after() so response time is constant.
 *
 * Uses admin generateLink + Resend REST API directly instead of GoTrue SMTP
 * to avoid GoTrue's SMTP connectivity issues.
 */
export async function POST(request: Request): Promise<Response> {
  const startedAt = Date.now();
  const sameResponse = async () => {
    await padTo(startedAt);
    return NextResponse.json({ ok: true }, { status: 200 });
  };

  let email: string | undefined;
  try {
    const body = (await request.json()) as { email?: string };
    email = body.email?.trim().toLowerCase();
  } catch {
    return sameResponse();
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sameResponse();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    console.error("Forgot-password: missing env vars (SUPABASE_URL, SERVICE_ROLE_KEY, or RESEND_API_KEY)");
    return sameResponse();
  }

  const origin = new URL(request.url).origin;
  after(async () => {
    try {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // generateLink returns an error if the user doesn't exist — serves as
      // our existence check without requiring a full user list scan.
      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: email as string,
        options: { redirectTo: `${origin}/reset-password` },
      });

      if (error || !data?.properties?.action_link) {
        // User doesn't exist or generation failed — silent drop.
        return;
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Unbottle <noreply@shak-tech.com>",
          to: [email],
          subject: "Reset your Unbottle password",
          html: buildResetEmail(data.properties.action_link),
        }),
      });

      if (!res.ok) {
        console.error("Forgot-password Resend send failed:", await res.text());
      }
    } catch (err) {
      console.error("Forgot-password background work failed:", err);
    }
  });

  return sameResponse();
}
