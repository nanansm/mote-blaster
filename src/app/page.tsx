'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu, ChevronDown } from 'lucide-react'

/* ── Blob decoration ─────────────────────────────────── */
const Blob = ({ color, className }: { color: string; className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
    <path
      fill={color}
      d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.6,90,-16.3,88.5,-0.9C87,14.6,81.4,29.2,73.3,42.1C65.2,55,54.6,66.2,41.7,73.4C28.8,80.6,14.4,83.8,-0.9,85.3C-16.2,86.8,-32.4,86.6,-44.9,79.7C-57.4,72.8,-66.2,59.2,-73.3,45.1C-80.4,31,-85.8,15.5,-85.6,0.1C-85.4,-15.3,-79.6,-30.6,-71.2,-44C-62.8,-57.4,-51.8,-68.9,-38.7,-76.5C-25.6,-84.1,-10,-87.7,5.2,-86.3C20.4,-84.9,30.6,-83.6,44.7,-76.4Z"
      transform="translate(100 100)"
    />
  </svg>
)

/* ── FAQ accordion item ───────────────────────────────── */
const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-200">
      <button
        className="w-full text-left py-5 flex justify-between items-start gap-4 font-semibold text-[#1a3a2a] text-lg"
        onClick={() => setOpen(!open)}
      >
        <span>{question}</span>
        <ChevronDown
          size={20}
          className={`shrink-0 mt-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <p className="pb-5 text-gray-600 text-base leading-relaxed">{answer}</p>}
    </div>
  )
}

/* ── Landing page ─────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ fontFamily: 'var(--font-jakarta, sans-serif)' }}>

      {/* ── NAVBAR ─────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wtextlogosquare.webp" alt="Mote Blaster" className="h-9 hidden md:block" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wlogogramsquare.webp" alt="Mote Blaster" className="h-12 md:hidden" />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {['Fitur', 'Cara Kerja', 'Harga', 'FAQ'].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(' ', '-')}`}
                className="text-sm font-semibold text-[#1a3a2a] hover:opacity-60 transition-opacity"
              >
                {label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-[#1a3a2a] hover:opacity-60 transition-opacity">
              Masuk
            </Link>
            <Link
              href="/login"
              className="bg-[#F5E642] text-[#1a3a2a] text-sm font-bold px-5 py-2 rounded-full hover:opacity-90 transition-opacity"
            >
              Mulai Gratis
            </Link>
          </div>

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger className="md:hidden p-2 text-[#1a3a2a] flex items-center justify-center">
              <Menu size={24} />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-white">
              <div className="flex flex-col gap-6 mt-10 px-2">
                {['Fitur', 'Cara Kerja', 'Harga', 'FAQ'].map((label) => (
                  <a
                    key={label}
                    href={`#${label.toLowerCase().replace(' ', '-')}`}
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-semibold text-[#1a3a2a]"
                  >
                    {label}
                  </a>
                ))}
                <hr className="border-gray-200" />
                <Link href="/login" className="text-lg font-semibold text-[#1a3a2a]" onClick={() => setMobileOpen(false)}>
                  Masuk
                </Link>
                <Link
                  href="/login"
                  className="bg-[#F5E642] text-[#1a3a2a] text-center font-bold px-5 py-3 rounded-full"
                  onClick={() => setMobileOpen(false)}
                >
                  Mulai Gratis
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────── */}
      <section className="relative min-h-screen bg-[#F5E642] flex items-center overflow-hidden pt-16">
        {/* Blob decorations — hidden on mobile for performance */}
        <Blob
          color="#F97316"
          className="absolute -top-20 -left-20 w-72 h-64 md:w-96 md:h-80 opacity-90 pointer-events-none hidden md:block rotate-[-20deg]"
        />
        <Blob
          color="#E8A598"
          className="absolute top-1/3 -right-16 w-64 h-80 opacity-85 pointer-events-none hidden md:block"
        />
        <Blob
          color="#86C67C"
          className="absolute bottom-0 left-1/4 w-48 h-48 opacity-80 pointer-events-none hidden md:block"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-28 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left — copy */}
            <div>
              <span className="inline-block bg-white text-black-600 text-xs font-bold px-4 py-1 rounded-full mb-6 tracking-wide">
                Made with 🗿 by Mote Kreatif
              </span>
              <h1 className="text-5xl md:text-7xl lg:text-5xl font-black text-[#1a3a2a] leading-[0.92] tracking-tight mb-6">
                Kirim Ribuan Pesan WA dalam Hitungan Menit
              </h1>
              <p className="text-lg md:text-xl text-[#1a3a2a]/80 max-w-lg mb-8 font-medium leading-relaxed">
                Platform blast WhatsApp profesional untuk bisnis Indonesia. Import kontak dari CSV atau Google Sheets,
                personalisasi setiap pesan, pantau pengiriman real-time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/login"
                  className="bg-[#1a3a2a] text-[#F5E642] rounded-full px-8 py-4 text-lg font-black hover:opacity-90 transition-opacity text-center"
                >
                  Mulai Gratis →
                </Link>
                <a
                  href="#cara-kerja"
                  className="border-2 border-[#1a3a2a] text-[#1a3a2a] rounded-full px-8 py-4 text-lg font-bold hover:bg-[#1a3a2a]/5 transition-colors text-center"
                >
                  Lihat Cara Kerja
                </a>
              </div>
            </div>

            {/* Right — floating stats card */}
            <div>
              <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-sm mx-auto lg:ml-auto">
                <p className="text-sm text-gray-400 font-medium mb-4">Dashboard Overview</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-green-600 font-bold text-lg">2.847 WA terkirim hari ini</p>
                    <div className="mt-2 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '87%' }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">87% dari target harian</p>
                  </div>
                  <div className="flex items-center justify-between py-3 border-t border-gray-100">
                    <span className="text-gray-700 font-semibold">3 instance aktif</span>
                    <span className="flex items-center gap-1.5 text-green-600 text-sm font-semibold">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                      Online
                    </span>
                  </div>
                  <div className="py-3 border-t border-gray-100">
                    <p className="text-4xl font-black text-[#1a3a2a]">98.2%</p>
                    <p className="text-gray-500 text-sm font-medium">delivery rate</p>
                  </div>
                  <div className="flex items-center gap-2 bg-green-50 rounded-xl px-4 py-2.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                    <span className="text-green-700 text-sm font-bold">🟢 Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM → SOLUTION ─────────────────────────── */}
      <section id="fitur" className="py-20 md:py-28 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Problem / Solution split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center mb-36">
            {/* Problem */}
            <div>
            <span className="inline-block bg-[#FF0000] text-white text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-wide">
                Masalah Kamu hari ini?
              </span>
              <h2 className="text-4xl md:text-4xl font-black text-[#1a3a2a] leading-tight mb-8">
                Capek kirim WA satu-satu?
              </h2>
              <ul className="space-y-5">
                {[
                  { emoji: '😫', text: 'Kirim manual ke ratusan kontak butuh berjam-jam' },
                  { emoji: '📋', text: 'Copy-paste nama satu per satu, rawan typo dan lupa' },
                  { emoji: '📊', text: 'Nggak tahu berapa yang sudah terkirim atau gagal' },
                ].map(({ emoji, text }) => (
                  <li key={text} className="flex items-start gap-4 text-lg text-gray-700 font-medium">
                    <span className="text-2xl leading-none mt-0.5">{emoji}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Solution */}
            <div>
              <span className="inline-block bg-[#008000] text-white text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-wide">
                Solusinya
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-[#1a3a2a] leading-tight mb-4">
                Mote Blaster otomasi semua itu.
              </h2>
              <p className="text-lg text-gray-600 font-medium leading-relaxed">
                Satu platform untuk import kontak, personalisasi pesan, kirim massal, dan monitor real-time — semua otomatis.
              </p>
            </div>
          </div>

          {/* Feature grid headline */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-[#1a3a2a] leading-tight">
              Semua yang kamu butuhkan<br />untuk blast WA
            </h2>
          </div>

          {/* 6-card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '📤',
                title: 'Blast Massal',
                desc: 'Kirim ke ribuan kontak sekaligus dengan delay otomatis agar akun WA aman dari banned.',
              },
              {
                icon: '📁',
                title: 'Import CSV & Sheets',
                desc: 'Upload CSV atau paste link Google Sheets. Variabel nama dan custom field siap dipakai.',
              },
              {
                icon: '✏️',
                title: 'Template Dinamis',
                desc: 'Personalisasi setiap pesan dengan {{nama}}, {{kota}}, atau variabel apapun dari data kontakmu.',
              },
              {
                icon: '📱',
                title: 'Multi Instance',
                desc: 'Kelola banyak nomor WhatsApp sekaligus dari satu dashboard. Cocok untuk tim marketing.',
              },
              {
                icon: '📊',
                title: 'Laporan Real-time',
                desc: 'Pantau status pengiriman live — terkirim, gagal, pending — semua terlihat dalam satu layar.',
              },
              {
                icon: '🔒',
                title: 'Aman dari Banned',
                desc: 'Delay otomatis antar pesan mencegah deteksi spam. Sudah dipakai ratusan bisnis Indonesia.',
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <span className="text-4xl mb-4 block">{icon}</span>
                <h3 className="text-xl font-bold text-[#1a3a2a] mb-2">{title}</h3>
                <p className="text-gray-600 font-medium leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CARA KERJA ─────────────────────────────────── */}
      <section id="cara-kerja" className="py-20 md:py-28 px-4 bg-[#F5E642]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black text-[#1a3a2a] text-center mb-16 leading-tight">
            3 Langkah.<br />Langsung Blast.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
            {[
              {
                num: '01',
                title: 'Hubungkan WhatsApp',
                desc: 'Scan QR code untuk connect nomor WA kamu. Prosesnya cuma 30 detik.',
              },
              {
                num: '02',
                title: 'Upload Kontak',
                desc: 'Import dari CSV atau Google Sheets. Tambahkan variabel untuk pesan yang personal.',
              },
              {
                num: '03',
                title: 'Kirim & Pantau',
                desc: 'Blast ke semua kontak dan monitor status pengiriman secara real-time dari dashboard.',
              },
            ].map(({ num, title, desc }) => (
              <div key={num}>
                <p className="text-8xl md:text-9xl font-black text-[#1a3a2a]/10 leading-none mb-2 select-none">
                  {num}
                </p>
                <h3 className="text-2xl font-black text-[#1a3a2a] mb-3">{title}</h3>
                <p className="text-lg text-[#1a3a2a]/70 font-medium leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HARGA ──────────────────────────────────────── */}
      <section id="harga" className="py-20 md:py-28 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black text-[#1a3a2a] text-center mb-3">Harga</h2>
          <p className="text-center text-gray-500 text-lg mb-12 font-medium">Mulai gratis, upgrade kapan saja.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free card */}
            <div className="bg-white rounded-3xl p-8 border border-gray-200">
              <span className="inline-block bg-[#86C67C]/30 text-green-800 text-xs font-bold px-3 py-1.5 rounded-full mb-5">
                Gratis Selamanya
              </span>
              <div className="mb-6">
                <span className="text-6xl font-black text-[#1a3a2a]">Rp 0</span>
                <span className="text-lg text-gray-500 ml-1">/bulan</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  '50 pesan per hari',
                  '1 nomor WhatsApp',
                  '2 campaign aktif',
                  'Import CSV & Google Sheets',
                  'Template {{variabel}}',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700 font-medium">
                    <span className="text-green-600 font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block w-full text-center border-2 border-[#1a3a2a] text-[#1a3a2a] rounded-full py-3 font-bold hover:bg-[#1a3a2a] hover:text-white transition-all"
              >
                Daftar Gratis
              </Link>
            </div>

            {/* Pro card */}
            <div className="bg-[#1a3a2a] rounded-3xl p-8">
              <span className="inline-block bg-[#F97316] text-white text-xs font-bold px-3 py-1.5 rounded-full mb-5">
                Paling Populer
              </span>
              <div className="mb-6">
                <span className="text-5xl font-black text-[#F5E642]">Rp 99.000</span>
                <span className="text-lg text-white/60 ml-1">/bulan</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Pesan UNLIMITED',
                  '5 nomor WhatsApp',
                  'Campaign unlimited',
                  'Semua fitur Free',
                  'Priority support',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white font-medium">
                    <span className="text-[#F5E642] font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block w-full text-center bg-[#F5E642] text-[#1a3a2a] rounded-full py-3 font-black hover:opacity-90 transition-opacity mb-3"
              >
                Mulai Pro Sekarang
              </Link>
              <p className="text-center text-xs text-white/50">Bayar via Xendit · Cancel kapan saja</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────── */}
      <section id="faq" className="py-20 md:py-28 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-[#1a3a2a] text-center mb-12 leading-tight">
            Ada yang ingin<br />kamu tanyakan?
          </h2>
          <div>
            {[
              {
                q: 'Apakah akun WhatsApp saya aman?',
                a: 'Ya. Mote Blaster menggunakan delay otomatis minimal 10 detik antar pesan untuk menghindari deteksi spam WhatsApp. Fitur ini wajib aktif di semua plan dan tidak bisa dimatikan.',
              },
              {
                q: 'Apa bedanya plan Free dan Pro?',
                a: 'Free dibatasi 50 pesan/hari dan 1 nomor WA. Pro tidak ada batasan pesan dan bisa kelola 5 nomor WA sekaligus.',
              },
              {
                q: 'Bagaimana cara import kontak?',
                a: "Upload file CSV dengan kolom 'phone' dan 'name', atau paste link Google Sheets yang sudah dishare \"Anyone with link\".",
              },
              {
                q: 'Apakah bisa untuk tim yang punya banyak nomor WA?',
                a: 'Bisa. Plan Pro support 5 instance WhatsApp dalam satu dashboard. Semua bisa dikontrol dari satu akun.',
              },
              {
                q: 'Bagaimana cara berlangganan Plan Pro?',
                a: 'Pembayaran melalui Xendit — support transfer bank, kartu kredit, dan e-wallet. Cancel kapan saja tanpa penalti.',
              },
            ].map(({ q, a }) => (
              <FAQItem key={q} question={q} answer={a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────────── */}
      <section className="relative py-24 md:py-32 px-4 bg-[#1a3a2a] overflow-hidden text-center">
        <Blob
          color="#F97316"
          className="absolute -top-10 -right-20 w-96 h-80 opacity-30 pointer-events-none hidden md:block"
        />
        <Blob
          color="#F5E642"
          className="absolute -bottom-10 -left-20 w-80 h-80 opacity-20 pointer-events-none hidden md:block"
        />
        <div className="relative z-10">
          <h2 className="text-5xl md:text-7xl font-black text-[#F5E642] leading-tight mb-6">
            Siap blast WA<br />lebih efisien?
          </h2>
          <p className="text-white/80 text-xl mb-10 font-medium">Daftar gratis sekarang. Tidak perlu kartu kredit.</p>
          <Link
            href="/login"
            className="inline-block bg-[#F5E642] text-[#1a3a2a] rounded-full px-12 py-5 text-xl font-black hover:scale-105 transition-transform"
          >
            Mulai Gratis Sekarang →
          </Link>
          <div className="mt-6">
            <a href="#fitur" className="text-white/50 text-sm hover:text-white transition-colors">
              atau pelajari fitur dulu ↑
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer className="bg-[#1a3a2a] border-t border-white/10 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-left md:items-start gap-8">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wlogogramsquare.webp" alt="Mote Blaster" className="h-10 mb-3" />
              <p className="text-white/60 text-sm max-w-xs leading-relaxed">
                Platform blast WhatsApp profesional untuk bisnis Indonesia.
              </p>
            </div>
            <div className="flex gap-12">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3 font-bold">Produk</p>
                <ul className="space-y-2">
                  <li><a href="#fitur" className="text-white/70 text-sm hover:text-white transition-colors font-medium">Fitur</a></li>
                  <li><a href="#harga" className="text-white/70 text-sm hover:text-white transition-colors font-medium">Harga</a></li>
                  <li><a href="#cara-kerja" className="text-white/70 text-sm hover:text-white transition-colors font-medium">Cara Kerja</a></li>
                </ul>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3 font-bold">Akun</p>
                <ul className="space-y-2">
                  <li><Link href="/login" className="text-white/70 text-sm hover:text-white transition-colors font-medium">Masuk</Link></li>
                  <li><Link href="/login" className="text-white/70 text-sm hover:text-white transition-colors font-medium">Daftar</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/10 text-center">
            <p className="text-white/40 text-xs">© 2026 Mote Blaster. Produk dari Mote Kreatif.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
