# Brief: NUSEA admin online + tracker spreadsheet

Status: draft, belum ada kode yang diubah.

## 1. Tujuan

1. Admin bisa dibuka dari mana saja (bukan hanya `127.0.0.1`), tetap aman karena isinya data privat.
2. Ada tampilan spreadsheet untuk tracking semua paper/penelitian, di samping Kanban yang sudah ada. Data awal diambil dari Sheet "Tracker Semua Paper dan Penelitian (Sarah)".

## 2. Kondisi sekarang (sudah dicek)

- **DB sudah Neon.** `.env` berisi pooled `DATABASE_URL` ke project `nuzas-office` (ap-southeast-1), schema `nusea`. Tabel sudah ke-seed: items 13, assets 14, grants 5, venues 4, sources 4, history 4. `ideas`, `tasks`, `profile` masih kosong (0).
- Penyimpanan berbentuk dokumen: satu baris per entity di `nusea.documents` (kolom `value` jsonb), plus `document_backups`, dengan optimistic locking (commit terakhir).
- **Admin lokal by design:** `admin/server/guard.ts` menolak semua request non-loopback (403) dan butuh token random yang dicetak di terminal tiap server start. `admin/server.ts` juga menjalankan Vite middleware dan `execFile` (`pnpm`, git) untuk Publish/commit.
- Kanban sudah ada (`admin/pages/KanbanPage.tsx`), drag antar status dan mencatat history.
- Website publik di Netlify hanya membaca `data/public/`; admin tidak ikut build.

## 3. Bagian A: admin online

### Yang harus berubah

| Area | Sekarang | Target |
| --- | --- | --- |
| Auth | loopback + token terminal | login sungguhan (lihat keputusan 1) |
| Hosting | `pnpm admin` di laptop | Node host terpisah dari Netlify publik |
| Serve UI | Vite dev middleware | `vite build` untuk admin, di-serve static oleh Express |
| Publish | `execFile` pnpm + git commit ke `data/public/` | tidak bisa jalan di host (tidak ada repo/git). Ganti ke GitHub API commit, atau Netlify build hook (lihat keputusan 2) |
| Secret | `.env` lokal | env var di host; `DATABASE_URL` tidak pernah ke browser |

### Keamanan minimum (wajib sebelum online)

- HTTPS only, cookie sesi `httpOnly` + `secure` + `sameSite=strict`, CSRF token untuk request tulis.
- Rate limit + lockout di endpoint login.
- Hapus `isLoopbackAddress` dari jalur produksi, tapi pertahankan sebagai mode `ADMIN_LOCAL=1` untuk dev.
- `check:leak` tetap jalan di build publik, dan admin tidak boleh masuk `dist/`.
- Backup Neon (`document_backups`) tetap dipakai; tambah tombol export JSON.

### Keputusan yang perlu lu ambil

1. **Auth.** Rekomendasi: login password tunggal (hash di env) + sesi cookie, karena adminnya cuma lu. Alternatif: Cloudflare Access di depan host (tanpa kode auth, tapi tergantung akun Cloudflare).
2. **Publish.** Rekomendasi: tombol Publish memanggil GitHub API untuk commit `data/public/*.json`, lalu Netlify rebuild otomatis. Alternatif paling simpel: Publish tetap hanya jalan lokal, sisanya (edit, tracker) online.
3. **Host.** Rekomendasi: Render atau Fly.io (Express tetap utuh). Alternatif: ubah ke Netlify Functions, tapi itu rewrite lebih besar.

## 4. Bagian B: tracker spreadsheet

### Data awal (dari Sheet, revisi 5)

17 baris (T01 sampai T17), 12 kolom: ID, Judul, Peran saya, Status, Jenis, Target jurnal/venue, Co-author (urutan), Terbit/tenggat, Langkah berikutnya, Link, Sumber data, Catatan. Ada sheet "Ringkasan" yang menghitung per peran dan per status.

Dropdown di Sheet:
- Peran: Penulis 1, Penulis 2, Penulis 3, Penulis tunggal, Belum dicatat
- Status: Ide, Riset, Menulis, Submit, Review, Revisi, Terbit, Mandek, Belum dicek
- Jenis: SLR, Arsitektur, Analisis, Rancang bangun, Proposal hibah, Tugas kuliah, Tugas akhir, Lainnya
- Sumber data: Terverifikasi (publik), Catatan obrolan, Perlu dicek

