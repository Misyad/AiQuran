import { NextResponse } from "next/server";
import { getAyah } from "@/lib/quran/data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const surah = Number(url.searchParams.get("surah"));
  const ayah = Number(url.searchParams.get("ayah"));

  if (!surah || !ayah) {
    return NextResponse.json({ error: "Missing surah or ayah parameter" }, { status: 400 });
  }

  const verse = getAyah(surah, ayah);
  if (!verse) {
    return NextResponse.json({ error: "Ayah not found" }, { status: 404 });
  }

  return NextResponse.json(verse);
}
