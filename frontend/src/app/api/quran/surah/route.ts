import { NextResponse } from "next/server";
import { ALL_SURAH, getSurah } from "@/lib/quran/data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id) {
    const surah = getSurah(Number(id));
    if (!surah) {
      return NextResponse.json({ error: "Surah not found" }, { status: 404 });
    }
    return NextResponse.json(surah);
  }

  return NextResponse.json(ALL_SURAH);
}