### Masalah yang harus dibereskan dulu: dua model status

Sheet punya 9 status, sedangkan admin punya 13 (`ide, riset, draft, review_internal, submitted, under_review, revisi, accepted, scheduled, published` + `ditolak, ditarik, ditunda`). Tidak 1:1. Usulan pemetaan:

| Sheet | Admin |
| --- | --- |
| Ide | ide |
| Riset | riset |
| Menulis | draft |
| Submit | submitted |
| Review | under_review |
| Revisi | revisi |
| Terbit | published |
| Mandek | ditunda |
| Belum dicek | (baru, lihat di bawah) |

"Belum dicek" bukan status pipeline. Usulan: jadikan flag `verification` (pakai kolom "Sumber data") dan status-nya diisi sementara `ide`. Perlu persetujuan lu.

### Pendekatan (rekomendasi)

**Satu sumber data, dua tampilan.** Jangan bikin tabel kedua. Tracker adalah tampilan grid atas entity `items` yang sudah ada di Neon, jadi Kanban, grid, dan situs publik selalu sinkron.

- Halaman baru `TrackerPage`: grid yang bisa diedit inline, sort/filter per kolom, dropdown berwarna untuk Status/Peran/Jenis/Sumber, kolom Link bisa diklik, baris "Perlu dicek" diberi highlight, freeze kolom ID + Judul.
- Toggle tampilan di atas: **Tabel | Kanban** (Kanban pakai komponen yang sudah ada).
- Panel Ringkasan (menggantikan sheet "Ringkasan"): hitung per peran dan per status dari data langsung, bukan formula terpisah.
- Edit inline lewat endpoint `PUT` yang sudah ada, dengan optimistic locking dan 409 handling seperti Kanban sekarang.
- Impor sekali dari CSV/Sheet untuk data awal (lihat di bawah). Ekspor CSV ada di `admin/lib/csv.ts`.
- Tanpa library grid berat di tahap 1: tabel React biasa dulu. Kalau nanti butuh paste dari Excel atau formula, baru pertimbangkan TanStack Table atau AG Grid.

### Perubahan skema yang kemungkinan dibutuhkan

Kolom Sheet yang belum punya padanan di `itemSchema` (perlu dicek di `shared/schemas.ts` sebelum diputuskan): `Peran saya`, `Co-author (urutan)` (di skema ada `authors`, tapi bentuknya beda), `Langkah berikutnya`, `Sumber data`, dan `Terbit/tenggat` (campuran tanggal terbit dan tenggat). Semua field privat baru harus masuk daftar yang diblok `check-leak` / `public-schemas` supaya tidak bocor ke bundel publik (lihat commit `ebb3fe5`).

### Impor data awal

- 17 baris dari Sheet masuk sebagai item. Beberapa sudah ada di Neon (items = 13), jadi **harus dicocokkan dulu, bukan di-insert buta**: cocokkan berdasarkan judul/DOI dan tampilkan diff sebelum menulis.
- Baris yang diberi catatan "perlu dicek" (T03, T08, T09 dst.) tidak boleh dihitung sebagai terbit. Pertahankan flag verifikasinya.
- Eksekusi impor harus lewat backup dulu (`document_backups`).

## 5. Urutan kerja

1. Putuskan 3 keputusan di bagian 3 dan pemetaan status di bagian 4.
2. Perluas skema + public-schemas + test (`tests/public-data.test.ts`) agar field baru tidak bocor.
3. Skrip impor dengan mode dry-run (diff), lalu jalankan dengan backup.
4. `TrackerPage` (grid + toggle Tabel/Kanban + ringkasan).
5. Auth login + serve static + ganti Publish.
6. Deploy ke host, set env, uji dari luar jaringan.
7. `pnpm typecheck && pnpm test && pnpm check:leak` hijau sebelum deploy.

## 6. Di luar cakupan

- Kolaborasi multi-user / realtime.
- Mengganti Neon, atau membuat Sheet Claude jadi sumber data permanen (Sheet hanya sumber impor awal).
- Perubahan tampilan situs publik.
