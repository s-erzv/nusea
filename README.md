# Nuza Lab

Portofolio riset publik dan back office lokal untuk Sarah Fajriah Rahmah. Situs publik menampilkan riset, aset, peta riset, dan profil. Back office berjalan hanya di `127.0.0.1` untuk mengelola data, pipeline, hibah, ide, tugas, sumber, venue, backup, dan publikasi.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS
- Express + Vite middleware untuk admin lokal
- Zod untuk validasi data
- Vitest untuk test
- Netlify untuk deploy situs publik

## Prasyarat

- Node.js 22 atau lebih baru
- pnpm 10.34.3 (lihat `packageManager` di `package.json`)

Gunakan pnpm, bukan npm.

```bash
pnpm install
```

## Menjalankan

Jalankan situs publik dan admin di dua terminal terpisah.

```bash
# Terminal 1 — situs publik
pnpm dev
# http://127.0.0.1:5173

# Terminal 2 — back office
pnpm admin
# http://127.0.0.1:5174
```

Saat admin mulai, terminal mencetak token sesi acak. Tempel token tersebut di halaman gate admin. Token berubah setiap server admin dijalankan ulang dan tidak disimpan di repo.

Port admin dapat diganti:

```bash
ADMIN_PORT=5180 pnpm admin
```

## Script

| Perintah | Fungsi |
| --- | --- |
| `pnpm dev` | Situs publik dengan Vite di `127.0.0.1:5173` |
| `pnpm admin` | Back office lokal di `127.0.0.1:5174` |
| `pnpm typecheck` | Typecheck situs publik dan admin |
| `pnpm lint` | ESLint tanpa warning |
| `pnpm test` | Semua test Vitest |
| `pnpm publish:data` | Buat `data/public/` dari `data/private/` |
| `pnpm check:leak` | Pindai `dist/` terhadap ID, URL, dan field privat |
| `pnpm build` | Typecheck + build produksi + `check:leak` |
| `pnpm preview` | Preview hasil build di `127.0.0.1` |

## Struktur data

```text
data/
├── private/          # sumber kebenaran lengkap, jangan diedit dari UI publik
│   ├── profile.json
│   ├── items.json
│   ├── assets.json
│   ├── venues.json
│   ├── sources.json
│   ├── grants.json
│   ├── ideas.json
│   ├── tasks.json
│   └── history.json
├── public/           # hasil generate, hanya field yang diizinkan
│   ├── profile.json
│   ├── items.json
│   ├── assets.json
│   ├── venues.json
│   ├── grants.json
│   └── ideas.json
└── .backups/         # backup otomatis, diabaikan git
```

`data/private/` adalah sumber lengkap. Jangan mengedit `data/public/` secara manual; file itu dibuat ulang oleh `pnpm publish:data`.

## Batas publik dan pemeriksaan kebocoran

Allowlist ada di:

- `shared/public-schemas.ts` — daftar field yang boleh keluar
- `shared/public-data.ts` — filter `visibility: "public"` dan pembentukan bundle publik

Hanya record dengan `visibility: "public"` yang masuk ke `data/public/`. Field baru tetap privat sampai ditambahkan secara eksplisit ke allowlist.

`pnpm check:leak` memeriksa hasil build terhadap:

- ID dan URL milik record privat
- Nama field privat seperti `notes`, `tasks`, `sources`, `stageNote`, `localPath`, `itemIds`, `howVerified`, `fileOnHand`, dan `submitChecklist`
- Referensi ke `data/private`

Build harus gagal jika ada kebocoran. Jangan melewati pemeriksaan ini.

Situs publik hanya mengimpor `data/public/` dan `shared/`; `src/` tidak boleh mengimpor `admin/`.

## Back office

Tab yang tersedia:

