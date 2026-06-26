export type RevelationType = "makkiyah" | "madaniiyah";

export interface SurahInfo {
  id: number;           // 1-114
  name_arabic: string;  // "الفاتحة"
  name_transliteration: string; // "Al-Fatihah"
  name_translation: string; // "Pembukaan"
  type: RevelationType;
  total_verses: number;
  page_start: number;
  page_end: number;
}

export interface Verse {
  id: number;           // global verse ID (1-6236)
  surah: number;        // surah number (1-114)
  ayah: number;         // verse number within surah
  text_arabic: string;  // Arabic text
  translation_id: string; // Indonesian translation
  page: number;         // mushaf page number
  juz: number;          // juz number (1-30)
  hizb: number;         // hizb number (1-60)
  sajdah: boolean;      // is it a sajdah verse?
}

export interface DisplayState {
  surah: number;
  ayah: number;
  page: number;
  juz: number;
  mode: "mushaf" | "presentation" | "obs";
}
