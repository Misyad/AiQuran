"use client";

import { useState } from "react";
import AudioRecorder from "@/components/asr/AudioRecorder";
import AudioUploader from "@/components/asr/AudioUploader";

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

export default function RecognitionPage() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [normalized, setNormalized] = useState("");
  const [tab, setTab] = useState<"text" | "record" | "file">("text");

  const handleRecognize = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      setResults(data.matches || []);
      setNormalized(data.normalized_text || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openMushaf = (s: number, a: number) => window.open(`/display/mushaf?surah=${s}&ayah=${a}`, "_blank");
  const openPresentation = (s: number, a: number) => window.open(`/display/presentation?surah=${s}&ayah=${a}`, "_blank");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3">
        <a href="/" className="font-bold text-sm text-green-700">QLVRS</a>
        <div className="flex-1" />
        <div className="flex rounded border border-gray-300 overflow-hidden">
          {(["text", "record", "file"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs ${tab === t ? "bg-green-700 text-white" : "bg-white hover:bg-gray-100 text-gray-600"}`}>
              {t === "text" ? "Teks" : t === "record" ? "Rekam" : "File"}
            </button>
          ))}
        </div>
        <a href="/display/mushaf" className="text-xs text-gray-400 hover:text-gray-700">Mushaf</a>
        <a href="/operator" className="text-xs text-gray-400 hover:text-gray-700">Operator</a>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Recognition</h1>
        <p className="text-sm text-gray-500 mb-6">
          {tab === "text" ? "Masukkan teks Arab untuk dicocokkan dengan ayat." : tab === "record" ? "Rekam bacaan langsung dari mikrofon." : "Upload file audio untuk ditranskripsi."}
        </p>

        {tab === "text" && (
          <div className="mb-6">
            <textarea value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis teks Arab di sini..." rows={3} dir="rtl"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
            <button onClick={handleRecognize} disabled={loading || !input.trim()}
              className="mt-2 px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 text-sm">
              {loading ? "Mencocokkan..." : "Cocokkan Ayat"}
            </button>
          </div>
        )}

        {tab === "record" && <AudioRecorder />}
        {tab === "file" && <AudioUploader />}

        {tab === "text" && normalized && (
          <div className="text-xs text-gray-400 mb-3">Normalisasi: <span dir="rtl">{normalized}</span></div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((r, i) => (
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
                    className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 font-medium">Buka Mushaf</button>
                  <button onClick={() => openPresentation(r.surah, r.ayah)}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 font-medium">Buka Tampilan</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
