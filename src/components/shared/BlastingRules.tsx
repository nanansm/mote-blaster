'use client'
import { useState } from 'react'

export function BlastingRules() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl overflow-hidden border border-amber-200 bg-amber-50">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-amber-50 px-4 py-3 text-left hover:bg-amber-100 transition-colors"
      >
        <span className="text-amber-800 font-semibold text-sm md:text-base">
          ⚠️ Syarat &amp; Ketentuan Blasting WhatsApp — Wajib Dibaca
        </span>
        <span className="text-amber-700 text-sm font-medium shrink-0 ml-4">
          {open ? 'Tutup ▲' : 'Lihat ▼'}
        </span>
      </button>

      {open && (
        <div className="border-t border-amber-200 bg-amber-50 p-4 md:p-6 space-y-4 text-sm text-slate-800">
          <p className="font-semibold text-amber-800">
            ⚠️ Peringatan — Baca sebelum menggunakan fitur blast
          </p>
          <p className="text-slate-700">
            Kegagalan mematuhi aturan ini dapat mengakibatkan pemblokiran <strong>PERMANEN</strong> nomor WhatsApp kamu oleh Meta.
            Kami <strong>tidak bertanggung jawab</strong> atas kerugian akibat pelanggaran aturan di bawah ini.
          </p>

          <div className="space-y-3">
            <div>
              <p className="font-bold text-slate-800">1. 📱 Umur &amp; Pemanasan Nomor</p>
              <ul className="mt-1 ml-4 space-y-1 list-disc text-slate-700">
                <li><strong>Dilarang</strong> menggunakan nomor baru (&lt; 3 bulan) untuk blast massal.</li>
                <li>Nomor wajib sudah aktif minimal 1–3 bulan dengan riwayat percakapan dua arah.</li>
                <li>Selama pemanasan, gunakan nomor hanya untuk chat normal.</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-slate-800">2. ⏱️ Jeda Antar Pesan (Wajib)</p>
              <ul className="mt-1 ml-4 space-y-1 list-disc text-slate-700">
                <li>Batas minimum <strong>mutlak</strong>: 15 detik antar pesan.</li>
                <li>Rekomendasi aman: random delay 30–120 detik.</li>
                <li>Pesan terlalu cepat akan terdeteksi sebagai bot dan memicu pemblokiran.</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-slate-800">3. 📊 Batas Pengiriman Harian</p>
              <ul className="mt-1 ml-4 space-y-1 list-disc text-slate-700">
                <li>Minggu 1: Maks 50–100 pesan/hari</li>
                <li>Minggu 2: Maks 200–250 pesan/hari</li>
                <li>Minggu 3+: Maks 500 pesan/hari</li>
                <li><strong>Dilarang</strong> langsung blast ribuan pesan tanpa fase pemanasan.</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-slate-800">4. 📝 Kualitas Konten</p>
              <ul className="mt-1 ml-4 space-y-1 list-disc text-slate-700">
                <li><strong>Dilarang</strong> mengirim teks identik ke semua penerima. Gunakan variabel <code className="bg-amber-100 px-1 rounded">{'{{nama}}'}</code> untuk personalisasi.</li>
                <li>Hindari bahasa hard-selling agresif pada pesan pertama.</li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-100 border border-amber-300 rounded-lg p-3">
            <p className="font-bold text-amber-800 mb-1">⚠️ Disclaimer:</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              Mote Blaster adalah alat bantu pengiriman pesan. Segala bentuk pemblokiran atau kerugian akibat pelanggaran
              panduan di atas <strong>sepenuhnya menjadi tanggung jawab pengguna</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
