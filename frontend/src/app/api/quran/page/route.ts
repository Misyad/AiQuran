import { NextResponse } from "next/server";
import { getVersesByPage, getSurah } from "@/lib/quran/data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("id"));

  if (!page || page < 1 || page > 604) {
    return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
  }

  const verses = getVersesByPage(page);
  return NextResponse.json({ page, verses });
}
