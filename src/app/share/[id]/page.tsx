import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionBySlug, getLatestAudioCapture } from "@/lib/supabase/db";
import { getSession as getSessionMemory } from "@/lib/session/store";
import { SharePageClient } from "@/components/share/share-page-client";
import type { Session } from "@/lib/music/types";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

// 7 days in seconds
const SIGNED_URL_TTL = 7 * 24 * 60 * 60;

interface ShareData {
  session: Session;
  audioUrl: string | null;
  passwordProtected: boolean;
}

async function fetchShareData(slug: string): Promise<ShareData | null> {
  if (supabaseConfigured) {
    try {
      const client = await createClient();

      // has_share_password, not share_password_hash: anon has no column grant on
      // the hash, and this page renders for signed-out visitors.
      const { data: row, error } = await client
        .from("sessions")
        .select("is_public, has_share_password")
        .eq("share_slug", slug)
        .maybeSingle();

      if (error || !row || !row.is_public) return null;

      const session = await getSessionBySlug(client, slug);
      if (!session) return null;

      let audioUrl: string | null = null;
      const capture = await getLatestAudioCapture(client, session.id);
      if (capture?.audioUrl) {
        const captureId = capture.audioUrl.split("/").pop();
        if (captureId) {
          const storagePath = `${session.userId}/${captureId}.webm`;
          const { data: signed } = await client.storage
            .from("captures")
            .createSignedUrl(storagePath, SIGNED_URL_TTL);
          audioUrl = signed?.signedUrl ?? null;
        }
      }

      return {
        session,
        audioUrl,
        passwordProtected: Boolean(row.has_share_password),
      };
    } catch {
      return null;
    }
  }

  const session = getSessionMemory(slug);
  return session ? { session, audioUrl: null, passwordProtected: false } : null;
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shareData = await fetchShareData(id);
  if (!shareData) notFound();

  return (
    <SharePageClient
      session={shareData.session}
      audioUrl={shareData.audioUrl}
      slug={id}
      passwordProtected={shareData.passwordProtected}
    />
  );
}
