# Mote Blaster

WhatsApp Bulk Messaging SaaS + Chat Recording ke Google Sheets.

**URL:** https://blaster.motekreatif.com
**Stack:** Next.js 15, TypeScript, Drizzle ORM, PostgreSQL, BullMQ, Baileys, TailwindCSS, shadcn/ui

---

## Dev

```bash
npm run dev
```

Build:

```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

---

## Progress UX Improvement

### Batch 1 — Ganti Istilah Teknis
- [x] #1 — "Instance" → "Nomor WhatsApp" (semua halaman)
- [x] #2 — Status Connection → Bahasa Indonesia
- [x] #4 — Rename menu sidebar (WA Connection → Nomor WA, Campaigns → Kirim Pesan, WA Chat Recording → Catat Chat, Billing → Langganan)
- [x] #5 — Fix typo "Tambahkan WhatsApp WhatsApp"
- [x] #6 — Status Campaign tab → Bahasa Indonesia (Draf, Antri, Berjalan, Selesai, Gagal, Dijeda)

### Batch 2 — UX Improvement
- [x] #3 — Pindahkan BlastingRules banner ke New Campaign saja (hapus dari Dashboard & Connection)
- [x] #7 — Empty state Connection yang lebih jelas (icon Smartphone besar + CTA)
- [x] #8 — Tambah label di tombol aksi Campaign (Eye → "Detail", Pause → "Jeda")
- [x] #9 — Billing page → Bahasa Indonesia + konfirmasi batal langganan
- [x] #15 — Konfirmasi sebelum hapus nomor WhatsApp (AlertDialog)

### Batch 3 — AI Agent & Chat Recording UX (BELUM)
- [ ] #10 — AI Agent: rename istilah teknis (Provider LLM, API Key, System Prompt, Strict Rules)
- [ ] #11 — Chat Recording: tampilkan nama spreadsheet, default provider Gemini, sembunyikan lainnya di "Opsi Lanjutan"

### Batch 4 — Landing Page & Minor Polish (BELUM)
- [ ] #12 — Delay explanation di New Campaign pindah ke atas input
- [ ] #13 — "Simpan Draft" → "Simpan untuk Nanti"
- [ ] #14 — Nav landing page → samakan ke Bahasa Indonesia
- [ ] #17 — "Multi Instance" di landing → "Pakai Banyak Nomor WA"

### Dashboard Redesign
- [x] Welcome message "Halo, [nama]! 👋" di atas stat cards
- [x] Stat cards: icon dengan colored background, angka besar
- [x] Highlight cards: warna amber (primary) & hijau tua (brand color)
- [x] Chart: warna amber, label lebih jelas
- [x] BlastingRules: style amber soft (bukan merah agresif)
- [x] Connection page: card dengan border kiri berwarna sesuai status, empty state illustratif
- [x] Campaign page: progress bar visual, filter tab amber, label Indonesia

### Bug Fixes Done
- [x] Phone number: fix LID format, gunakan remoteJidAlt
- [x] Chat recording: cascade delete logs sebelum config
- [x] Database: tambah pro_expires_at, chat_recording_config, chat_recording_logs
- [x] Tutorial: tampilkan service account email langsung

### Known Issues
- [ ] Xendit payment belum aktif (menunggu verifikasi)
- [ ] Chat Recording: input Spreadsheet ID bisa diubah jadi input paste URL Google Sheets (auto-extract ID)
- [ ] Onboarding flow untuk user baru
- [ ] Video demo di landing page belum ada
- [ ] Floating WhatsApp CS button belum ada
