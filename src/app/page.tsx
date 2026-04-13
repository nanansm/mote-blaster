'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu, ChevronDown } from 'lucide-react'

// Static image imports
import stiker1 from '@/app/img/stiker/1.webp'
import stiker2 from '@/app/img/stiker/2.webp'
import stiker3 from '@/app/img/stiker/3.webp'
import stiker4 from '@/app/img/stiker/4.webp'
import stiker5 from '@/app/img/stiker/5.webp'
import stiker6 from '@/app/img/stiker/6.webp'
import stiker7 from '@/app/img/stiker/7.webp'
import aiAgent from '@/app/img/fitur/aiagent.webp'
import chatRecording from '@/app/img/fitur/chatrecording.webp'
import templateDinamis from '@/app/img/fitur/template_dinamis.webp'
import multiInstance from '@/app/img/fitur/multi_instance.webp'
import importMudah from '@/app/img/fitur/importmudah.webp'
import analytics from '@/app/img/fitur/analytics.webp'

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

/* ── Feature card with screenshot ────────────────────── */
interface FeatureCardProps {
  title: string
  desc: string
  screenshot: Parameters<typeof Image>[0]['src']
  stiker: Parameters<typeof Image>[0]['src']
  badge?: string
}
const FeatureCard = ({ title, desc, screenshot, stiker, badge }: FeatureCardProps) => (
  <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 relative">
    {badge && (
      <span className="absolute top-3 right-3 z-10 bg-[#F97316] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
        {badge}
      </span>
    )}
    <div className="relative w-full h-44 bg-gray-50 overflow-hidden">
      <Image src={screenshot} alt={title} fill className="object-cover" />
      {/* Stiker overlay */}
      <div className="absolute bottom-2 right-2 w-[100px] h-[100px]">
        <Image src={stiker} alt="" width={100} height={100} className="drop-shadow" />
      </div>
    </div>
    <div className="p-5">
      <h3 className="text-lg font-bold text-[#1a3a2a] mb-1.5">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
    </div>
  </div>
)

