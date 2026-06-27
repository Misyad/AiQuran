'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { getSurah, getAyah, getVersesByPage, searchTranslations } from '@/lib/quran/data';
import { useWebSocket } from '@/lib/ws/useWebSocket';
import { searchByTranslation } from '@/lib/asr/searchByTranslation';
import { matchVerse } from '@/lib/asr/matcher';
import SurahPicker from '@/components/quran/SurahPicker';
import AudioWaveform from '@/components/asr/AudioWaveform';

type Tab = 'manual' | 'answer' | 'page';

export default function OperatorPage() {
  const [tab, setTab] = useState<Tab>('manual');

  // Manual mode
  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState(1);
  const [displayMode, setDisplayMode] = useState<'mushaf' | 'presentation' | 'obs'>('mushaf');
  const [autoMode, setAutoMode] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<any>({ id: '', status: 'idle', history: [] });
  const [isListening, setIsListening] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [stats, setStats] = useState({ total: 0, autoDisplay: 0 });
  const [candidates, setCandidates] = useState<any[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Answer mode
  const [answerTab, setAnswerTab] = useState<'listen' | 'type'>('listen');
  const [queryText, setQueryText] = useState('');
  const [answerResults, setAnswerResults] = useState<any[]>([]);
  const [interimText, setInterimText] = useState('');
  const answerRecognition = useRef<SpeechRecognition | null>(null);
  const finalAnswerRef = useRef('');

  // Page mode
  const [pageInput, setPageInput] = useState('');
  const [pageResult, setPageResult] = useState<{ surah: number; ayah: number; text: string; translation: string; page: number; surahName: string } | null>(null);

  const { connected, clientCount, send } = useWebSocket('controller');

  useEffect(() => setMounted(true), []);

  const broadcast = useCallback((s: number, a: number, mode: string) => {
    send({ type: 'display_update', surah: s, ayah: a, displayMode: mode });
  }, [send]);

  // Answer STT (Indonesian)
  const startAnswerSTT = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false; r.interimResults = true; r.lang = 'id';
    answerRecognition.current = r;
    finalAnswerRef.current = '';
    setAnswerResults([]);
    setQueryText('');

    r.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalAnswerRef.current += event.results[i][0].transcript;
        else interim = event.results[i][0].transcript;
      }
      setInterimText(finalAnswerRef.current + interim);
    };
    r.onend = () => {
      setAnswerTab('type');
      const text = finalAnswerRef.current.trim();
      setQueryText(text);
      if (text) searchAnswer(text);
    };
    r.start();
  };

  const searchAnswer = (text: string) => {
    const results = searchByTranslation(text);
    setAnswerResults(results);
    if (results.length > 0) {
      send({
        type: 'show_answer',
        query: text,
        surah: results[0].surah,
        ayah: results[0].ayah,
        text_arabic: results[0].text_arabic,
        translation: results[0].translation_id,
        surah_name: results[0].surah_name,
        page: results[0].page,
      });
    }
  };

  // Page lookup
  const handlePageLookup = () => {
    const m = pageInput.match(/(?:surah\s*)?(\d+)\s*:\s*(\d+)/i);
    if (!m) return;
    const s = parseInt(m[1]), a = parseInt(m[2]);
    const verse = getAyah(s, a);
    if (!verse) return;
    const info = getSurah(s);
    const result = { surah: s, ayah: a, text: verse.text_arabic, translation: verse.translation_id, page: verse.page, surahName: info?.name_translation || '' };
    setPageResult(result);
    setSurah(s); setAyah(a);
    send({ type: 'show_page', surah: s, ayah: a });
    broadcast(s, a, displayMode);
  };

  // Manual mode functions (from existing)
  const changeSurah = useCallback((s: number) => { setSurah(s); setAyah(1); broadcast(s, 1, displayMode); }, [broadcast, displayMode]);
  const changeAyah = useCallback((a: number) => { setAyah(a); broadcast(surah, a, displayMode); }, [broadcast, surah, displayMode]);
  const changeMode = useCallback((m: 'mushaf' | 'presentation' | 'obs') => { setDisplayMode(m); broadcast(surah, ayah, m); }, [broadcast, surah, ayah]);

  const surahInfo = getSurah(surah);
  const verse = getAyah(surah, ayah);
  const ayahCount = surahInfo?.total_verses || 7;
  const page = verse?.page || 1;
  const pageVerses = useMemo(() => getVersesByPage(page), [page]);
  const displayUrl = useMemo(() => {
    if (!mounted) return '';
    const base = window.location.origin;
    return base + '/display/' + displayMode + '?surah=' + surah + '&ayah=' + ayah;
  }, [surah, ayah, displayMode, mounted]);

  return (
    <div className='flex h-screen bg-gray-50'>
      <div className='w-80 bg-gray-900 text-white flex flex-col overflow-y-auto'>
        <div className='p-3 border-b border-gray-700'>
          <h1 className='text-base font-bold text-green-400'>Operator</h1>
        </div>

        {/* Tabs */}
        <div className='flex border-b border-gray-700'>
          {(['manual', 'answer', 'page'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={'flex-1 py-2 text-xs ' + (tab === t ? 'bg-green-800 text-white font-medium' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>
              {t === 'manual' ? 'Manual' : t === 'answer' ? 'Bantu Jawab' : 'Cari Halaman'}
            </button>
          ))}
        </div>

        {/* Tab: Manual */}
        {tab === 'manual' && (
          <div className='flex-1 overflow-y-auto'>
            <div className='p-3 space-y-2 border-b border-gray-700'>
              <div className='flex items-center gap-2 text-xs text-gray-400'>
                <span className={'w-1.5 h-1.5 rounded-full ' + (connected ? 'bg-green-500' : 'bg-red-500')} /> WS {connected ? 'OK' : '...'}
                {connected && <span>({clientCount.displays})</span>}
              </div>
              <SurahPicker selected={surah} onSelect={changeSurah} />
              <div className='flex gap-2'>
                <button onClick={() => changeAyah(Math.max(1, ayah - 1))} className='px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-30' disabled={ayah <= 1}>&#8592;</button>
                <select value={ayah} onChange={(e) => changeAyah(Number(e.target.value))} className='flex-1 px-2 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm'>
                  {Array.from({ length: ayahCount }, (_, i) => i + 1).map((n) => (<option key={n} value={n}>Ayat {n}</option>))}
                </select>
                <button onClick={() => changeAyah(Math.min(ayahCount, ayah + 1))} className='px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-30' disabled={ayah >= ayahCount}>&#8594;</button>
              </div>
              <div className='flex gap-1'>
                {(['mushaf', 'presentation', 'obs'] as const).map((m) => (
                  <button key={m} onClick={() => changeMode(m)} className={'flex-1 py-2 text-xs rounded ' + (displayMode === m ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>
                    {m === 'mushaf' ? 'Mushaf' : m === 'presentation' ? 'Tampilan' : 'OBS'}
                  </button>
                ))}
              </div>
            </div>
            <div className='p-3 text-xs text-gray-500'>{surahInfo?.name_translation} {ayah}/{ayahCount} &middot; Hal {page}</div>
          </div>
        )}

        {/* Tab: Bantu Jawab */}
        {tab === 'answer' && (
          <div className='flex-1 overflow-y-auto'>
            <div className='p-3 space-y-2 border-b border-gray-700'>
              <div className='flex gap-2'>
                <button onClick={startAnswerSTT} className='flex-1 py-3 bg-green-700 hover:bg-green-600 rounded text-sm font-medium'>Dengar</button>
                <button onClick={() => setAnswerTab('type')} className='px-3 py-3 bg-gray-700 hover:bg-gray-600 rounded text-sm'>Teks</button>
              </div>
              {queryText && <div className='text-xs text-gray-400 bg-gray-800 rounded p-2'>&quot;{queryText}&quot;</div>}
              {interimText && !queryText && <div className='text-xs text-gray-600 bg-gray-800 rounded p-2'>{interimText}</div>}
              {answerResults.length === 0 && !interimText && <div className='text-xs text-gray-500 py-4 text-center'>Klik &quot;Dengar&quot; lalu bacakan pertanyaan</div>}
              {answerResults.map((r, i) => (
                <button key={i} onClick={() => { setSurah(r.surah); setAyah(r.ayah); broadcast(r.surah, r.ayah, displayMode); }}
                  className={'w-full text-left px-3 py-2 rounded text-xs ' + (i === 0 ? 'bg-green-800 text-white ring-1 ring-green-500' : 'bg-gray-800 text-gray-300 hover:bg-gray-700')}>
                  <span className='block font-medium'>{r.surah}. {r.surah_name} : {r.ayah}</span>
                  <span className='block text-right text-sm mt-1' dir='rtl'>{r.text_arabic}</span>
                  <span className='block text-xs text-gray-400 mt-1'>{r.translation_id}</span>
                  <span className='block text-xs text-green-400 mt-1'>{(r.confidence * 100).toFixed(0)}% &middot; Hal {r.page}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Cari Halaman */}
        {tab === 'page' && (
          <div className='flex-1 overflow-y-auto'>
            <div className='p-3 space-y-2 border-b border-gray-700'>
              <label className='text-xs text-gray-400'>Masukkan surah:ayat (contoh: 2:255 atau Al-Baqarah 255):</label>
              <div className='flex gap-2'>
                <input value={pageInput} onChange={(e) => setPageInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePageLookup()}
                  placeholder='2:255' className='flex-1 px-3 py-3 bg-gray-800 border border-gray-700 rounded text-white text-sm' />
                <button onClick={handlePageLookup} className='px-4 py-3 bg-green-700 hover:bg-green-600 rounded text-sm font-medium'>Cari</button>
              </div>
              {pageResult && (
                <div className='bg-green-800/30 rounded p-3 space-y-2'>
                  <div className='text-sm font-medium text-green-400'>{pageResult.surah}. {pageResult.surahName} : {pageResult.ayah}</div>
                  <div className='text-right text-base' dir='rtl'>{pageResult.text}</div>
                  <div className='text-xs text-gray-400'>{pageResult.translation}</div>
                  <div className='text-xs text-green-400'>Halaman {pageResult.page}</div>
                  <button onClick={() => { setSurah(pageResult.surah); setAyah(pageResult.ayah); broadcast(pageResult.surah, pageResult.ayah, displayMode); }}
                    className='px-3 py-2 bg-green-700 text-white rounded text-xs font-medium w-full'>Buka Mushaf</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {mounted && (
        <div className='flex-1 bg-black flex flex-col'>
          <div className='flex items-center gap-2 px-3 py-2 bg-gray-800 text-xs text-gray-400'>
            <span className='text-white/80'>{surahInfo?.name_translation} {ayah}</span>
            <a href={'/display/answer'} target='_blank' className='ml-auto text-green-400 hover:underline' rel='noreferrer'>Display Jawaban &#8599;</a>
          </div>
          <iframe key={displayUrl} src={displayUrl} className='flex-1 w-full border-0' title='Preview' />
        </div>
      )}
    </div>
  );
}
