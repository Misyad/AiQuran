'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/lib/ws/useWebSocket';
import { getSurah, getAyah } from '@/lib/quran/data';

export default function AnswerDisplayPage() {
  const { connected, addListener } = useWebSocket('display');
  const [query, setQuery] = useState('');
  const [surah, setSurah] = useState(0);
  const [ayah, setAyah] = useState(0);
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [surahName, setSurahName] = useState('');
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<'idle' | 'answer'>('idle');

  useEffect(() => {
    const unsub = addListener((msg: any) => {
      if (msg.type === 'show_answer') {
        setQuery(msg.query || '');
        setSurah(msg.surah);
        setAyah(msg.ayah);
        setText(msg.text_arabic || '');
        setTranslation(msg.translation || '');
        setSurahName(msg.surah_name || '');
        setPage(msg.page || 0);
        setMode('answer');
      }
      if (msg.type === 'show_page') {
        setSurah(msg.surah);
        setAyah(msg.ayah);
        const v = getAyah(msg.surah, msg.ayah);
        if (v) {
          setText(v.text_arabic);
          setTranslation(v.translation_id);
          setPage(v.page);
        }
        const s = getSurah(msg.surah);
        setSurahName(s?.name_translation || '');
        setQuery('');
        setMode('answer');
      }
      if (msg.type === 'clear_display') {
        setMode('idle');
      }
    });
    return unsub;
  }, [addListener]);

  return (
    <div className='h-screen bg-black flex flex-col text-white overflow-hidden'>
      {/* Status bar */}
      <div className='flex items-center justify-between px-4 py-1.5 bg-gray-900 text-white/40 text-xs'>
        <div className='flex items-center gap-2'>
          <span className={'w-1.5 h-1.5 rounded-full ' + (connected ? 'bg-green-500' : 'bg-red-500')} />
          <span>Display Jawaban</span>
        </div>
        {mode === 'idle' && <span className='text-gray-600'>Menunggu pertanyaan...</span>}
      </div>

      {mode === 'idle' ? (
        <div className='flex-1 flex items-center justify-center text-gray-700 text-2xl'>
          Menunggu pertanyaan dari operator
        </div>
      ) : (
        <div className='flex-1 flex flex-col items-center justify-center px-8 py-6'>
          {/* Query bubble */}
          {query && (
            <div className='mb-6 text-center'>
              <div className='text-xs text-white/30 mb-1'>Pertanyaan:</div>
              <div className='inline-block px-5 py-2 bg-gray-800 rounded-full text-white/60 text-sm'>
                "{query}"
              </div>
            </div>
          )}

          {/* Arabic text */}
          <div className='text-4xl md:text-6xl text-center leading-[2] max-w-4xl mb-6' dir='rtl'
            style={{ fontFamily: "'Traditional Arabic', 'Scheherazade New', serif", textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            {text}
          </div>

          {/* Translation */}
          <div className='text-xl md:text-2xl text-green-300 text-center max-w-3xl leading-relaxed mb-4'>
            {translation}
          </div>

          {/* Surah + Ayah info */}
          <div className='text-sm text-white/40'>
            {surahName ? surahName + ' ' : ''} Surah {surah} Ayat {ayah}
            {page > 0 && <span> &middot; Halaman {page}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
