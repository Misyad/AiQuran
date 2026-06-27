import { ALL_VERSES, getSurah } from "@/lib/quran/data";

export interface SearchResult {
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
 * Search Quran translations for keyword(s).
 * Returns top-K matches sorted by relevance.
 */
export function searchByTranslation(input: string, topK: number = 5): SearchResult[] {
  const keywords = input
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2)
    .map(w => w.toLowerCase());

  if (keywords.length === 0) return [];

  const scores: { verse: (typeof ALL_VERSES)[0]; score: number }[] = [];

  for (const verse of ALL_VERSES) {
    const translation = verse.translation_id.toLowerCase();
    if (!translation) continue;

    let matchCount = 0;
    for (const kw of keywords) {
      if (translation.includes(kw)) matchCount++;
    }

    if (matchCount > 0) {
      const score = matchCount / keywords.length;
      scores.push({ verse, score });
    }
  }

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
