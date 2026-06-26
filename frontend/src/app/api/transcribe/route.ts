import { NextRequest, NextResponse } from "next/server";
import { matchVerse } from "@/lib/asr/matcher";

const WHISPER_API = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";

/**
 * POST /api/transcribe
 * Accept audio, send to Whisper-compatible API, then match verses.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    if (!API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    // Send to Whisper API (OpenAI-compatible)
    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, audioFile.name || "audio.webm");
    whisperForm.append("model", "whisper-1");
    whisperForm.append("language", "ar");
    whisperForm.append("response_format", "json");

    const whisperRes = await fetch(`${WHISPER_API}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      body: whisperForm,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      return NextResponse.json({ error: `Whisper API error: ${err}` }, { status: 502 });
    }

    const whisperData = await whisperRes.json();
    const arabicText: string = whisperData.text || "";

    if (!arabicText.trim()) {
      return NextResponse.json({ error: "Empty transcription" }, { status: 400 });
    }

    const { normalizeArabic } = await import("@/lib/asr/normalize");
    const normalized = normalizeArabic(arabicText);
    const matches = matchVerse(arabicText);

    return NextResponse.json({
      transcription: arabicText,
      normalized_text: normalized,
      matches,
      count: matches.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
