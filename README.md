# SMART HOTS – SMA Class X

Platform PWA berbahasa Indonesia untuk latihan dan analisis **Higher Order Thinking Skills (HOTS)** Kurikulum Merdeka kelas X. Aplikasi berjalan sepenuhnya di browser, menyimpan data di IndexedDB, dan dapat dipakai offline setelah aset termuat.

---

## Ringkasan

- **10 mata pelajaran × 10 soal HOTS = 100 soal**
- **10 paket latihan aktif**, satu untuk setiap mata pelajaran
- Setiap mapel: **6 pilihan ganda + 4 multiple response**
- Setiap soal memiliki: CP, TP, indikator, level kognitif C4/C5/C6, tingkat kesulitan, stimulus, opsi, kunci, pembahasan, alasan tiap pilihan salah, kompetensi, miskonsepsi, dan rekomendasi.
- Role: **Admin**, **Guru**, **Siswa**
- **Guru/admin dapat menentukan mapel aktif per siswa**; siswa hanya melihat latihan dari mapel yang diberikan.
- Fitur: bank soal + CRUD, import DOCX, latihan adaptif, diagnosis kesalahan, remedial otomatis, analitik, ekspor/cetak, backup/pulihkan, dan PWA offline.
- **Hasil latihan siswa dapat dipindah ke aplikasi guru** lewat paket JSON ekspor–impor, tanpa server.

---

## Teknologi

| Bagian | Teknologi |
|---|---|
| UI | React 18 + TypeScript + Tailwind CSS |
| Routing | React Router DOM |
| Build | Vite 6 |
| PWA | vite-plugin-pwa + Workbox |
| Database | Dexie / IndexedDB |
| Grafik | Recharts |
| Matematika | KaTeX + react-katex |
| DOCX | JSZip + Mammoth |
| Excel | xlsx |
| PDF | jsPDF + html2canvas |
| Ikon | Lucide React |

---

## Persyaratan

- Node.js **18+** (disarankan 20 LTS)
- npm **9+**
- Browser modern (Chrome/Edge/Firefox/Safari)

Untuk fitur install PWA, akses harus melalui **HTTPS** atau `localhost`.

---

## Instalasi

```bash
git clone https://github.com/rikojambi/smartHOTS.git
cd smartHOTS
npm install
```

---

## Menjalankan aplikasi

### Mode pengembangan

```bash
npm run dev
```

Buka: **http://localhost:5173**

### Build produksi

```bash
npm run build
```

Hasil build ada di folder `dist/`.

### Preview build produksi

```bash
npm run preview
```

Buka: **http://localhost:4173**

> Gunakan preview untuk menguji service worker, manifest, dan mode offline.

---

## Akun demo

| Peran | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Guru | `guru` | `guru123` |
| Guru 2 | `guru2` | `guru123` |
| Siswa | `siswa` | `siswa123` |
| Siswa 2 | `siswa2` | `siswa123` |

Tombol **Guru / Siswa / Admin** di halaman login akan mengisi kredensial dan langsung masuk.

---

## Panduan cepat

### 1. Untuk Guru

1. Masuk sebagai `guru` / `guru123`.
2. **Bank Soal**
   - Lihat 100 soal, filter mapel, materi, jenis, level kognitif, dan kesulitan.
   - Tambah, edit, arsipkan/aktifkan, pindah materi, atau hapus soal.
   - Setiap edit menaikkan versi soal dan tersimpan sebagai revisi.
3. **Materi & TP**
   - Tambah/edih mata pelajaran, materi, CP, dan TP.
   - Perubahan TP tidak menghapus riwayat latihan siswa.
4. **Latihan**
   - Buat paket latihan: pilih soal, durasi, acak urutan/acak opsi, pembahasan, dan penilaian parsial.
5. **Import DOCX**
   - Unduh template, isi sesuai format, lalu import.
   - Periksa pratinjau, edit bila perlu, lalu konfirmasi simpan.
6. **Akses Mapel Siswa**
   - Pilih siswa, lalu centang mapel yang boleh dikerjakan.
   - Guru hanya dapat mengatur mapel yang diampu; admin dapat mengatur semua mapel.
   - Mapel yang tidak dicentang tidak muncul di halaman **Mulai Latihan** siswa.
7. **Sinkronisasi Hasil**
   - Buka menu **Sinkronisasi Hasil**, pilih file JSON hasil latihan dari siswa, lalu **Baca file**.
   - Periksa pratinjau siswa, jumlah hasil, dan daftar paket, lalu klik **Impor ke aplikasi guru**.
   - Impor tidak menimpa data yang sudah ada, sehingga boleh diulang.
8. **Analisis Siswa**
   - Lihat penguasaan per materi, TP, indikator, pola kesalahan, dan buat rekomendasi remedial.
9. **Ekspor & Cetak**
   - Ekspor Excel, CSV, JSON, Word dengan/tanpa kunci, template DOCX, atau cetak.

### 2. Untuk Siswa

1. Masuk sebagai `siswa` / `siswa123`.
2. Buka **Mulai Latihan**. Hanya mapel yang diberikan guru/admin yang ditampilkan. Pilih paket, lalu klik **Mulai latihan**.
3. Jawab pilihan ganda atau multiple response.
   - Jawaban tersimpan otomatis.
   - Timer berjalan dan submit otomatis saat waktu habis.
   - Tombol **Tandai tinjau** menandai soal untuk ditinjau.