- **Dashboard** — ringkasan riset, status, tenggat, dan aktivitas.
- **Riset** — CRUD semua field riset, termasuk catatan tahap dan checklist privat.
- **Pipeline** — kanban status dengan pencatatan riwayat.
- **Inventory** — aset privat/publik, tautan, dan pemeriksaan link.
- **Sumber** — log sitasi dan verifikasi.
- **Hibah** — skema, tenggat, dan tahap seleksi.
- **Bank Ide** — skor ide dan status.
- **Tugas** — tambah cepat dan tandai selesai.
- **Venue** — daftar jurnal/konferensi.
- **Profil** — mode baca lalu edit.
- **Data** — unduh/unggah JSON, impor/ekspor CSV, dan backup.
- **Publikasikan** — preview, commit, dan push.

Setiap penyimpanan divalidasi Zod di server dan membuat backup file sebelumnya. Perubahan status lewat form maupun kanban dicatat ke `data/private/history.json`.

### Backup dan restore

- Backup otomatis dibuat sebelum file ditulis.
- Maksimal 20 backup terakhir per file disimpan di `data/.backups/`.
- Backup dapat diunduh dari tab **Data**.
- Restore manual: unduh backup, lalu unggah lewat panel JSON di tab **Data**. Upload mengganti seluruh file setelah validasi.

Backup berisi data privat. Jangan membagikannya.

### CSV

Tab **Data** menyediakan impor/ekspor CSV untuk riset dan hibah.

- Gunakan hasil ekspor sebagai template kolom.
- Daftar (mis. `keywords`, `authors`, `team`) dipisahkan dengan `|`.
- Boolean memakai `true`/`false`.
- Baris dengan ID yang sama akan memperbarui record; ID baru akan ditambahkan.
- File CSV divalidasi ulang oleh server sebelum disimpan.
- Untuk riset, perubahan status lewat impor juga mencatat riwayat.

## Alur publikasi

1. Edit data di admin dan simpan.
2. Buka **Publikasikan** lalu jalankan **Preview**.
3. Preview menjalankan `publish:data`, build produksi, typecheck, dan `check:leak`.
4. Jika preview lolos, periksa diff `data/public/`.
5. **Commit** hanya men-stage `data/private/` dan `data/public/`.
6. **Push** memicu build Netlify.

Commit dinonaktifkan jika preview gagal. Push selalu meminta konfirmasi.

Perintah manual ekuivalen:

```bash
pnpm publish:data
pnpm build
git add data/private data/public
git commit -m "data: publikasikan YYYY-MM-DD"
git push
```

## Keamanan

Back office adalah alat lokal, bukan aplikasi yang boleh diekspos ke internet.

- Server admin hanya listen di `127.0.0.1`.
- Koneksi non-loopback ditolak dengan `403`.
- Semua endpoint `/api` membutuhkan token sesi; token salah menghasilkan `401`.
- Token dibuat acak per proses dan dibandingkan dengan perbandingan waktu konstan.
- Admin tidak ikut dibangun ke `dist/`; build publik hanya memakai `index.html` dan `src/`.
- `data/.backups/` dan `assets-private/` diabaikan git.

Peringatan penting: alur commit admin men-stage `data/private/`. Repo remote harus privat. Jika repo publik, jangan gunakan commit data dari admin dan pindahkan `data/private/` keluar dari git. Data privat yang pernah di-commit tetap ada di riwayat git sampai riwayat dibersihkan.

## Deploy Netlify

`netlify.toml` sudah mengatur:

- Build command: `pnpm run build`
- Publish directory: `dist`
- Node.js 22
- SPA redirect ke `index.html`

Hubungkan repo ke Netlify. Jangan menambahkan server admin ke deployment. `data/private/` tersedia di lingkungan build Netlify karena repo di-commit, tetapi tidak pernah masuk ke bundle publik; `check:leak` memverifikasi ini.

## Verifikasi

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Test mencakup allowlist publik, deteksi kebocoran, guard server, backup/atomic write, transisi status dan riwayat, serta CSV.

## Catatan

- Font `Press Start 2P` dan `VT323` dimuat dari Google Fonts; tanpa internet akan memakai fallback monospace.
- Nama situs, sosial, dan program studi saat ini memakai nilai yang tersedia di `data/private/profile.json`.
