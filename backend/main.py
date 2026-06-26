"""
QLVRS Backend — FastAPI + faster-whisper
Phase 1: ASR + Verse Matching
"""

import os
import re
import unicodedata
import json
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="QLVRS Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------ Arabic Normalization ------------ #

def normalize_arabic(text: str) -> str:
    """Normalize Arabic text for matching."""
    text = text.replace("\u0640", "")  # tatwil
    text = re.sub(r"[\u064B-\u0652]", "", text)  # harakat
    text = text.replace("\u0651", "")  # shadda
    text = re.sub(r"[\u0622\u0623\u0625]", "\u0627", text)  # alif variants
    text = re.sub(r"[\u064A\u0649]", "\u064A", text)  # ya variants
    text = text.replace("\u0629", "\u0647")  # ta marbuta
    text = re.sub(r"[\u0624\u0626]", "\u0621", text)  # hamza variants
    text = re.sub(r"[^\u0600-\u06FF\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ------------ Models ------------ #

class RecognizeRequest(BaseModel):
    text: str


class MatchResult(BaseModel):
    surah: int
    ayah: int
    confidence: float
    page: int
    juz: int
    text_arabic: str
    translation_id: str
    surah_name: str


class RecognizeResponse(BaseModel):
    normalized_text: str
    matches: list[MatchResult]
    count: int


# ------------ Verse Matching ------------ #

# Load Quran data
_QURAN_PATH = Path(__file__).parent.parent / "frontend" / "src" / "lib" / "quran" / "quran_id.json"


def load_quran() -> list[dict]:
    """Load quran_id.json and build flat verse list with normalized text."""
    with open(_QURAN_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)

    verses = []
    for surah in raw:
        surah_id = surah["id"]
        surah_name = surah.get("translation", "")
        for v in surah["verses"]:
            ntext = normalize_arabic(v["text"])
            verses.append({
                "surah": surah_id,
                "ayah": v["id"],
                "text": v["text"],
                "normalized": ntext,
                "translation": v.get("translation", ""),
                "surah_name": surah_name,
            })
    return verses


QURAN = load_quran()


def levenshtein(a: str, b: str) -> int:
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            dp[i][j] = dp[i - 1][j - 1] if a[i - 1] == b[j - 1] else 1 + min(
                dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]
            )
    return dp[m][n]


def match_verses(text: str, top_k: int = 3) -> list[MatchResult]:
    """Find top-K matching verses for input text."""
    normalized = normalize_arabic(text.strip())
    if not normalized:
        return []

    candidates: list[tuple[dict, float]] = []

    for v in QURAN:
        db_normalized = v["normalized"]
        if not db_normalized:
            continue

        if normalized == db_normalized:
            score = 0.99
        else:
            max_len = max(len(normalized), len(db_normalized))
            dist = levenshtein(normalized, db_normalized)
            lscore = 1 - dist / max_len if max_len > 0 else 0
            score = lscore

        if score > 0.3:
            candidates.append((v, score))

    candidates.sort(key=lambda x: x[1], reverse=True)
    top = candidates[:top_k]

    results = []
    page_map = {}  # would need page mapping data
    for v, score in top:
        results.append(MatchResult(
            surah=v["surah"],
            ayah=v["ayah"],
            confidence=round(score, 4),
            text_arabic=v["text"],
            translation_id=v["translation"],
            page=page_map.get((v["surah"], v["ayah"]), 0),
            juz=0,
            surah_name=v["surah_name"],
        ))
    return results


# ------------ Routes ------------ #

@app.get("/health")
async def health():
    return {"status": "ok", "verses_loaded": len(QURAN)}


@app.post("/api/v1/recognize", response_model=RecognizeResponse)
async def recognize(req: RecognizeRequest):
    if not req.text.strip():
        raise HTTPException(400, "Empty text")
    matches = match_verses(req.text)
    normalized = normalize_arabic(req.text)
    return RecognizeResponse(
        normalized_text=normalized,
        matches=matches,
        count=len(matches),
    )


@app.post("/api/v1/recognize/audio")
async def recognize_audio(file: UploadFile = File(...)):
    """Receive audio file, transcribe with faster-whisper, then match."""
    # TODO: implement faster-whisper transcription
    return {"error": "Audio transcription not yet implemented"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
