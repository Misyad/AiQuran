"use client";

import { getVersesByPage, getSurah, getAyah } from "@/lib/quran/data";
import { useState, useMemo, useEffect } from "react";

function padPage(n: number): string {
  return n.toString().padStart(3, "0");
}

export default function MushafView({ surah, ayah, page, onNavigate }: {
  surah?: number;
  ayah?: number;
  page?: number;
  onNavigate?: (page: number) => void;
}) {
  const [currentPage, setCurrentPage] = useState(page || 1);

  // Sync page from props
  useEffect(() => {
    if (page && page !== currentPage) setCurrentPage(page);
  }, [page]);

  const imageUrl = `https://media.qurankemenag.net/khat2/QK_${padPage(currentPage)}.webp`;

  const verses = useMemo(() => getVersesByPage(currentPage), [currentPage]);
  const pageSurah = useMemo(() => {
    if (verses.length === 0) return null;
    return getSurah(verses[0].surah);
  }, [verses]);

  const activeVerse = surah && ayah ? getAyah(surah, ayah) : null;

  const goToPage = (delta: number) => {
    const newPage = Math.max(1, Math.min(604, currentPage + delta));
    setCurrentPage(newPage);
    onNavigate?.(newPage);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 text-gray-900">
        <button onClick={() => goToPage(-1)} disabled={currentPage <= 1}
          className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
          &#8592; Prev
        </button>
        <div className="text-center">
          {pageSurah && (
            <div className="text-sm font-medium" dir="rtl">{pageSurah.name_arabic} &mdash; {pageSurah.name_translation}</div>
          )}
          {activeVerse && (
            <div className="text-xs text-green-700 font-semibold">Ayat {activeVerse.ayah} &middot; Juz {activeVerse.juz} &middot; Hal {activeVerse.page}</div>
          )}
          <div className="text-xs text-gray-500">Halaman {currentPage} / 604</div>
        </div>
        <button onClick={() => goToPage(1)} disabled={currentPage >= 604}
          className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
          Next &#8594;
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden bg-white relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={`Quran page ${currentPage}`}
          className="h-full w-auto object-contain max-w-full" />
      </div>

      <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 border-t border-gray-200 text-gray-600 text-xs overflow-x-auto">
        {verses.slice(0, 5).map((v) => (
          <span key={v.id} className={`whitespace-nowrap ${v.surah === surah && v.ayah === ayah ? "text-green-700 font-bold" : ""}`}>
            {getSurah(v.surah)?.name_transliteration} {v.ayah}
          </span>
        ))}
        {verses.length > 5 && <span className="text-gray-400">+{verses.length - 5} ayat</span>}
      </div>
    </div>
  );
}