/* ── Landing page ─────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const navLinks = [
    { label: 'Home',      href: '#home' },
    { label: 'Features',  href: '#fitur' },
    { label: 'Pricing',   href: '#harga' },
    { label: 'About Us',  href: '#about' },
  ]

  return (
    <div id="home" className="min-h-screen overflow-x-hidden" style={{ fontFamily: 'var(--font-jakarta, sans-serif)' }}>

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
            <img src="/textlogosquare.webp" alt="Mote Blaster" className="h-12 hidden md:block" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wlogogramsquare.webp" alt="Mote Blaster" className="h-12 md:hidden" />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-sm font-semibold text-[#1a3a2a] hover:opacity-60 transition-opacity"
              >
                {label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-[#1a3a2a] hover:opacity-60 transition-opacity">
              Login
            </Link>
            <Link
              href="/login"
              className="bg-[#1a3a2a] text-white text-sm font-bold px-5 py-2 rounded-full hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger className="md:hidden p-2 text-[#1a3a2a] flex items-center justify-center">
              <Menu size={24} />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-white">
              <div className="flex flex-col gap-6 mt-10 px-2">
                {navLinks.map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-semibold text-[#1a3a2a]"
                  >
                    {label}
                  </a>
                ))}
                <hr className="border-gray-200" />
                <Link href="/login" className="text-lg font-semibold text-[#1a3a2a]" onClick={() => setMobileOpen(false)}>
                  Login
                </Link>
                <Link
                  href="/login"
                  className="bg-[#1a3a2a] text-white text-center font-bold px-5 py-3 rounded-full"
                  onClick={() => setMobileOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────── */}
      <section className="relative min-h-screen bg-gradient-to-br from-[#F5E642] via-[#F5D142] to-[#F5B942] flex items-center overflow-hidden pt-16">
        {/* Blob decorations */}
        <Blob color="#F97316" className="absolute -top-20 -left-20 w-72 h-64 md:w-96 md:h-80 opacity-90 pointer-events-none hidden md:block rotate-[-20deg]" />
        <Blob color="#E8A598" className="absolute top-1/3 -right-16 w-64 h-80 opacity-85 pointer-events-none hidden md:block" />
        <Blob color="#86C67C" className="absolute bottom-0 left-1/4 w-48 h-48 opacity-80 pointer-events-none hidden md:block" />

        {/* Stiker kiri */}
        <div className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 hidden lg:block z-10">
          <Image src={stiker1} alt="" width={120} height={120} className="drop-shadow-xl rotate-[-8deg]" />
        </div>
        {/* Stiker kanan */}
        <div className="absolute right-4 md:right-12 bottom-16 hidden lg:block z-10">
          <Image src={stiker2} alt="" width={110} height={110} className="drop-shadow-xl rotate-[6deg]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-8 py-20 md:py-28 w-full text-center">
          <span className="inline-block bg-white text-[#1a3a2a] text-xs font-bold px-4 py-1 rounded-full mb-6 tracking-wide">
            Made with 🗿 by Mote Kreatif
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-[#1a3a2a] leading-tight tracking-tight mb-6">
            Kirim Ribuan Pesan<br />WhatsApp dengan Mudah
          </h1>
          <p className="text-lg md:text-xl text-[#1a3a2a]/80 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
            Platform blast WhatsApp profesional. Kelola kontak dari CSV atau Google Sheets,
            personalisasi pesan, dan pantau progres real-time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-[#F5A623] text-white rounded-full px-8 py-4 text-lg font-black hover:opacity-90 transition-opacity text-center"
            >
              Mulai Gratis →
            </Link>
            <a
              href="#harga"
              className="border-2 border-[#1a3a2a] text-[#1a3a2a] rounded-full px-8 py-4 text-lg font-bold hover:bg-[#1a3a2a]/5 transition-colors text-center"
            >
              Lihat Harga
            </a>
          </div>
        </div>
      </section>

      {/* ── PROBLEM → SOLUTION ─────────────────────────── */}
      <section className="py-20 md:py-28 px-4 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div>
            <span className="inline-block bg-[#FF0000] text-white text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-wide">
              Masalah Kamu hari ini?
            </span>
            <h2 className="text-4xl font-black text-[#1a3a2a] leading-tight mb-8">
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
      </section>

      {/* ── FITUR UNGGULAN ─────────────────────────────── */}
      <section id="fitur" className="py-20 md:py-28 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black text-[#1a3a2a] leading-tight">
              Semua yang kamu butuhkan<br />untuk blast WA
            </h2>
          </div>

          {/* 2-col, 3-row grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <FeatureCard
              title="AI Agent"
              desc="Balas chat WhatsApp otomatis dengan AI. Setup sekali, aktif 24/7 tanpa perlu online."
              screenshot={aiAgent}
              stiker={stiker5}
              badge="★ PRO"
            />
            <FeatureCard
              title="Chat Recording"
              desc="Rekam otomatis semua chat masuk ke Google Sheets. Fitur eksklusif Pro Plan."
              screenshot={chatRecording}
              stiker={stiker1}
              badge="★ BARU"
            />
            <FeatureCard
              title="Template & Auto Delay"
              desc="Personalisasi pesan dengan variabel {{nama}}, {{kota}} dan delay otomatis antar pesan untuk menjaga keamanan akun."
              screenshot={templateDinamis}
              stiker={stiker2}
            />
            <FeatureCard
              title="Multi Instance"
              desc="Kelola banyak nomor WhatsApp sekaligus dari satu dashboard."
              screenshot={multiInstance}
              stiker={stiker3}
            />
            <FeatureCard
              title="Import Mudah"
              desc="Import kontak dari CSV atau langsung dari Google Sheets."
              screenshot={importMudah}
              stiker={stiker4}
            />
            <FeatureCard
              title="Analytics Real-time"
              desc="Pantau progres campaign real-time: sent, failed, dan skipped."
              screenshot={analytics}
              stiker={stiker6}
            />
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
              { num: '01', title: 'Hubungkan WhatsApp', desc: 'Scan QR code untuk connect nomor WA kamu. Prosesnya cuma 30 detik.' },
              { num: '02', title: 'Upload Kontak', desc: 'Import dari CSV atau Google Sheets. Tambahkan variabel untuk pesan yang personal.' },
              { num: '03', title: 'Kirim & Pantau', desc: 'Blast ke semua kontak dan monitor status pengiriman secara real-time dari dashboard.' },
            ].map(({ num, title, desc }) => (
              <div key={num}>
                <p className="text-8xl md:text-9xl font-black text-[#1a3a2a]/10 leading-none mb-2 select-none">{num}</p>
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
            <div className="bg-white rounded-3xl p-8 border border-gray-200 relative overflow-hidden">
              <div className="mb-2 pr-24">
                <span className="inline-block bg-[#86C67C]/30 text-green-800 text-xs font-bold px-3 py-1.5 rounded-full">
                  Gratis Selamanya
                </span>
              </div>
              <div className="mb-6 pr-24">
                <span className="text-6xl font-black text-[#1a3a2a]">Rp 0</span>
                <span className="text-lg text-gray-500 ml-1">/ Selamanya</span>
              </div>
              {/* Stiker top-right */}
              <div className="absolute top-4 right-4">
                <Image src={stiker7} alt="" width={80} height={80} className="drop-shadow opacity-90 rotate-[8deg]" />
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  '50 pesan per hari',
                  '1 instance WhatsApp',
                  '1 campaign aktif',
                  'Import CSV',
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
                Mulai Gratis
              </Link>
            </div>

            {/* Pro card */}
            <div className="bg-[#1a3a2a] rounded-3xl p-8 relative overflow-hidden">
              <div className="mb-2 pr-24">
                <span className="inline-block bg-[#F97316] text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  Paling Populer
                </span>
              </div>
              <div className="mb-6 pr-24">
                <span className="text-5xl font-black text-[#F5E642]">Rp 99.000</span>
                <span className="text-lg text-white/60 ml-1">/ per bulan</span>
              </div>
              {/* Stiker top-right */}
              <div className="absolute top-4 right-4">
                <Image src={stiker3} alt="" width={80} height={80} className="drop-shadow opacity-90 rotate-[-6deg]" />
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Pesan tak terbatas',
                  '5 instance WhatsApp',
                  'Campaign tak terbatas',
                  'Import CSV & Google Sheets',
                  'Chat Recording otomatis',
                  'Priority support',
                  'Ai Agent',
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
                Upgrade ke Pro
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
                a: 'Free dibatasi 50 pesan/hari dan 1 nomor WA. Pro tidak ada batasan pesan, bisa kelola 5 nomor WA, dan punya fitur Chat Recording otomatis ke Google Sheets.',
              },
              {
                q: 'Bagaimana cara import kontak?',
                a: "Upload file CSV dengan kolom 'phone' dan 'name', atau paste link Google Sheets yang sudah dishare \"Anyone with link\".",
              },
              {
                q: 'Apa itu fitur Chat Recording?',
                a: 'Chat Recording adalah fitur Pro eksklusif yang merekam semua chat masuk ke Google Sheets secara otomatis. Cocok untuk bisnis yang ingin menyimpan riwayat percakapan pelanggan.',
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
        <Blob color="#F97316" className="absolute -top-10 -right-20 w-96 h-80 opacity-30 pointer-events-none hidden md:block" />
        <Blob color="#F5E642" className="absolute -bottom-10 -left-20 w-80 h-80 opacity-20 pointer-events-none hidden md:block" />
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

      {/* ── ABOUT + FOOTER ─────────────────────────────── */}
      <footer id="about" className="bg-[#1a3a2a] border-t border-white/10 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wlogogramsquare.webp" alt="Mote Blaster" className="h-10 mb-3" />
              <p className="text-white/60 text-sm max-w-xs leading-relaxed">
                Platform blast WhatsApp profesional untuk bisnis Indonesia.
              </p>
              <p className="text-white/40 text-xs mt-3">Dibuat dengan ❤️ untuk bisnis Indonesia</p>
            </div>
            <div className="flex gap-12">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3 font-bold">Produk</p>
                <ul className="space-y-2">
                  <li><a href="#fitur" className="text-white/70 text-sm hover:text-white transition-colors font-medium">Features</a></li>
                  <li><a href="#harga" className="text-white/70 text-sm hover:text-white transition-colors font-medium">Pricing</a></li>
                  <li><a href="#cara-kerja" className="text-white/70 text-sm hover:text-white transition-colors font-medium">Cara Kerja</a></li>
                </ul>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3 font-bold">Akun</p>
                <ul className="space-y-2">
                  <li><Link href="/login" className="text-white/70 text-sm hover:text-white transition-colors font-medium">Login</Link></li>
                  <li><Link href="/login" className="text-white/70 text-sm hover:text-white transition-colors font-medium">Daftar</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/10 text-center">
            <p className="text-white/40 text-xs">© 2025 Mote Blaster. Produk dari Mote Kreatif.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
