import { ALL_VERSES, getSurah } from "@/lib/quran/data";
import { normalizeArabic, levenshteinDistance, ngramSimilarity, cosineSimilarity } from "./normalize";

export interface MatchResult {
  surah: number;
  ayah: number;
  confidence: number;
  text_arabic: string;
  translation_id: string;
  page: number;
  juz: number;
  surah_name: string;
}

interface MatchCandidate {
  verse: (typeof ALL_VERSES)[0];
  score: number;
}

/**
 * Main verse matching pipeline.
 * Input: raw Arabic text from ASR.
 * Output: top-3 candidates sorted by confidence.
 */
export function matchVerse(asrText: string, topK: number = 3): MatchResult[] {
  const normalized = normalizeArabic(asrText.trim());
  if (!normalized) return [];

  const candidates: MatchCandidate[] = [];

  for (const verse of ALL_VERSES) {
    const dbNormalized = normalizeArabic(verse.text_arabic);
    if (!dbNormalized) continue;

    let score = 0;

    // 1. Exact match
    if (normalized === dbNormalized) {
      score = 0.99;
    } else {
      // 2. Fuzzy match (Levenshtein-based)
      const maxLen = Math.max(normalized.length, dbNormalized.length);
      const dist = levenshteinDistance(normalized, dbNormalized);
      const levenshteinScore = 1 - dist / maxLen;

      // 3. N-gram similarity
      const ngramScore = ngramSimilarity(normalized, dbNormalized, 3);

      // 4. Cosine similarity
      const cosScore = cosineSimilarity(normalized, dbNormalized);

      // Weighted fusion
      score = levenshteinScore * 0.4 + ngramScore * 0.35 + cosScore * 0.25;
    }

    if (score > 0.3) {
      candidates.push({ verse, score });
    }
  }

  // Sort by score descending, take top K
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, topK);

  return top.map((c) => {
    const surah = getSurah(c.verse.surah);
    return {
      surah: c.verse.surah,
      ayah: c.verse.ayah,
      confidence: Math.round(c.score * 10000) / 10000,
      text_arabic: c.verse.text_arabic,
      translation_id: c.verse.translation_id,
      page: c.verse.page,
      juz: c.verse.juz,
      surah_name: surah?.name_translation || "",
    };
  });
}
