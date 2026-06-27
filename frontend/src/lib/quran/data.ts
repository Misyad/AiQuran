import quranData from "./quran_id.json";
import { PAGE_BREAKS, JUZ_BREAKS } from "./page-breaks";
import type { Verse, SurahInfo } from "./types";

type RawSurah = {
  id: number;
  name: string;
  transliteration: string;
  translation: string;
  type: "meccan" | "medinan";
  total_verses: number;
  verses: { id: number; text: string; translation: string }[];
};

type RevelationType = "makkiyah" | "madaniiyah";

// Build page -> [surah, ayah] lookup
const pageStartMap = new Map<number, { surah: number; ayah: number }>();
for (const [page, surah, ayah] of PAGE_BREAKS) {
  pageStartMap.set(page, { surah, ayah });
}

// Build juz -> [surah, ayah] lookup
const juzStartMap = new Map<number, { surah: number; ayah: number }>();
for (const [juz, surah, ayah] of JUZ_BREAKS) {
  juzStartMap.set(juz, { surah, ayah });
}

function findPage(surahId: number, ayahNumber: number): number {
  let currentPage = 1;
  for (const [page, surah, ayah] of PAGE_BREAKS) {
    if (surah > surahId || (surah === surahId && ayah > ayahNumber)) {
      break;
    }
    currentPage = page;
  }
  return currentPage;
}

function findJuz(surahId: number, ayahNumber: number): number {
  let currentJuz = 1;
  for (const [juz, surah, ayah] of JUZ_BREAKS) {
    if (surah > surahId || (surah === surahId && ayah > ayahNumber)) {
      break;
    }
    currentJuz = juz;
  }
  return currentJuz;
}

export const ALL_SURAH: SurahInfo[] = [];
export const ALL_VERSES: Verse[] = [];

let globalId = 1;
const rawQuran = quranData as unknown as RawSurah[];

for (const surah of rawQuran) {
  const surahId = surah.id;
  const type: RevelationType = surah.type === "meccan" ? "makkiyah" : "madaniiyah";
  let pageStart = 604;
  let pageEnd = 1;

  for (const verse of surah.verses) {
    const ayahNum = verse.id;
    const page = findPage(surahId, ayahNum);
    const juz = findJuz(surahId, ayahNum);

    if (page < pageStart) pageStart = page;
    if (page > pageEnd) pageEnd = page;

    ALL_VERSES.push({
      id: globalId++,
      surah: surahId,
      ayah: ayahNum,
      text_arabic: verse.text,
      translation_id: verse.translation || "",
      page,
      juz,
      hizb: Math.ceil(juz * 2) - 1,
      sajdah: false,
    });
  }

  ALL_SURAH.push({
    id: surahId,
    name_arabic: surah.name,
    name_transliteration: surah.transliteration,
    name_translation: surah.translation,
    type,
    total_verses: surah.total_verses,
    page_start: pageStart,
    page_end: pageEnd,
  });
}

export function getVersesByPage(page: number): Verse[] {
  return ALL_VERSES.filter((v) => v.page === page);
}

export function getAyah(surahId: number, ayahNumber: number): Verse | undefined {
  return ALL_VERSES.find((v) => v.surah === surahId && v.ayah === ayahNumber);
}

export function getSurah(surahId: number): SurahInfo | undefined {
  return ALL_SURAH.find((s) => s.id === surahId);
}

export function getPageByAyah(surahId: number, ayahNumber: number): number {
  return findPage(surahId, ayahNumber);
}

/**
 * Search translations for keyword(s).
 */
export function searchTranslations(keywords: string): Verse[] {
  const kw = keywords.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (kw.length === 0) return [];

  const scored = ALL_VERSES
    .map(v => {
      const trans = v.translation_id.toLowerCase();
      const matchCount = kw.filter(k => trans.includes(k)).length;
      return { verse: v, score: matchCount / kw.length };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const seen = new Set<number>();
  return scored.filter(s => {
    if (seen.has(s.verse.id)) return false;
    seen.add(s.verse.id);
    return true;
  }).slice(0, 10).map(s => s.verse);
}
