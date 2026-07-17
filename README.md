# Tanitera

**Dari sawah ke dapur MBG, tanpa lewat Jakarta.**

Tanitera menghubungkan dapur SPPG (Satuan Pelayanan Pemenuhan Gizi) program Makan Bergizi Gratis (MBG) langsung dengan petani lokal lewat WhatsApp, anpa aplikasi baru dan tanpa perantara distributor besar di luar kota. SPPG memposting kebutuhan bahan, petani membalas dengan bahasa sehari-hari, AI membaca dan meranking penawaran, dan penjemputan akan diatur oleh SPPG.

🔗 **Live demo:** [tanitera.vercel.app](https://tanitera.vercel.app)

Dibuat untuk **Garuda Hacks 7.0**.

---

## Masalah

Dana MBG seharusnya menghidupkan ekonomi desa lewat pembelian bahan pangan lokal. Tapi tanpa daftar petani yang jelas dan cara menggabungkan hasil panen keci, SPPG cenderung memesan dari distributor besar di luar kota. Sehingga, uang mengalir keluar desa alih-alih memutar di ekonomi lokal.

## Solusi

Tanitera membalik alurnya: **SPPG posting kebutuhan → petani balas lewat WhatsApp → AI meranking otomatis** berdasarkan jarak, harga, dan reliabilitas → SPPG konfirmasi satu klik → pengambilan akan diatur oleh SPPG.

## Fitur

- **Landing page**: perkenalan produk, alur kerja, dan value proposition
- **Dashboard SPPG**: input menu & jumlah porsi, kirim permintaan bahan ke petani (per bahan atau sekaligus), lihat balasan masuk secara real-time, dan ranking petani otomatis
- **Mode Simulasi & Live**: mode simulasi berjalan sepenuhnya di browser tanpa API key (aman untuk demo tanpa koneksi/API), mode live terhubung ke Supabase + WhatsApp (Fonnte) + Gemini sungguhan
- **Parser AI (Gemini)**: membaca balasan WhatsApp petani dalam bahasa santai/typo/multi-item dan mengubahnya jadi data terstruktur (bahan, jumlah, harga), dengan regex fallback jika API AI gagal
- **Ranking otomatis**: skor gabungan jarak (40%, dihitung PostGIS), harga (35%, rasio ke termurah), dan reliabilitas petani (25%), dengan hard filter untuk penawaran di atas harga distributor
- **Konfirmasi partial**: SPPG bisa mengonfirmasi sebagian dari jumlah yang ditawarkan petani, bukan hanya semua atau tidak sama sekali
- **Halaman kelola petani**: CRUD data petani (nama, nomor WA, kecamatan, komoditas)
- **Halaman overview/riwayat**: ringkasan kebutuhan yang sudah dipenuhi, biaya, dan daftar petani per transaksi
- **PIN gate opsional**: kunci akses dashboard dengan PIN sederhana, berguna untuk melindungi data live saat demo publik

# Tanitera

**Dari sawah ke dapur MBG, tanpa lewat Jakarta.**

Tanitera menghubungkan dapur SPPG (Satuan Pelayanan Pemenuhan Gizi) program Makan Bergizi Gratis (MBG) langsung dengan petani lokal lewat WhatsApp — tanpa aplikasi baru, tanpa perantara distributor besar di luar kota. SPPG memposting kebutuhan bahan, petani membalas dengan bahasa sehari-hari, AI membaca dan merangking penawaran, dan koperasi/Gapoktan yang mengurus logistik penjemputan.

🔗 **Live demo:** [tanitera.vercel.app](https://tanitera.vercel.app)

Dibuat untuk **Garuda Hacks 7.0**.

---

## Masalah

Dana MBG seharusnya menghidupkan ekonomi desa lewat pembelian bahan pangan lokal. Tapi tanpa daftar petani yang jelas dan cara menggabungkan hasil panen skala kecil menjadi volume yang dibutuhkan dapur, SPPG cenderung memesan dari distributor besar di luar kota — uang mengalir keluar desa alih-alih memutar di ekonomi lokal.

## Solusi

Tanitera membalik alurnya: **SPPG posting kebutuhan → petani balas lewat WhatsApp → AI merangking otomatis** berdasarkan jarak, harga, dan reliabilitas → SPPG konfirmasi satu klik → koperasi mengatur pengumpulan dan pengantaran.

## Fitur

- **Landing page** — perkenalan produk, alur kerja, dan value proposition
- **Dashboard SPPG** — input menu & jumlah porsi, kirim permintaan bahan ke petani (per bahan atau sekaligus), lihat balasan masuk secara real-time, dan rangking petani otomatis
- **Mode Simulasi & Live** — mode simulasi berjalan sepenuhnya di browser tanpa API key (aman untuk demo tanpa koneksi/API), mode live terhubung ke Supabase + WhatsApp (Fonnte) + Gemini sungguhan
- **Parser AI (Gemini)** — membaca balasan WhatsApp petani dalam bahasa santai/typo/multi-item dan mengubahnya jadi data terstruktur (bahan, jumlah, harga), dengan regex fallback jika API AI gagal
- **Rangking otomatis** — skor gabungan jarak (40%, dihitung PostGIS), harga (35%, rasio ke termurah), dan reliabilitas petani (25%), dengan hard filter untuk penawaran di atas harga distributor
- **Konfirmasi partial** — SPPG bisa mengonfirmasi sebagian dari jumlah yang ditawarkan petani, bukan hanya semua-atau-tidak-sama-sekali
- **Halaman kelola petani** — CRUD data petani (nama, nomor WA, kecamatan, komoditas)
- **Halaman overview/riwayat** — ringkasan kebutuhan yang sudah dipenuhi, biaya, dan daftar petani per transaksi
- **PIN gate opsional** — kunci akses dashboard dengan PIN sederhana, berguna untuk melindungi data live saat demo publik

## Cara Ranking Dihitung

Setiap penawaran petani diranking menggunakan skor gabungan dari view SQL `ranked_applications` di `supabase/schema.sql`:

```sql
0.40 * (1 - least(b.distance_km, 30) / 30.0)
  + 0.35 * (bo.min_price / b.price_per_kg)
  + 0.25 * b.reliability_score
```

Disederhanakan:

```
match_score = 0.40 × skor_jarak + 0.35 × skor_harga + 0.25 × skor_reliabilitas
```

Rincian tiap komponen:

- **Jarak — bobot 40%, skala absolut.** `1 - least(distance_km, 30) / 30.0` — jarak dibatasi maksimum 30km dan diskalakan lurus 0–1: **0km = skor 1.0, 30km ke atas = skor 0.0**. Ini absolut, bukan relatif terhadap penawaran lain — petani yang jaraknya 5km selalu dapat skor yang sama berapa pun jarak petani lain yang membalas.
- **Harga — bobot 35%, rasio terhadap penawaran termurah.** `min_price / price_per_kg` — mengambil harga termurah di antara semua penawaran untuk bahan tersebut, lalu dibagi dengan harga petani ini. Kalau termurah Rp 10.000 dan petani ini menawarkan Rp 80.000, skor harganya `10000/80000 = 0.125`. Kalau dia sendiri yang termurah, skornya `1.0`. Karena berbentuk rasio (bukan posisi min-max), selisih harga 8x akan berpengaruh jauh lebih besar ke skor dibanding selisih harga 1.2x — sesuai kenyataan.
- **Reliabilitas — bobot 25%.** Langsung memakai `reliability_score` yang tersimpan di tabel `farmers` (skala 0–1), yang otomatis naik (+0.05) atau turun (−0.15) tiap kali sebuah pengiriman dikonfirmasi lewat trigger `update_reliability()`.

**Filter keras sebelum penskoran:** penawaran dengan harga di atas estimasi harga distributor (`price_per_kg > max_price_per_kg`) ditandai `over_budget = true` dan dikeluarkan sepenuhnya dari daftar rangking di dashboard — bukan diberi skor rendah, tapi memang tidak pernah ditampilkan sebagai opsi, karena SPPG sudah punya alternatif distributor di harga itu.

Perhitungan ini berjalan di dalam Postgres (view SQL) untuk mode Live — dashboard hanya membaca kolom `match_score` dan `over_budget` yang sudah jadi. Mode Simulasi meniru formula yang sama persis di sisi client (lihat `simScored` di `components/dashboard.jsx`) supaya hasil kedua mode terasa konsisten walau tanpa database.

## Cara Kerja

1. **SPPG posting kebutuhan** —> input menu & jumlah porsi, sistem menghitung kebutuhan bahan dan mengirim WhatsApp ke petani terdaftar di sekitar dapur (radius PostGIS)
2. **Petani balas via WhatsApp** —> tanpa install app baru, cukup balas dengan bahasa sehari-hari
3. **AI proses & rangking** —> balasan diubah menjadi data terstruktur oleh Gemini, lalu dirangking otomatis berdasarkan jarak, harga, dan reliabilitas
4. **Konfirmasi & logistik** —> SPPG konfirmasi satu klik, koperasi/Gapoktan mengatur jadwal dan titik jemput

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui |
| Database | Supabase (Postgres + PostGIS + Realtime) |
| Peta | Leaflet / React-Leaflet |
| WhatsApp gateway | Fonnte |
| AI parser | Google Gemini (`@google/generative-ai`) |
| Hosting | Vercel |

## Struktur Proyek

```
app/
├── page.tsx                            # Landing page
├── dashboard/page.tsx                  # Dashboard SPPG (mode Simulasi & Live)
├── farmers/page.tsx                    # Kelola petani
├── overview/page.tsx                   # Ringkasan & riwayat
├── login/page.tsx                      # PIN gate (opsional)
└── api/
    ├── wa/blast/route.ts               # Broadcast permintaan ke WhatsApp petani
    ├── wa/webhook/route.ts             # Terima & parse balasan WhatsApp
    ├── applications/confirm/route.ts   # Konfirmasi penawaran petani
    ├── farmers/route.ts                # CRUD petani
    └── menus/route.ts                  # CRUD preset menu

components/
├── landing.jsx
├── dashboard.jsx
├── farmers.jsx
├── overview.jsx
└── ui/                            # shadcn/ui components

lib/
├── supabase.ts                    # Supabase client (browser & admin)
├── parser.ts                      # Gemini parser + regex fallback
├── sim.js                         # Engine mode simulasi (data seeded, deterministik)
└── menus.js                       # Preset menu offline

supabase/
├── schema.sql                     # Skema database lengkap (jalankan ini dulu)
└── migration_menus.sql            # Migrasi tabel menu (jalankan setelah schema.sql)
```

## Setup Lokal

### 1. Clone & install
```bash
git clone https://github.com/sakadhamma/Tanitera.git
cd Tanitera
npm install
cp .env.example .env.local
npm run dev
```
Buka `http://localhost:3000` — dashboard sudah berjalan penuh di **mode Simulasi** tanpa perlu API key apa pun.

### 2. Environment variables
Isi `.env.local` (dan tambahkan variabel yang sama di Vercel jika deploy):

```dotenv
# Supabase — Settings → API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, jangan expose ke client

# Gemini — aistudio.google.com
GEMINI_API_KEY=

# Fonnte — fonnte.com dashboard, device token
FONNTE_TOKEN=

# App behavior
NEXT_PUBLIC_DEFAULT_MODE=live      # "sim" atau "live"
BLAST_MAX_RECIPIENTS=10           # batas jumlah WA per broadcast

# Opsional — kunci dashboard dengan PIN
NEXT_PUBLIC_DEMO_PIN=
```

### 3. Setup database (mode Live)
Di Supabase SQL Editor, jalankan berurutan:
```sql
-- 1. Skema utama (tabel, PostGIS, view rangking, seed data)
-- jalankan seluruh isi supabase/schema.sql

-- 2. Tabel menu
-- jalankan seluruh isi supabase/migration_menus.sql
```

Verifikasi:
```sql
select count(*) from farmers;   -- harus ada data petani seed
```

⚠️ Sebelum demo live, tambahkan minimal 1-2 petani dengan menggunakan nomor asli yang terdaftar di Whatsapp

### 4. Setup WhatsApp (Fonnte)
1. Daftar di [fonnte.com](https://fonnte.com), hubungkan device dengan scan QR (gunakan nomor cadangan, bukan nomor pribadi utama)
2. Set **Webhook URL** device ke: `https://<domain-vercel-anda>/api/wa/webhook`
3. Uji kirim manual sebelum lewat UI: (ubah target menggunakan nomor Whatsapp penerima)
```bash
curl -X POST https://api.fonnte.com/send \
  -H "Authorization: TOKEN_ANDA" \
  -d "target=+628xxxxxxxxxx" -d "message=tes"
```

## Deploy

Proyek ini siap deploy langsung ke [Vercel](https://vercel.com) — import repo, tambahkan environment variables di atas, deploy. Next.js App Router menangani halaman statis dan API routes serverless dalam satu deployment yang sama.

## Mode Simulasi vs Live

| | Simulasi | Live |
|---|---|---|
| Data petani | Seeded, deterministik (di browser) | Supabase (PostGIS, real-time) |
| Balasan WhatsApp | Simulasi otomatis dengan jeda realistis | WhatsApp asli via Fonnte |
| Parsing bahasa | Simulasi | Gemini AI + regex fallback |
| Perlu API key? | Tidak | Ya (Supabase, Gemini, Fonnte) |
| Kegunaan | Demo tanpa risiko koneksi/API gagal | Menunjukkan pipeline sungguhan bekerja end-to-end |

Kedua mode dirender lewat komponen yang sama sehingga tampilannya identik — jika mode live gagal saat presentasi, tinggal beralih ke Simulasi tanpa kehilangan alur cerita demo.

## Keterbatasan yang Diketahui

- Fonnte adalah WhatsApp gateway tidak resmi — cocok untuk pilot/demo, untuk skala produksi sebaiknya migrasi ke WhatsApp Business API resmi
- Satu SPPG saat ini hardcoded sebagai data awal (multi-SPPG belum didukung)
- Radius pencarian petani menggunakan perhitungan jarak PostGIS riil, namun visualisasi peta masih sederhana

## Tim

Dibuat oleh tim Tanitera untuk **Garuda Hacks 7.0** — kategori Agriculture & Food Systems.

---

*Tanitera — Menanam Harapan, Menuai Kesejahteraan*