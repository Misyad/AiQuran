"use client";

import { useState } from "react";
import { getSurah, getAyah } from "@/lib/quran/data";
import SurahPicker from "@/components/quran/SurahPicker";

export default function PresentationPage() {
  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState(1);
  const surahInfo = getSurah(surah);
  const verse = getAyah(surah, ayah);
  const ayahCount = surahInfo?.total_verses || 7;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-green-900 to-green-950 text-white">
      {/* Minimal controls (hidden during presentation) */}
      <div className="flex items-center gap-3 p-3 bg-black/20">
        <button
          onClick={() => setAyah(Math.max(1, ayah - 1))}
          className="px-3 py-1 text-sm rounded bg-white/10 hover:bg-white/20 disabled:opacity-30"
          disabled={ayah <= 1}
        >
          &#8592;
        </button>
        <SurahPicker selected={surah} onSelect={(s) => { setSurah(s); setAyah(1); }} />
        <select
          value={ayah}
          onChange={(e) => setAyah(Number(e.target.value))}
          className="px-2 py-1 text-sm rounded bg-white/10 border border-white/20 text-white"
        >
          {Array.from({ length: ayahCount }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n} className="text-black">
              Ayat {n}
            </option>
          ))}
        </select>
        <button
          onClick={() => setAyah(Math.min(ayahCount, ayah + 1))}
          className="px-3 py-1 text-sm rounded bg-white/10 hover:bg-white/20 disabled:opacity-30"
          disabled={ayah >= ayahCount}
        >
          &#8594;
        </button>
        <div className="flex-1" />
        <a href="/display/mushaf" className="text-xs text-white/50 hover:text-white">
          Mode Mushaf &#8599;
        </a>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {verse && surahInfo ? (
          <>
            <div className="text-lg text-green-300 mb-6">
              {surahInfo.name_translation} — Ayat {ayah} — Juz {verse.juz}
            </div>
            <div
              className="text-5xl md:text-7xl text-center leading-[2] max-w-5xl"
              dir="rtl"
              style={{ fontFamily: "'Traditional Arabic', 'Scheherazade New', 'Amiri Quran', serif" }}
            >
              {verse.text_arabic}
            </div>
            <div className="text-2xl md:text-3xl text-green-200 mt-10 text-center max-w-3xl leading-relaxed">
              {verse.translation_id}
            </div>
            <div className="text-sm text-green-500 mt-8" dir="rtl">
              {surahInfo.name_arabic} — {surahInfo.name_transliteration}
            </div>
          </>
        ) : (
          <div className="text-white/50">Ayat tidak ditemukan</div>
        )}
      </div>
    </div>
  );
}
