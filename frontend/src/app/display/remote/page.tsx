'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/lib/ws/useWebSocket';
import { getSurah, getAyah } from '@/lib/quran/data';

export default function RemoteDisplayPage() {
  const { connected, clientCount, addListener } = useWebSocket('display');
  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState(1);
  const [displayMode, setDisplayMode] = useState('mushaf');
  const [transcription, setTranscription] = useState('');
  const [confidence, setConfidence] = useState(0);

  useEffect(() => {
    const unsub = addListener((msg: any) => {
      if (msg.type === 'display_update') {
        if (msg.surah) setSurah(msg.surah);
        if (msg.ayah) setAyah(msg.ayah);
        if (msg.displayMode) setDisplayMode(msg.displayMode);
        if (msg.transcription) setTranscription(msg.transcription);
        if (typeof msg.confidence === 'number') setConfidence(msg.confidence);
      }
    });
    return unsub;
  }, [addListener]);

  const surahInfo = getSurah(surah);
  const verse = getAyah(surah, ayah);

  const displayUrl = (typeof window !== 'undefined' ? window.location.origin : '') +
    '/display/' + displayMode + '?surah=' + surah + '&ayah=' + ayah;

  return (
    <div className='h-screen bg-black flex flex-col'>
      <div className='flex items-center justify-between px-4 py-1.5 bg-gray-900 text-white/60 text-xs'>
        <div className='flex items-center gap-2'>
          <span className={'w-2 h-2 rounded-full ' + (connected ? 'bg-green-500' : 'bg-red-500')} />
          <span>Display {connected ? 'Live' : 'Disconnected'}</span>
          {connected && <span className='text-gray-500'>({clientCount.controllers} operator)</span>}
        </div>
        <div>
          {surahInfo && <span>{surahInfo.name_translation} &middot; Ayat {ayah}</span>}
          {confidence > 0 && <span className='ml-3 text-green-400'>{(confidence * 100).toFixed(1)}%</span>}
        </div>
      </div>

      {transcription && connected && (
        <div className='absolute top-10 left-4 right-4 z-10 text-center pointer-events-none'>
          <div className='inline-block px-4 py-1.5 bg-black/70 rounded-full text-white/60 text-xs' dir='rtl'>{transcription}</div>
        </div>
      )}

      <div className='flex-1'>
        <iframe key={surah + '-' + ayah + '-' + displayMode} src={displayUrl} className='w-full h-full border-0' title='Display' />
      </div>
    </div>
  );
}
