import Link from 'next/link'
import { MessageSquare, Zap, Shield, BarChart3, Users, Clock } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-slate-100 sticky top-0 bg-white z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-blue-600">Mote Blaster</span>
          <div className="flex gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
              Login
            </Link>
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-4 text-center bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full mb-4">
            WhatsApp Blast SaaS
          </span>
          <h1 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Kirim Ribuan Pesan WhatsApp <span className="text-blue-600">dengan Mudah</span>
          </h1>
          <p className="text-xl text-slate-500 mb-8">
            Platform blast WhatsApp profesional. Kelola kontak dari CSV atau Google Sheets,
            personalisasi pesan, dan pantau progres real-time.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login" className="px-8 py-3 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
              Mulai Gratis
            </Link>
            <Link href="#pricing" className="px-8 py-3 text-base font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Lihat Harga
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Fitur Unggulan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: MessageSquare, title: 'Blast Massal',     desc: 'Kirim pesan ke ribuan kontak sekaligus dengan delay otomatis untuk menghindari blokir.' },
              { icon: Zap,           title: 'Template Dinamis', desc: 'Personalisasi pesan dengan variabel {{nama}}, {{kota}}, dan lainnya dari CSV.' },
              { icon: Shield,        title: 'Multi Instance',   desc: 'Kelola banyak nomor WhatsApp sekaligus dari satu dashboard.' },
              { icon: BarChart3,     title: 'Analytics',        desc: 'Pantau progres campaign real-time: sent, failed, dan skipped.' },
              { icon: Users,         title: 'Import Mudah',     desc: 'Import kontak dari CSV atau langsung dari Google Sheets.' },
              { icon: Clock,         title: 'Auto Delay',       desc: 'Delay otomatis antar pesan untuk menjaga keamanan akun WhatsApp.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-6 hover:border-blue-200 transition-colors">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon size={20} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Harga</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="rounded-xl border border-slate-200 bg-white p-8">
              <h3 className="text-xl font-bold text-slate-900">Free</h3>
              <p className="text-4xl font-bold mt-4">Rp 0</p>
              <p className="text-slate-500 text-sm mt-1">Selamanya</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                <li>✓ 50 pesan/hari</li>
                <li>✓ 1 instance WhatsApp</li>
                <li>✓ 2 campaign aktif</li>
                <li>✓ Import CSV</li>
              </ul>
              <Link href="/login" className="mt-8 block w-full py-3 text-center text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                Mulai Gratis
              </Link>
            </div>
            {/* Pro */}
            <div className="rounded-xl border-2 border-blue-500 bg-blue-600 p-8 text-white">
              <h3 className="text-xl font-bold">Pro</h3>
              <p className="text-4xl font-bold mt-4">Rp 99.000</p>
              <p className="text-blue-200 text-sm mt-1">per bulan</p>
              <ul className="mt-6 space-y-3 text-sm text-blue-100">
                <li>✓ Pesan tak terbatas</li>
                <li>✓ 5 instance WhatsApp</li>
                <li>✓ Campaign tak terbatas</li>
                <li>✓ Import CSV & Google Sheets</li>
                <li>✓ Export laporan CSV</li>
                <li>✓ Priority support</li>
              </ul>
              <Link href="/login" className="mt-8 block w-full py-3 text-center text-sm font-medium text-blue-600 bg-white rounded-lg hover:bg-blue-50 transition-colors">
                Upgrade ke Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-100 text-center text-sm text-slate-400">
        © 2025 Mote Blaster. Dibuat dengan ❤️ untuk bisnis Indonesia.
      </footer>
    </div>
  )
}
