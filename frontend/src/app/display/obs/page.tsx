"use client";

import { useSearchParams } from "next/navigation";
import { getSurah, getAyah } from "@/lib/quran/data";

export default function OBSPage() {
  const searchParams = useSearchParams();
  const surah = Number(searchParams.get("surah")) || 1;
  const ayah = Number(searchParams.get("ayah")) || 1;

  const verse = getAyah(surah, ayah);
  const surahInfo = getSurah(surah);

  return (
    <div className="h-screen w-screen overflow-hidden bg-transparent">
      {verse && surahInfo ? (
        <div className="h-full w-full flex flex-col items-center justify-center p-6" style={{
          background: "linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 100%)",
        }}>
          {/* Surah name + Ayah number */}
          <div className="text-white/60 text-sm mb-4">
            {surahInfo.name_translation} — Ayat {ayah} — Juz {verse.juz}
          </div>

          {/* Arabic text */}
          <div
            className="text-4xl md:text-5xl text-white text-center leading-[2.2] max-w-4xl"
            dir="rtl"
            style={{ fontFamily: "'Traditional Arabic', 'Scheherazade New', 'Amiri Quran', serif", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
          >
            {verse.text_arabic}
          </div>

          {/* Translation */}
          <div className="text-lg md:text-xl text-white/80 mt-6 text-center max-w-3xl leading-relaxed">
            {verse.translation_id}
          </div>

          {/* Bottom overlay info */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between text-white/40 text-xs">
            <span>QLVRS — Quran Live Verse Recognition</span>
            <span dir="rtl">{surahInfo.name_arabic} :{ayah}</span>
          </div>
        </div>
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-black text-white/50">
          Ayat tidak ditemukan — Surah {surah} Ayat {ayah}
        </div>
      )}
    </div>
  );
}
