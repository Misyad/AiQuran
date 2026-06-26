# PRD — Quran Live Verse Recognition System (QLVRS)

## AI-Powered Real-Time Quran Verse Recognition & Mushaf Display

**Version:** 2.1 (Refined)
**Status:** Phase 0 — Foundation (90%)
**Author:** AI CTO
**Display Engine:** Kemenag Page Images (aktif) + Text-based Presentation (cadangan)

---

# 1. Product Overview

## Vision

Membangun sistem AI pertama yang mampu mengenali bacaan Al-Qur'an secara **real-time** dari suara qari, kemudian secara otomatis menampilkan halaman mushaf yang sesuai pada layar utama tanpa bantuan operator.

---

# 2. Display Engine — Keputusan Arsitektur

## Primary: Kemenag Page Images ✅

Menggunakan gambar halaman mushaf asli dari Kemenag RI:

- **URL Pattern:** `https://media.qurankemenag.net/khat2/QK_{page}.webp`
- **Coverage:** Halaman 1-604 (semua confirmed HTTP 200)
- **Kualitas:** Mushaf Kemenag asli, khat Uthmani, resolusi tinggi
- **Sumber resmi** dari Kementerian Agama RI (media.qurankemenag.net)
- **Keuntungan:** 
  - Autentik, sama persis dengan mushaf cetak Kemenag
  - Tidak perlu render teks Arab
  - Highlight ayat via CSS overlay di atas gambar (Phase 1+)
- **Cache:** Browser cache otomatis (ladenya sekali, setelah itu dari cache)

## Secondary: Text-based Presentation

Mode Presentation tetap menggunakan teks Arab + terjemahan dari dataset lokal (quran-json).

## OBS Overlay

Mode OBS menggunakan text-based (background transparan, bisa dijadikan Browser Source).

---

# 3. Technology Stack (Updated)

## Frontend (Phase 0)

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- **Sources:**
  - Quran text: `quran-json` (npm, CC-BY-4.0)
  - Mushaf images: `media.qurankemenag.net` (resmi Kemenag RI)

---

# 4. Halaman

| Route | Mode | Sumber |
|---|---|---|
| `/` | Landing | - |
| `/display/mushaf` | Mushaf | Gambar Kemenag |
| `/display/presentation` | Presentation | Teks Arab + Terjemah |
| `/display/obs?surah=X&ayah=Y` | OBS | Teks Arab + Terjemah |
| `/operator` | Panel Operator | Preview iframe |
| `/api/quran/surah` | API | Data lokal |
| `/api/quran/ayah?surah=X&ayah=Y` | API | Data lokal |
| `/api/quran/page?id=N` | API | Data lokal |

---

# 5. Project Structure (Updated)

```
frontend/src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── display/mushaf/       # Mushaf — Kemenag images + page nav
│   ├── display/presentation/ # Presentation mode — text-based
│   ├── display/obs/          # OBS overlay — text-based
│   └── operator/             # Operator panel
├── lib/quran/
│   ├── types.ts              # Types
│   ├── data.ts               # Quran DB loader (text)
│   ├── page-breaks.ts        # Page/juz break mapping
│   └── quran_id.json         # Quran text (Arabic + ID)
└── components/quran/
    ├── MushafView.tsx         # Kemenag image viewer
    ├── SurahPicker.tsx        # Surah selector
    └── NavBar.tsx             # Navigation bar
```

---

# 6. Fase Pengembangan (Updated)

### Phase 0 — Foundation ✅ (95%)
- ✅ Next.js + Tailwind CSS
- ✅ Quran database (text + page mapping)
- ✅ Mushaf display — Kemenag images
- ✅ Presentation mode — text-based
- ✅ OBS mode — text-based
- ✅ Operator panel
- ✅ REST API

### Phase 1 — File Recognition
- faster-whisper (local ASR)
- Arabic normalization
- Verse matching engine
- File upload → recognition → display

### Phase 2 — Live Recognition
- Real-time audio capture
- WebSocket streaming
- Confidence engine
- Auto-display + operator override

### Phase 3 — Advanced
- OpenRouter fallback
- Multi-display
- Session history
- Multi-qira'at

---

**Next Phase:** Backend FastAPI + faster-whisper integration.