4. Setelah selesai, lihat:
   - Nilai dan pembahasan tiap soal.
   - Materi yang perlu penguatan.
   - Pola kesalahan dan rekomendasi remedial.
5. Riwayat dan laporan belajar tersedia di menu **Riwayat Latihan** dan **Laporan Belajar**.
6. Untuk mengirim hasil ke guru, buka **Mulai Latihan** lalu klik **Unduh hasil untuk guru**. Kirim file JSON yang diunduh ke guru/admin.

### 3. Untuk Admin

1. Masuk sebagai `admin` / `admin123`.
2. **Pengguna**: kelola akun admin/guru/siswa, status aktif/nonaktif, kelas, dan mata pelajaran guru.
3. **Akses Mapel Siswa**: tentukan mapel aktif untuk setiap siswa tanpa membatasi hanya pada mapel yang diampu guru.
4. **Sinkronisasi Hasil**: terima paket JSON hasil latihan dari perangkat siswa dan impor ke aplikasi guru.
5. **Pengaturan**:
   - Ubah ambang kategori penguasaan.
   - Atur penilaian parsial dan penalti jawaban salah.
   - Konfigurasi endpoint sinkronisasi bila tersedia.
   - Unduh backup JSON, pulihkan backup, atau reset ke data awal.

---

## Format template import DOCX

Gunakan template yang bisa diunduh di menu **Import DOCX**. Format utama:

```text
SOAL 1:
JENIS: pilihan ganda
KUNCI: B
PEMBAHASAN: ...
TP: TP1 Menjelaskan pola bilangan
TINGKAT KOGNITIF: C4

SOAL 2:
JENIS: multiple response
KUNCI: A,C,D
PEMBAHASAN: ...
TP: TP2 Menyusun deret
TINGKAT KOGNITIF: C5
```

Urutan `SOAL n:` harus berada di awal blok. Format lama dengan `JENIS` sebelum `SOAL` juga masih dikenali.

---

## Data & penyimpanan

- Seluruh data disimpan lokal di browser memakai **IndexedDB** melalui Dexie.
- Media/gambar soal disimpan sebagai blob di IndexedDB.
- Antrean perubahan dibuat otomatis di tabel `syncQueue`.
- Backup JSON dapat diunduh dan dipulihkan dari menu **Pengaturan**.
- **Reset ke data awal** menghapus semua perubahan dan mengembalikan 100 soal, 10 paket latihan aktif, serta akun demo.

### Batasan sinkronisasi

Untuk memindahkan hasil latihan antar-perangkat tanpa backend, pakai **Sinkronisasi Hasil**: siswa mengunduh paket JSON dari **Mulai Latihan**, lalu guru/admin mengimpornya di menu **Sinkronisasi Hasil**. Paket berisi hasil selesai, analitik, rekomendasi, serta soal/paket pendukung bila belum ada di perangkat guru.

Aplikasi juga memiliki arsitektur antrean sinkronisasi dan pengaturan endpoint. Namun **backend cloud tidak disertakan**. Secara default `provider: none`. Jika ingin sinkron otomatis ke server, siapkan server/API sendiri lalu isi endpoint di **Pengaturan → Sinkronisasi**.

---

## Instalasi PWA & offline

1. Jalankan `npm run build` lalu `npm run preview`, atau deploy `dist/` ke hosting HTTPS.
2. Buka aplikasi di Chrome/Edge.
3. Gunakan menu browser **Install app** / **Add to Home screen**.
4. Setelah halaman pertama termuat, service worker menyimpan shell aplikasi, ikon, CSS, dan JS.
5. Aplikasi tetap bisa dibuka dan dipakai tanpa koneksi; data baru akan masuk antrean sinkronisasi.

---

## Struktur proyek

```text
src/
  components/     Komponen UI, editor soal, layout, rich text
  data/           Seed 100 soal, CP/TP, dan kategori materi
  db/             Skema Dexie, backup/restore, sync queue
  lib/            Auth, analytics, grading, DOCX, export, result sync
  pages/          Halaman guru, admin, dan siswa
  App.tsx         Routing + guard peran
  types.ts        Definisi tipe domain
public/           Ikon PWA, favicon, manifest pendukung
scripts/          Script pembuat ikon PNG
```

---

## Script npm

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan dev server |
| `npm run build` | Type-check + build produksi + generate PWA |
| `npm run preview` | Melayani hasil build produksi |

---

## Pemecahan masalah

| Masalah | Solusi |
|---|---|
| Halaman terlihat kosong saat pertama dibuka | Tunggu sekitar 1 detik saat `useLiveQuery` memuat IndexedDB |
| Tidak bisa install PWA | Pastikan HTTPS atau `localhost`, dan build produksi sudah dipakai |
| Data uji tercampur | Buka **Pengaturan → Reset ke data awal** |
| Ingin memindahkan seluruh data ke perangkat lain | Unduh backup JSON, lalu pulihkan di perangkat tujuan |
| Ingin memindahkan hanya hasil latihan siswa | Unduh paket JSON dari **Mulai Latihan**, lalu impor di menu **Sinkronisasi Hasil** guru/admin |
| Ekspor tidak muncul | Izinkan popup/download di browser dan cek folder unduhan |

---

## Lisensi

Proyek ini dibuat untuk kebutuhan latihan HOTS SMA kelas X. Silakan disesuaikan untuk penggunaan sekolah.
