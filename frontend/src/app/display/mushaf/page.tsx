'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSurah, getPageByAyah } from '@/lib/quran/data';
import MushafView from '@/components/quran/MushafView';
import SurahPicker from '@/components/quran/SurahPicker';

function MushafContent() {
  const searchParams = useSearchParams();
  const initialSurah = Number(searchParams.get('surah')) || 1;
  const initialAyah = Number(searchParams.get('ayah')) || 1;

  const [surah, setSurah] = useState(initialSurah);
  const [ayah, setAyah] = useState(initialAyah);
  const [page, setPage] = useState(getPageByAyah(initialSurah, initialAyah));

  useEffect(() => {
    setSurah(initialSurah);
    setAyah(initialAyah);
    setPage(getPageByAyah(initialSurah, initialAyah));
  }, [initialSurah, initialAyah]);

  const surahInfo = getSurah(surah);
  const ayahCount = surahInfo?.total_verses || 7;

  const handleSurahChange = (s: number) => {
    setSurah(s); setAyah(1); setPage(getPageByAyah(s, 1));
  };

  const handleAyahChange = (a: number) => {
    setAyah(a); setPage(getPageByAyah(surah, a));
  };

  return (
    <div className='flex flex-col h-screen'>
      <nav className='flex items-center gap-3 px-4 py-2 bg-white text-gray-900 z-30 border-b border-gray-200'>
        <a href='/' className='font-bold text-sm text-green-700 whitespace-nowrap'>QLVRS</a>
        <SurahPicker selected={surah} onSelect={handleSurahChange} />
        <select value={ayah} onChange={(e) => handleAyahChange(Number(e.target.value))}
          className='px-2 py-1 text-sm rounded bg-gray-100 border border-gray-300 text-gray-900'>
          {Array.from({ length: ayahCount }, (_, i) => i + 1).map((n) => (<option key={n} value={n}>Ayat {n}</option>))}
        </select>
        <div className='flex-1' />
        {surahInfo && <span className='text-xs text-gray-500 hidden sm:block' dir='rtl'>{surahInfo.name_arabic}</span>}
        <a href='/recognition' className='text-xs text-gray-400 hover:text-gray-700'>Recognition</a>
      </nav>
      <div className='flex-1 overflow-hidden'>
        <MushafView surah={surah} ayah={ayah} page={page} onNavigate={setPage} />
      </div>
    </div>
  );
}

export default function MushafPage() {
  return (
    <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading...</div>}>
      <MushafContent />
    </Suspense>
  );
}
