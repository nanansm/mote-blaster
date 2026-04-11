'use client'
import { useState } from 'react'

export function BlastingRules() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl overflow-hidden border-2 border-red-600">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-red-600 px-4 py-3 text-left"
      >
        <span className="text-white font-bold text-sm md:text-base">
          ⚠️ WAJIB BACA — Syarat &amp; Ketentuan Blasting WhatsApp
        </span>
        <span className="text-white text-sm font-medium shrink-0 ml-4">
          {open ? 'Tutup ▲' : 'Lihat Aturan ▼'}
        </span>
      </button>

      {open && (
        <div className="bg-red-50 p-4 md:p-6 space-y-4 text-sm text-slate-800">
          <p className="font-semibold text-red-700">
            ⚠️ PERINGATAN KERAS — Baca sebelum menggunakan fitur blast
          </p>
          <p className="text-slate-700">
            Kegagalan mematuhi aturan ini dapat mengakibatkan pemblokiran <strong>PERMANEN</strong> nomor WhatsApp Anda oleh Meta.
            Kami <strong>TIDAK BERTANGGUNG JAWAB</strong> atas kerugian yang timbul akibat pelanggaran aturan di bawah ini.
            Dengan menggunakan fitur blast, Anda dianggap telah membaca, memahami, dan menyetujui seluruh syarat berikut.
          </p>

          <div className="space-y-3">
            <div>
              <p className="font-bold text-slate-800">1. 📱 UMUR &amp; PEMANASAN NOMOR</p>
              <ul className="mt-1 ml-4 space-y-1 list-disc text-slate-700">
                <li><strong>DILARANG</strong> menggunakan nomor baru (&lt; 3 bulan) untuk blast massal. Nomor baru akan langsung terdeteksi sebagai spam dan diblokir.</li>
                <li>Nomor wajib sudah aktif minimal 1–3 bulan dengan riwayat percakapan dua arah yang normal.</li>
                <li>Selama pemanasan, gunakan nomor hanya untuk chat normal, bukan blast. Bangun reputasi nomor terlebih dahulu.</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-slate-800">2. ⏱️ JEDA ANTAR PESAN (WAJIB)</p>
              <ul className="mt-1 ml-4 space-y-1 list-disc text-slate-700">
                <li>Batas minimum <strong>MUTLAK</strong>: 15 detik antar pesan.</li>
                <li>Rekomendasi aman: random delay 30–120 detik.</li>
                <li>Pesan yang terkirim terlalu cepat dan konstan <strong>PASTI</strong> terdeteksi sebagai bot dan akan memicu pemblokiran segera.</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-slate-800">3. 📊 BATAS PENGIRIMAN HARIAN (TIERING WAJIB)</p>
              <ul className="mt-1 ml-4 space-y-1 list-disc text-slate-700">
                <li>Minggu 1: Maks 50–100 pesan/hari</li>
                <li>Minggu 2: Maks 200–250 pesan/hari</li>
                <li>Minggu 3+: Maks 500 pesan/hari (batas aman nomor reguler)</li>
                <li><strong>DILARANG</strong> langsung blast ribuan pesan tanpa fase pemanasan. Ini adalah cara tercepat untuk kehilangan nomor Anda selamanya.</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-slate-800">4. 📝 KUALITAS KONTEN</p>
              <ul className="mt-1 ml-4 space-y-1 list-disc text-slate-700">
                <li><strong>DILARANG</strong> mengirim teks yang 100% identik ke semua penerima. Gunakan variabel <code className="bg-red-100 px-1 rounded">{'{{nama}}'}</code> atau <code className="bg-red-100 px-1 rounded">{'{{custom}}'}</code> untuk personalisasi.</li>
                <li>Hindari bahasa hard-selling agresif pada pesan pertama.</li>
                <li>Konten yang terlalu promosional memicu laporan spam dari penerima.</li>
              </ul>
            </div>
          </div>

          <div className="bg-red-100 border border-red-300 rounded-lg p-3">
            <p className="font-bold text-red-800 mb-1">⚠️ DISCLAIMER PENTING:</p>
            <p className="text-red-700 text-xs leading-relaxed">
              Mote Blaster adalah alat bantu pengiriman pesan. Kami TELAH memberikan panduan lengkap di atas untuk melindungi
              nomor WhatsApp Anda. Segala bentuk pemblokiran, kerugian bisnis, atau kehilangan akses WhatsApp akibat pelanggaran
              aturan di atas <strong>SEPENUHNYA menjadi tanggung jawab pengguna</strong>. Developer tidak bertanggung jawab atas
              konsekuensi penggunaan yang tidak sesuai panduan ini.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
