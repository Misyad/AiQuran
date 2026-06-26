import Link from "next/link";
import { ALL_SURAH, ALL_VERSES } from "@/lib/quran/data";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Hero */}
      <header className="bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">&#x1F54A;</span>
            <div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">QLVRS</h1>
              <p className="text-lg text-green-300/80">Quran Live Verse Recognition System</p>
            </div>
          </div>
          <p className="text-green-200/70 max-w-2xl text-lg leading-relaxed">
            Sistem AI real-time untuk mengenali bacaan Al-Qur&apos;an dan menampilkan halaman mushaf secara otomatis. 
            Powered by Whisper AI + Kemenag Mushaf.
          </p>
          <div className="flex flex-wrap gap-3 mt-10">
            <Link href="/display/mushaf"
              className="px-6 py-3 bg-white text-green-900 rounded-xl font-semibold hover:bg-green-50 transition-all hover:scale-105 shadow-lg">
              Buka Mushaf
            </Link>
            <Link href="/operator"
              className="px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all hover:scale-105 backdrop-blur-sm">
              Operator Panel
            </Link>
            <Link href="/recognition"
              className="px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all hover:scale-105 backdrop-blur-sm">
              Recognition
            </Link>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="bg-green-900/90 text-white text-sm border-t border-green-700/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap gap-x-8 gap-y-2">
          {[
            ["114 Surah", "Kitab suci lengkap"],
            ["6.236 Ayat", "Database lokal"],
            ["604 Halaman", "Mushaf Kemenag"],
            ["30 Juz", "Lengkap"],
            ["Phase 1", "Recognition + Matching"],
          ].map(([label, sub]) => (
            <div key={label}>
              <span className="font-semibold text-green-300">{label}</span>
              <span className="text-green-400/50 ml-2">{sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="flex-1 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Mode & Fitur</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: "Mushaf", desc: "Halaman mushaf asli Kemenag dengan navigasi surah dan ayat.", icon: "📖", href: "/display/mushaf", color: "green" },
              { title: "Presentation", desc: "Tampilan ayat besar dengan terjemahan, cocok untuk kajian.", icon: "🖥️", href: "/display/presentation", color: "blue" },
              { title: "OBS Overlay", desc: "Layout streaming dengan background transparan untuk OBS.", icon: "🎬", href: "/display/obs?surah=1&ayah=1", color: "purple" },
              { title: "Recognition", desc: "Rekam bacaan via browser atau upload audio. Auto-match ke ayat.", icon: "🎤", href: "/recognition", color: "red" },
              { title: "Operator Panel", desc: "Kontrol penuh dengan auto-display, statistik live, dan keyboard shortcut.", icon: "🎛️", href: "/operator", color: "amber" },
              { title: 'Remote Display', desc: 'Mode display client untuk proyektor. Dikontrol dari operator panel via WebSocket.', icon: '📺', href: '/display/remote', color: 'indigo' },
            { title: "API", desc: "REST API untuk integrasi dengan sistem lain.", icon: "🔌", href: "/api/quran/surah", color: "slate" },
            ].map((f) => (
              <Link key={f.title} href={f.href}
                className="group block p-6 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-green-700 transition-colors">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-500 text-xs py-6 text-center border-t border-gray-800">
        <p>QLVRS v0.2 — Phase 1 | Data Quran: quran-json | Mushaf: Kemenag RI</p>
        <p className="mt-1">Built with Next.js + Tailwind CSS + OpenAI Whisper</p>
      </footer>
    </div>
  );
}

