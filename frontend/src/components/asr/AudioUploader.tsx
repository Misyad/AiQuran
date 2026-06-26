"use client";

import { useState, useRef } from "react";

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

export default function AudioUploader() {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [transcription, setTranscription] = useState("");
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const openMushaf = (surah: number, ayah: number) =>
    window.open(`/display/mushaf?surah=${surah}&ayah=${ayah}`, "_blank");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setTranscription(""); setMatches([]);
    setStatus("uploading");

    try {
      const fd = new FormData();
      fd.append("audio", file);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal");
        setStatus("error");
        return;
      }

      setTranscription(data.transcription || "");
      setMatches(data.matches || []);
      setStatus("done");
    } catch {
      setError("Network error");
      setStatus("error");
    }
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept="audio/*" onChange={handleFile} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={status === "uploading"}
        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
      >
        {status === "uploading" ? "Memproses..." : "Pilih File Audio"}
      </button>
      {status === "uploading" && (
        <span className="ml-3 text-sm text-gray-500">Mengupload & memproses...</span>
      )}

      {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {transcription && (
        <div className="mt-4 mb-4">
          <div className="text-xs text-gray-400 mb-1">Transkripsi:</div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-right" dir="rtl">{transcription}</div>
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
              <button onClick={() => openMushaf(r.surah, r.ayah)}
                className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-xs font-medium">
                Buka Mushaf
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
