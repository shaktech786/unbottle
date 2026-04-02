import { NextResponse } from "next/server";
import { parseMusicXML } from "@/lib/musicxml/parser";

export async function POST(request: Request): Promise<Response> {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let xmlString: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 },
        );
      }
      xmlString = await file.text();
    } else {
      // Accept raw XML or JSON with xml field
      const body = await request.text();
      try {
        const json = JSON.parse(body);
        xmlString = json.xml ?? json.musicxml ?? body;
      } catch {
        xmlString = body;
      }
    }

    if (!xmlString || xmlString.length === 0) {
      return NextResponse.json(
        { error: "Empty MusicXML content" },
        { status: 400 },
      );
    }

    // Basic validation
    if (!xmlString.includes("<score-partwise") && !xmlString.includes("<score-timewise")) {
      return NextResponse.json(
        { error: "Invalid MusicXML: missing score-partwise or score-timewise root element" },
        { status: 400 },
      );
    }

    const result = parseMusicXML(xmlString);

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse MusicXML";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
