import { type NextRequest } from "next/server";
import {
  getChatMessages as getChatMessagesMemory,
  addChatMessage as addChatMessageMemory,
} from "@/lib/session/store";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import {
  getChatMessages as getChatMessagesDB,
  addChatMessage as addChatMessageDB,
} from "@/lib/supabase/db";
import type { ChatMessage } from "@/lib/music/types";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const dynamic = "force-dynamic";

// GET /api/session/[id]/messages — load chat history
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      await requireAuth(client);
      const messages = await getChatMessagesDB(client, id);
      return Response.json({ messages });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Not authenticated")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return Response.json({ messages: [] });
    }
  }

  const messages = getChatMessagesMemory(id);
  return Response.json({ messages });
}

// POST /api/session/[id]/messages — persist messages
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { messages?: Partial<ChatMessage>[] };

  if (!body.messages?.length) {
    return Response.json({ error: "Messages array required" }, { status: 400 });
  }

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      await requireAuth(client);

      for (const msg of body.messages) {
        if (msg.role && msg.content) {
          await addChatMessageDB(client, id, {
            role: msg.role,
            content: msg.content,
            metadata: msg.metadata ?? {},
          });
        }
      }

      return Response.json({ success: true });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Not authenticated")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return Response.json({ error: "Failed to persist messages" }, { status: 500 });
    }
  }

  // In-memory fallback
  for (const msg of body.messages) {
    if (msg.role && msg.content) {
      addChatMessageMemory(id, {
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata,
      });
    }
  }

  return Response.json({ success: true });
}
