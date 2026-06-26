'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { getSurah, getAyah, getVersesByPage } from '@/lib/quran/data';
import { useWebSocket } from '@/lib/ws/useWebSocket';
import SurahPicker from '@/components/quran/SurahPicker';
import AudioWaveform from '@/components/asr/AudioWaveform';

type DisplayMode = 'mushaf' | 'presentation' | 'obs';

interface MatchCandidate {
  surah: number; ayah: number; confidence: number;
  text_arabic: string; translation_id: string; surah_name: string;
}

export default function OperatorPage() {
  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState(1);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('mushaf');
  const [autoMode, setAutoMode] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [transcription, setTranscription] = useState('');
  const [session, setSession] = useState<{ id: string; status: 'idle' | 'running'; history: any[] }>({ id: '', status: 'idle', history: [] });
  const [isListening, setIsListening] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [stats, setStats] = useState({ total: 0, autoDisplay: 0 });
  const [sidebar, setSidebar] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscript = useRef('');
  const streamRef = useRef<MediaStream | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => setMounted(true), []);

  const { connected, clientCount, send } = useWebSocket('controller');
  const broadcast = useCallback((s: number, a: number, mode: DisplayMode) => {
    send({ type: 'display_update', surah: s, ayah: a, displayMode: mode });
  }, [send]);

  // Touch swipe for ayah nav
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      const total = getSurah(surah)?.total_verses || 7;
      if (dx < 0) setAyah(a => Math.min(total, a + 1));
      else setAyah(a => Math.max(1, a - 1));
    }
  }, [surah]);

  const changeAyah = useCallback((a: number) => {
    setAyah(a); broadcast(surah, a, displayMode);
  }, [broadcast, surah, displayMode]);
  const changeSurah = useCallback((s: number) => {
    setSurah(s); setAyah(1); broadcast(s, 1, displayMode);
  }, [broadcast, displayMode]);
  const changeMode = useCallback((m: DisplayMode) => {
    setDisplayMode(m); broadcast(surah, ayah, m);
  }, [broadcast, surah, ayah]);

  // Session
  const startSession = async () => {
    setSession({ id: Date.now().toString(36), status: 'running', history: [] });
    setStats({ total: 0, autoDisplay: 0 });
    try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); streamRef.current = s; setAudioStream(s); } catch {}
    startListening();
  };
  const stopSession = () => {
    stopListening();
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); setAudioStream(null); }
    setSession(prev => ({ ...prev, status: 'idle' }));
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'ar';
    recognitionRef.current = recognition; finalTranscript.current = ''; setIsListening(true);
    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      finalTranscript.current = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript.current = event.results[i][0].transcript;
      }
      const text = finalTranscript.current.trim();
      if (!text) return;
      setTranscription(text);
      try {
        const res = await fetch('/api/recognize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
        const data = await res.json();
        if (!data.matches?.length) return;
        setCandidates(data.matches);
        setSession(prev => ({ ...prev, history: [{ timestamp: new Date(), transcription: text, result: data.matches[0], autoDisplayed: false }, ...prev.history] }));
        setStats(prev => ({ ...prev, total: prev.total + 1 }));
        if (autoMode && data.matches[0].confidence >= 0.85) {
          setSurah(data.matches[0].surah); setAyah(data.matches[0].ayah);
          broadcast(data.matches[0].surah, data.matches[0].ayah, displayMode);
          setStats(prev => ({ ...prev, autoDisplay: prev.autoDisplay + 1 }));
        }
        send({ type: 'display_update', surah: data.matches[0].surah, ayah: data.matches[0].ayah, displayMode, transcription: text, confidence: data.matches[0].confidence });
      } catch {}
    };
    recognition.onerror = () => {};
    recognition.onend = () => { if (isListening) try { recognition.start(); } catch {} };
    recognition.start();
  };
  const stopListening = () => { recognitionRef.current?.stop(); recognitionRef.current = null; setIsListening(false); };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      const total = getSurah(surah)?.total_verses || 7;
      switch (e.key) {
        case 'ArrowLeft': changeAyah(Math.max(1, ayah - 1)); e.preventDefault(); break;
        case 'ArrowRight': changeAyah(Math.min(total, ayah + 1)); e.preventDefault(); break;
        case 'ArrowUp': changeSurah(Math.max(1, surah - 1)); e.preventDefault(); break;
        case 'ArrowDown': changeSurah(Math.min(114, surah + 1)); e.preventDefault(); break;
        case '1': if (candidates[0]) changeAyah(candidates[0].ayah); break;
        case '2': if (candidates[1]) changeAyah(candidates[1].ayah); break;
        case '3': if (candidates[2]) changeAyah(candidates[2].ayah); break;
        case 'a': case 'A': setAutoMode(v => !v); break;
        case 'm': case 'M': changeMode(displayMode === 'mushaf' ? 'presentation' : displayMode === 'presentation' ? 'obs' : 'mushaf'); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [surah, ayah, candidates, displayMode, changeAyah, changeSurah, changeMode]);

  const surahInfo = getSurah(surah);
  const verse = getAyah(surah, ayah);
  const ayahCount = surahInfo?.total_verses || 7;
  const page = verse?.page || 1;
  const pageVerses = useMemo(() => getVersesByPage(page), [page]);
  const displayUrl = useMemo(() => {
    if (!mounted) return '';
    const base = window.location.origin;
    if (displayMode === 'mushaf') return base + '/display/mushaf?surah=' + surah + '&ayah=' + ayah;
    if (displayMode === 'presentation') return base + '/display/presentation?surah=' + surah + '&ayah=' + ayah;
    return base + '/display/obs?surah=' + surah + '&ayah=' + ayah;
  }, [surah, ayah, displayMode, mounted]);

  const exportCSV = () => {
    const rows = [['Waktu', 'Transkripsi', 'Surah', 'Ayat', 'Confidence', 'Auto']];
    session.history.forEach((e: any) => rows.push([e.timestamp.toISOString(), e.transcription, String(e.result?.surah || ''), String(e.result?.ayah || ''), String(e.result?.confidence || ''), e.autoDisplayed ? 'Ya' : 'Tidak']));
    const csv = rows.map(r => r.map(c => '"' + c + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'qlvrs-session-' + session.id + '.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className='flex h-screen bg-gray-50 overflow-hidden'>
      {/* Mobile sidebar toggle */}
      <button onClick={() => setSidebar(!sidebar)} className='md:hidden fixed top-2 left-2 z-50 w-10 h-10 bg-gray-900 text-white rounded-lg flex items-center justify-center shadow-lg text-lg'>
        {sidebar ? '\u2715' : '\u2630'}
      </button>

      {/* Sidebar - responsive */}
      <div className={'fixed md:relative z-40 h-full w-80 bg-gray-900 text-white flex flex-col overflow-y-auto transition-transform duration-300 ' + (sidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0')}>
        <div className='p-3 md:p-4 border-b border-gray-700 space-y-1'>
          <div className='flex items-center justify-between'>
            <h1 className='text-base md:text-lg font-bold text-green-400'>Operator</h1>
            <div className='flex items-center gap-2'>
              {connected && <span className='text-xs text-green-500'>{clientCount.displays} disp</span>}
              <span className={'text-xs px-2 py-0.5 rounded ' + (session.status === 'running' ? 'bg-green-700 text-green-200' : 'bg-gray-700 text-gray-400')}>
                {session.status === 'running' ? 'LIVE' : 'Idle'}
              </span>
            </div>
          </div>
          <p className='text-xs text-gray-500'>Auto: {autoMode ? 'ON' : 'OFF'} &middot; {displayMode} &middot; WS: {connected ? 'OK' : '...'}</p>
        </div>

        {/* Waveform + Session - bigger touch targets */}
        <div className='p-3 md:p-4 border-b border-gray-700 space-y-2'>
          <AudioWaveform stream={audioStream} active={session.status === 'running'} />
          <div className='flex gap-2'>
            {session.status === 'idle' ? (
              <button onClick={startSession} className='flex-1 py-3 md:py-2 bg-green-700 hover:bg-green-600 rounded text-sm font-medium text-lg md:text-sm'>Mulai Sesi</button>
            ) : (
              <button onClick={stopSession} className='flex-1 py-3 md:py-2 bg-red-700 hover:bg-red-600 rounded text-sm font-medium text-lg md:text-sm'>Stop</button>
            )}
          </div>
        </div>

        {/* Candidates - bigger touch */}
        {candidates.length > 0 && (
          <div className='p-3 md:p-4 border-b border-gray-700'>
            <label className='text-xs text-gray-400 mb-2 block'>Kandidat (1-3):</label>
            <div className='space-y-1.5'>
              {candidates.map((r, i) => (
                <button key={i} onClick={() => { setSurah(r.surah); setAyah(r.ayah); broadcast(r.surah, r.ayah, displayMode); }}
                  className={'w-full text-left px-3 md:px-3 py-3 md:py-2 rounded text-sm md:text-xs ' + (i === 0 ? 'bg-green-800 text-white ring-1 ring-green-500' : 'bg-gray-800 text-gray-300 hover:bg-gray-700')}>
                  <span className='block font-medium text-base md:text-xs'>[{i + 1}] {r.surah}. {r.surah_name} : {r.ayah}</span>
                  <span className='block text-right text-base md:text-sm mt-1' dir='rtl'>{r.text_arabic}</span>
                  <span className='block text-xs text-gray-400'>{(r.confidence * 100).toFixed(1)}%</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {session.status === 'running' && session.history.length > 0 && (
          <div className='p-3 md:p-4 border-b border-gray-700'>
            <label className='text-xs text-gray-400 mb-2 block'>Statistik:</label>
            <div className='grid grid-cols-3 gap-2 text-center'>
              <div className='bg-gray-800 rounded p-3 md:p-2'><div className='text-xl md:text-lg font-bold text-white'>{stats.total}</div><div className='text-xs text-gray-400'>Total</div></div>
              <div className='bg-gray-800 rounded p-3 md:p-2'><div className='text-xl md:text-lg font-bold text-green-400'>{stats.autoDisplay}</div><div className='text-xs text-gray-400'>Auto</div></div>
              <div className='bg-gray-800 rounded p-3 md:p-2'><div className='text-xl md:text-lg font-bold text-yellow-400'>{stats.total > 0 ? Math.round(stats.autoDisplay / stats.total * 100) : 0}%</div><div className='text-xs text-gray-400'>Rate</div></div>
            </div>
          </div>
        )}

        {/* Manual controls - bigger for touch */}
        <div className='p-3 md:p-4 space-y-3 border-b border-gray-700'>
          <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <label className='text-xs text-gray-400 mb-1 block'>Surah (&uarr;&darr; / swipe &larr;&rarr;)</label>
            <SurahPicker selected={surah} onSelect={changeSurah} />
          </div>
          <div>
            <label className='text-xs text-gray-400 mb-1 block'>Ayat</label>
            <div className='flex gap-2'>
              <button onClick={() => changeAyah(Math.max(1, ayah - 1))} className='px-4 md:px-3 py-3 md:py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-30 text-lg md:text-sm' disabled={ayah <= 1}>&#8592;</button>
              <select value={ayah} onChange={(e) => changeAyah(Number(e.target.value))} className='flex-1 px-3 md:px-2 py-3 md:py-2 rounded bg-gray-800 border border-gray-700 text-white text-base md:text-sm'>
                {Array.from({ length: ayahCount }, (_, i) => i + 1).map((n) => (<option key={n} value={n}>Ayat {n}</option>))}
              </select>
              <button onClick={() => changeAyah(Math.min(ayahCount, ayah + 1))} className='px-4 md:px-3 py-3 md:py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-30 text-lg md:text-sm' disabled={ayah >= ayahCount}>&#8594;</button>
            </div>
          </div>
          <div>
            <label className='text-xs text-gray-400 mb-1 block'>Mode (M):</label>
            <div className='flex rounded overflow-hidden border border-gray-700'>
              {(['mushaf', 'presentation', 'obs'] as const).map((m) => (
                <button key={m} onClick={() => changeMode(m)} className={'flex-1 py-3 md:py-2 text-sm md:text-xs ' + (displayMode === m ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>
                  {m === 'mushaf' ? 'Mushaf' : m === 'presentation' ? 'Tampilan' : 'OBS'}
                </button>
              ))}
            </div>
          </div>
          <label className='flex items-center gap-2 text-sm cursor-pointer py-2'>
            <input type='checkbox' checked={autoMode} onChange={(e) => setAutoMode(e.target.checked)} className='rounded w-5 h-5' />
            Auto (A) &ge; 85%
          </label>
        </div>

        {/* Page jump */}
        <div className='p-3 md:p-4 border-b border-gray-700'>
          <label className='text-xs text-gray-400 mb-2 block'>Halaman {page}:</label>
          <div className='flex flex-wrap gap-1.5 max-h-32 overflow-y-auto'>
            {pageVerses.map((v) => (
              <button key={v.id} onClick={() => { setSurah(v.surah); setAyah(v.ayah); broadcast(v.surah, v.ayah, displayMode); }}
                className={'px-3 md:px-2 py-2 md:py-1 text-sm md:text-xs rounded ' + (v.surah === surah && v.ayah === ayah ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700')}>
                {v.surah}:{v.ayah}
              </button>
            ))}
          </div>
        </div>

        <div className='p-4 text-xs text-gray-500'>{surahInfo?.name_translation} {ayah}/{ayahCount} &middot; Juz {verse?.juz || '-'} &middot; Hal {page}</div>
      </div>

      {/* Preview */}
      {mounted && (
        <div className='flex-1 bg-black flex flex-col md:ml-0 ml-0'>
          <div className='flex items-center gap-2 px-3 md:px-4 py-2 md:py-1.5 bg-gray-800 text-xs text-gray-400'>
            <span className='hidden md:inline'>Preview:</span>
            {connected && <span className='text-green-500 hidden md:inline flex items-center gap-1'><span className='w-1.5 h-1.5 rounded-full bg-green-500' /> WS</span>}
            {session.status === 'running' && <span className='text-green-500 flex items-center gap-1 ml-auto'><span className='w-2 h-2 rounded-full bg-green-500 animate-pulse' /> LIVE</span>}
            <span className='ml-auto md:ml-0 text-white/80 text-xs'>{surahInfo?.name_translation} {ayah}</span>
          </div>
          <iframe key={displayUrl} src={displayUrl} className='flex-1 w-full border-0' title='Preview' />
        </div>
      )}
    </div>
  );
}

