import { NextRequest, NextResponse } from "next/server";
import { matchVerse } from "@/lib/asr/matcher";

/**
 * POST /api/recognize
 * Accept either:
 *   - JSON: { text: "arabic text from ASR" } (for testing / manual)
 *   - FormData: audio file (for real use)
 * 
 * Returns: { matches: MatchResult[], normalized_text: string }
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let arabicText = "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      arabicText = body.text || "";
    } else if (contentType.includes("multipart/form-data")) {
      // For future: receive audio file, transcribe via ASR
      // For now, return placeholder
      return NextResponse.json({
        error: "Audio transcription not yet implemented. Use JSON with { text: \"...\" }",
      }, { status: 400 });
    } else {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
    }

    if (!arabicText.trim()) {
      return NextResponse.json({ error: "Empty text" }, { status: 400 });
    }

    // Import normalize inline to ensure it works
    const { normalizeArabic } = await import("@/lib/asr/normalize");
    const normalized = normalizeArabic(arabicText);

    const matches = matchVerse(arabicText);

    return NextResponse.json({
      normalized_text: normalized,
      matches,
      count: matches.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
