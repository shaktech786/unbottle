import { NextResponse } from "next/server";
import { DAW_TOOLS } from "@/lib/daw/tools";
import { getDAWState } from "@/lib/daw/state";

export const dynamic = "force-dynamic";

interface ToolAvailability {
  name: string;
  available: boolean;
}

interface HealthResponse {
  status: "ok" | "degraded";
  tools: ToolAvailability[];
  dawConnected: boolean;
}

export function GET(): NextResponse<HealthResponse> {
  let dawConnected = false;
  try {
    const daw = getDAWState();
    dawConnected = daw.isInitialized;
  } catch {
    dawConnected = false;
  }

  const tools: ToolAvailability[] = DAW_TOOLS.map((t) => ({
    name: t.name,
    available: dawConnected,
  }));

  const status: HealthResponse["status"] = dawConnected ? "ok" : "degraded";

  if (!dawConnected) {
    return NextResponse.json<HealthResponse>(
      { status, tools, dawConnected },
      { status: 503 },
    );
  }

  return NextResponse.json<HealthResponse>({ status, tools, dawConnected });
}
