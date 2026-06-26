"use client";

import { useState, useRef, useCallback } from "react";

interface MatchResult {
  surah: number;
  ayah: number;
  confidence: number;
  text_arabic: string;
  translation_id: string;
  page: number;
  juz: number;
  surah_name: string;
}

type Status = "idle" | "recording" | "transcribing" | "done" | "error";

export default function AudioRecorder() {
  const [status, setStatus] = useState<Status>("idle");
  const [transcription, setTranscription] = useState("");
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [error, setError] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mode, setMode] = useState<"browser" | "api">("browser");

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTime = useRef(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscript = useRef("");

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    mediaRecorder.current = null;
    chunks.current = [];
  }, []);

  const openMushaf = (surah: number, ayah: number) =>
    window.open(`/display/mushaf?surah=${surah}&ayah=${ayah}`, "_blank");

  const openPresentation = (surah: number, ayah: number) =>
    window.open(`/display/presentation?surah=${surah}&ayah=${ayah}`, "_blank");

  // Browser STT
  const startBrowserSTT = async () => {
    setMatches([]); setTranscription(""); setError("");
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Speech Recognition tidak didukung. Gunakan Chrome."); setStatus("error"); return; }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "ar";
    recognitionRef.current = recognition;
    finalTranscript.current = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript.current += event.results[i][0].transcript;
        else interim = event.results[i][0].transcript;
      }
      setTranscription(finalTranscript.current + interim);
    };
    recognition.onerror = (e: any) => { setError(`Error: ${e.error}`); setStatus("error"); };
    recognition.onend = () => { if (status === "recording") try { recognition.start(); } catch {} };

    recognition.start();
    startTime.current = Date.now();
    setStatus("recording");
    setRecordingDuration(0);
    timerRef.current = setInterval(() => setRecordingDuration(Math.floor((Date.now() - startTime.current) / 1000)), 1000);
  };

  const stopBrowserSTT = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus("transcribing");
    const text = finalTranscript.current.trim();
    setTranscription(text);
    import("@/lib/asr/matcher").then(({ matchVerse }) => setMatches(matchVerse(text)));
    setStatus("done");
  };

  // API recording
  const startAPIRecording = async () => {
    setMatches([]); setTranscription(""); setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.current = recorder;
      chunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = () => sendToWhisper(new Blob(chunks.current, { type: "audio/webm" }));
      recorder.start(250);
      startTime.current = Date.now();
      setStatus("recording");
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(Math.floor((Date.now() - startTime.current) / 1000)), 1000);
    } catch { setError("Mic access denied"); setStatus("error"); }
  };

  const stopAPIRecording = () => {
    mediaRecorder.current?.stop();
    setStatus("transcribing");
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const sendToWhisper = async (blob: Blob) => {
    try {
      const fd = new FormData(); fd.append("audio", blob, "audio.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal"); setStatus("error"); return; }
      setTranscription(data.transcription || "");
      setMatches(data.matches || []);
      setStatus("done");
    } catch { setError("Network error"); setStatus("error"); }
    finally { cleanup(); }
  };

  const startRecording = mode === "browser" ? startBrowserSTT : startAPIRecording;
  const stopRecording = mode === "browser" ? stopBrowserSTT : stopAPIRecording;

  return (
    <div>
      {/* Mode switch */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex rounded border border-gray-300 overflow-hidden">
          {(["browser", "api"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} disabled={status === "recording"}
              className={`px-3 py-1 text-xs ${mode === m ? "bg-green-700 text-white" : "bg-white hover:bg-gray-100 text-gray-600"} disabled:opacity-50`}>
              {m === "browser" ? "Browser STT" : "Whisper API"}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-6">
        {status === "idle" && (
          <button onClick={startRecording}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
            <span className="w-3 h-3 rounded-full bg-white" /> Mulai Rekam
          </button>
        )}
        {status === "recording" && (
          <>
            <button onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm font-medium">
              <span className="w-3 h-3 rounded bg-red-500 animate-pulse" />
              Stop ({Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, "0")})
            </button>
            <span className="flex items-center gap-1 text-xs text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Merekam...
            </span>
          </>
        )}
        {status === "transcribing" && (
          <span className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Mencocokkan...
          </span>
        )}
        {(status === "done" || status === "error") && (
          <button onClick={() => setStatus("idle")} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">
            Rekam Lagi
          </button>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">{error}</div>}

      {transcription && (
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-1">Transkripsi:</div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-right text-lg leading-loose" dir="rtl">{transcription}</div>
        </div>
      )}

      {matches.length > 0 && (
        <div className="space-y-3">
          {matches.map((r, i) => (
            <div key={`${r.surah}-${r.ayah}`}
              className={`p-4 rounded-lg border ${i === 0 ? "bg-green-50 border-green-300" : "bg-white border-gray-200"}`}>
              <div className="flex items-start justify-between mb-1">
                <span className="font-semibold text-sm">{r.surah}. {r.surah_name} — Ayat {r.ayah}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${r.confidence >= 0.8 ? "bg-green-100 text-green-800" : r.confidence >= 0.6 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                  {(r.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-right text-lg mb-1" dir="rtl">{r.text_arabic}</div>
              <p className="text-sm text-gray-600 mb-3">{r.translation_id}</p>
              <div className="flex items-center gap-2 text-xs">
                <button onClick={() => openMushaf(r.surah, r.ayah)}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 font-medium">
                  Buka Mushaf
                </button>
                <button onClick={() => openPresentation(r.surah, r.ayah)}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 font-medium">
                  Buka Tampilan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
