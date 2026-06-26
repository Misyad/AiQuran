import { ALL_VERSES, getSurah } from "@/lib/quran/data";
import { normalizeArabic, levenshteinDistance, jaroWinklerSimilarity, ngramSimilarity, cosineSimilarity } from "./normalize";

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

/**
 * Verse matching with enhanced multi-algorithm fusion.
 */
export function matchVerse(asrText: string, topK: number = 3): MatchResult[] {
  const normalized = normalizeArabic(asrText.trim());
  if (!normalized || normalized.length < 2) return [];

  const inputWords = normalized.split(/\s+/).filter(Boolean);
  const inputLen = normalized.length;

  const scores: { verse: (typeof ALL_VERSES)[0]; score: number }[] = [];

  for (const verse of ALL_VERSES) {
    const dbNorm = normalizeArabic(verse.text_arabic);
    if (!dbNorm || dbNorm.length < 2) continue;

    let score = 0;

    // 1. Exact match → highest confidence
    if (normalized === dbNorm) {
      scores.push({ verse, score: 0.99 });
      continue;
    }

    // 2. Exact substring match (input is entirely contained in verse)
    if (dbNorm.includes(normalized)) {
      const lengthRatio = inputLen / dbNorm.length;
      score = 0.7 + lengthRatio * 0.25; // longer segment → higher confidence
      scores.push({ verse, score: Math.min(score, 0.95) });
      continue;
    }

    // 3. Exact prefix match (input matches start of verse)
    if (dbNorm.startsWith(normalized)) {
      const lengthRatio = inputLen / dbNorm.length;
      score = 0.6 + lengthRatio * 0.3;
      scores.push({ verse, score: Math.min(score, 0.92) });
      continue;
    }

    // 4. Word overlap
    const dbWords = dbNorm.split(/\s+/).filter(Boolean);
    const wordOverlap = inputWords.filter(w => dbWords.includes(w)).length / inputWords.length;
    if (wordOverlap > 0.5) {
      score = wordOverlap * 0.5;
    }

    // 5. Jaro-Winkler (best for short Arabic strings)
    const jw = jaroWinklerSimilarity(normalized, dbNorm);

    // 6. Levenshtein-based
    const maxLen = Math.max(inputLen, dbNorm.length);
    const lev = 1 - levenshteinDistance(normalized, dbNorm) / maxLen;

    // 7. N-gram similarity
    const ng = ngramSimilarity(normalized, dbNorm, 3);

    // 8. Bigram cosine
    const cos = cosineSimilarity(normalized, dbNorm);

    // Weighted fusion — tuned for Arabic Quran matching
    const fused =
      jw * 0.35 +
      lev * 0.25 +
      ng * 0.20 +
      cos * 0.10 +
      (score > 0 ? score * 0.10 : 0);

    if (fused > 0.30) {
      scores.push({ verse, score: Math.min(fused, 0.98) });
    }
  }

  // Sort descending, deduplicate by verse, take top K
  scores.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const top = scores.filter(s => {
    const key = s.verse.surah + ":" + s.verse.ayah;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, topK);

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
