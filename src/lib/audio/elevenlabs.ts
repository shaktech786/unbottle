/**
 * ElevenLabs Music API client.
 * Follows the same BYOK pattern as src/lib/ai/claude.ts:
 *   - User can pass their own key via request header
 *   - Falls back to server env ELEVENLABS_API_KEY
 */

const ELEVENLABS_MUSIC_URL = "https://api.elevenlabs.io/v1/text-to-music";

export interface MusicGenerationOptions {
  prompt: string;
  duration?: number; // seconds, default 30
  forceInstrumental?: boolean; // default true for Unbottle
}

export interface MusicGenerationResult {
  audioBuffer: ArrayBuffer;
  contentType: string;
}

/**
 * Resolve the ElevenLabs API key.
 * Priority: user-provided key > server env.
 */
function resolveApiKey(userApiKey?: string): string {
  const key = userApiKey || process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error(
      "No ElevenLabs API key available. Please provide your own key in Settings.",
    );
  }
  return key;
}

/**
 * Extract user's ElevenLabs key from request headers.
 * Users pass their own key via the x-elevenlabs-key header.
 */
export function getUserElevenLabsKey(request: Request): string | undefined {
  return request.headers.get("x-elevenlabs-key") || undefined;
}

/**
 * Generate music via the ElevenLabs text-to-music API.
 * Returns raw audio bytes (MP3) and the content type.
 */
export async function generateMusic(
  options: MusicGenerationOptions,
  apiKey?: string,
): Promise<MusicGenerationResult> {
  const key = resolveApiKey(apiKey);

  const body: Record<string, unknown> = {
    prompt: options.prompt,
  };

  if (options.duration !== undefined) {
    body.duration = options.duration;
  }

  if (options.forceInstrumental !== undefined) {
    body.force_instrumental = options.forceInstrumental;
  }

  const response = await fetch(ELEVENLABS_MUSIC_URL, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = `ElevenLabs API error (${response.status})`;
    try {
      const errBody = (await response.json()) as Record<string, unknown>;
      if (typeof errBody.detail === "string") {
        detail = errBody.detail;
      } else if (
        errBody.detail &&
        typeof errBody.detail === "object" &&
        "message" in (errBody.detail as Record<string, unknown>)
      ) {
        detail = (errBody.detail as { message: string }).message;
      }
    } catch {
      // body may not be JSON
    }
    throw new Error(detail);
  }

  const audioBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") ?? "audio/mpeg";

  return { audioBuffer, contentType };
}
