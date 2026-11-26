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
- Fitur: bank soal + CRUD, **Word-to-Question** (DOCX 5 langkah), latihan adaptif, diagnosis kesalahan, **Learning Heatmap**, **Remedial Adaptif**, analitik, ekspor/cetak, backup/pulihkan, dan PWA offline.
- **Learning Heatmap**: matriks siswa × indikator (juga bisa difilter per mapel, materi/TP, level kognitif, kelas, periode), detail per siswa, time-series indikator, ekspor CSV/JSON, dan cetak. Status "Perlu remedial" hanya muncul jika bukti mencukupi; sel dengan bukti kurang ditandai **belum cukup bukti**.
- **Remedial Adaptif**: rekomendasi per indikator dengan 3 level + pengayaan, pemilihan soal dari bank yang sudah ada, peringatan jika bank/bukti tidak cukup, persetujuan dan penugasan oleh guru, attempt remedial, evaluasi otomatis, laporan, dan pembaruan heatmap setelah evaluasi.
- **Asisten AI opsional**: hanya adapter proxy; API key tidak pernah disimpan di browser. AI tidak mengubah nilai/ketuntasan dan menghasilkan draft soal yang harus disetujui guru.
- **Hasil latihan siswa dapat dipindah ke aplikasi guru** lewat paket JSON ekspor–impor (versi 2, kompatibel dengan versi 1), tanpa server.

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
5. **Import DOCX / Word-to-Question**
   - Unduh **Template kosong** atau **Contoh terisi** di menu **Import DOCX**.
   - Ikuti 5 langkah: unggah → analisis struktur → ekstraksi → preview/edit → simpan.
   - Teks, tabel, gambar, dan persamaan OOXML dasar dipertahankan. Wizard mendeteksi duplikat, menyediakan **Lewati**/**Impor ulang**, dan memproses 10–500 soal per dokumen secara bertahap (25 soal per batch).
   - Format `.doc` lama tidak diparse; konversi ke `.docx` terlebih dahulu.
   - Soal hasil import masuk sebagai **Perlu diperiksa**; periksa status/kunci di Bank Soal sebelum dipakai latihan.
6. **Learning Heatmap**
   - Buka menu **Heatmap** untuk melihat penguasaan per indikator pada matriks siswa × indikator.
   - Filter kelas, siswa, mapel, materi, TP, indikator, level kognitif, dan rentang tanggal.
   - Klik sel/nama siswa untuk detail, bukti respons, dan grafik perkembangan indikator.
   - Gunakan **Ekspor CSV**, **Ekspor JSON**, atau cetak. Dari detail siswa, tombol **Tugaskan remedial** membuka halaman remedial dengan siswa dan indikator sudah terpilih.
7. **Remedial Adaptif**
   - Buka menu **Remedial**, lalu **Buat rekomendasi**. Guru/admin juga bisa datang dari heatmap dengan konteks siswa + indikator.
   - Sistem mengelompokkan bukti per indikator, memilih level 1/2/3 atau pengayaan, serta mengambil soal dari bank yang aktif. Sistem **tidak membuat soal/kunci otomatis**.
   - Jika bukti < 3 butir, < 2 soal berbeda, atau bank soal tidak cukup, akan muncul peringatan dan rencana dilewati.
   - Rencana berstatus **Disarankan** sampai guru memilih **Setujui / tugaskan**. Guru dapat mengubah level, materi, dan soal; menghentikan rencana; atau membuat pengayaan.
   - Siswa mengerjakan lewat **Remedial Saya**. Setelah dinilai, evaluasi dibuat otomatis, status berubah menjadi **Tuntas** bila mencapai ambang, dan bukti baru memperbarui heatmap.
   - **Laporan** pada tiap rencana dapat dicetak atau diunduh sebagai JSON.
8. **Akses Mapel Siswa**
   - Pilih siswa, lalu centang mapel yang boleh dikerjakan.
   - Guru hanya dapat mengatur mapel yang diampu; admin dapat mengatur semua mapel.
   - Mapel yang tidak dicentang tidak muncul di halaman **Mulai Latihan** siswa.
9. **Sinkronisasi Hasil**
   - Buka menu **Sinkronisasi Hasil**, pilih file JSON hasil latihan dari siswa, lalu **Baca file**.
   - Periksa pratinjau siswa, jumlah hasil, dan daftar paket, lalu klik **Impor ke aplikasi guru**.
   - Impor tidak menimpa data yang sudah ada, sehingga boleh diulang. Paket versi 1 lama juga diterima dan bukti kompetensinya dibangun ulang dari jawaban.
10. **Analisis Siswa**
   - Lihat penguasaan per materi, TP, indikator, pola kesalahan, dan buat rekomendasi remedial.
11. **Asisten AI (opsional)**
   - Aktifkan di **Pengaturan** dan isi URL endpoint proxy milik sekolah. Tidak ada kolom API key di aplikasi.
   - Di menu **Asisten AI**, pilih layanan (penjelasan/ringkasan/rekomendasi/draft soal/kualitas soal) dan siswa, lalu jalankan.
   - Draft soal dari AI masuk sebagai **Draft** dan baru dapat dipakai setelah guru menyetujuinya di Bank Soal. Nilai dan ketuntasan siswa tidak pernah diubah AI.
12. **Pengaturan lanjutan**
   - Atur ambang penguasaan, warna heatmap, minimal bukti per indikator, jumlah soal remedial/pengayaan, hari hindari soal terpakai, dan izin layanan AI.
13. **Ekspor & Cetak**
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
5. Buka **Remedial Saya** untuk melihat tugas yang telah disetujui guru, membaca materi, dan mengerjakan remedial/pengayaan. Nilai akhir serta rekomendasi lanjutan ditampilkan setelah selesai.
6. Riwayat dan laporan belajar tersedia di menu **Riwayat Latihan** dan **Laporan Belajar**.
7. Untuk mengirim hasil ke guru, buka **Mulai Latihan** lalu klik **Unduh hasil untuk guru**. Kirim file JSON yang diunduh ke guru/admin. Paket ini juga membawa bukti kompetensi dan rencana remedial yang relevan.

### 3. Untuk Admin

1. Masuk sebagai `admin` / `admin123`.
2. **Pengguna**: kelola akun admin/guru/siswa, status aktif/nonaktif, kelas, dan mata pelajaran guru.
3. **Akses Mapel Siswa**: tentukan mapel aktif untuk setiap siswa tanpa membatasi hanya pada mapel yang diampu guru.
4. **Sinkronisasi Hasil**: terima paket JSON hasil latihan dari perangkat siswa dan impor ke aplikasi guru.
5. **Pengaturan**:
   - Ubah ambang kategori penguasaan dan warna learning heatmap.
   - Atur minimal bukti per indikator, ambang tuntas remedial, jumlah soal per level/pengayaan, dan lama hindari soal terpakai.
   - Aktifkan/nonaktifkan asisten AI, isi endpoint proxy, dan tentukan layanan yang diizinkan. Tidak ada API key di sisi browser.
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

Urutan `SOAL n:` harus berada di awal blok. Format lama dengan `JENIS` sebelum `SOAL` juga masih dikenali. Wizard juga memahami `STIMULUS`, `PERTANYAAN`, `TINGKAT KESULITAN`, `LEVEL`, `INDIKATOR`, `TP`, `MISKONSEPSI`, `REKOMENDASI`, dan `SEMANTIK`. Tabel dan gambar dipindai dari OOXML; persamaan OMML dasar (pecahan, akar, pangkat, simbol) dikonversi ke notasi teks. Konversi ini bukan pengganti LaTeX/MathML penuh. Setelah memuat ulang halaman, opsi **Impor ulang** memerlukan file DOCX asli dipilih kembali karena cache file hanya disimpan selama sesi.

---

## Learning Heatmap & bukti kompetensi

- Penguasaan dihitung dari `skillEvidence` (bukti respons per soal), bukan dari nilai akhir latihan.
- Identitas indikator yang stabil: `indicatorKey` dari `learningObjectiveId`, `indicatorKey` yang sudah ada, atau `topicId` + teks indikator yang dinormalisasi.
- Status kategori: **Sangat baik / Baik / Cukup / Perlu penguatan / Perlu remedial**, dengan ambang dan warna yang dapat diatur di **Pengaturan**.
- Sebuah sel dinyatakan cukup bukti jika memiliki minimal `minEvidence` butir, `minEvidence` soal berbeda, dan minimal 2 attempt. Jika tidak cukup, sel ditampilkan sebagai **belum cukup bukti** dan tidak diberi kesimpulan remedial.
- Pola kesalahan dan miskonsepsi hanya ditampilkan jika berasal dari pola jawaban yang tercatat; aplikasi tidak menyimpulkan miskonsepsi tanpa bukti.
- Filter tersedia untuk kelas (mengikuti `className` siswa), siswa, mapel, materi, TP, indikator, level kognitif, dan rentang tanggal.
- Detail siswa menampilkan indikator dikuasai/perlu penguatan/belum cukup bukti, bukti respons, serta grafik perkembangan per indikator.
- Ekspor CSV/JSON dan cetak tersedia. Tombol **Tugaskan remedial** mengirim konteks `student` dan `indicator` ke halaman **Remedial**.

---

## Remedial adaptif

- Pemeriksaan dikelompokkan per indikator. Indikator dengan penguasaan di bawah `masteryThreshold` mendapat rencana; indikator dengan bukti kurang dari 3 butir atau kurang dari 2 soal berbeda dilewati dengan peringatan.
- Level ditentukan dari besaran gap penguasaan dan pola kesalahan dominan: **Level 1** penguatan konsep, **Level 2** prosedur/penerapan, **Level 3** analisis/evaluasi. Pengayaan memakai soal sulit C5/C6.
- Soal remedial hanya diambil dari bank yang aktif, tidak diarsipkan, sesuai indikator/mapel, dan belum terpakai dalam jendela `avoidRecentDays`. Jika jumlah soal tidak mencukupi, guru mendapat peringatan dan rencana tidak dibuat.
- Sistem **tidak membuat soal atau kunci jawaban baru**. Rencana baru berstatus **Disarankan** sampai guru menyetujui/menugaskan; guru dapat mengubah level, materi, dan soal.
- Attempt remedial memakai tabel `studentAttempts` yang sama dengan latihan biasa, dengan penanda `kind: 'remedial' | 'pengayaan'` dan `remedialPlanId`. Setelah selesai, `skillEvidence` bertambah dan evaluasi otomatis menentukan **Tuntas** atau tindak lanjut.
- Rencana pengayaan hanya dibuat jika tersedia soal sulit C5/C6 untuk indikator tersebut; jika tidak, alasan tercatat pada evaluasi.
- Laporan remedial dapat dicetak atau diunduh sebagai JSON.

---

## Data & penyimpanan

- Seluruh data disimpan lokal di browser memakai **IndexedDB** melalui Dexie (skema `version(2)`, peningkatan inkremental dari `version(1)`).
- Media/gambar soal disimpan sebagai blob di IndexedDB (tabel `questionMedia`).
- Bukti kompetensi dan rencana remedial disimpan di `skillEvidence` dan `remedialPlans`; keduanya ikut dalam backup dan paket hasil versi 2.
- Antrean perubahan dibuat otomatis di tabel `syncQueue`.
- Backup JSON dapat diunduh dan dipulihkan dari menu **Pengaturan**.
- **Reset ke data awal** menghapus semua perubahan dan mengembalikan 100 soal, 10 paket latihan aktif, serta akun demo.

### Batasan sinkronisasi

Untuk memindahkan hasil latihan antar-perangkat tanpa backend, pakai **Sinkronisasi Hasil**: siswa mengunduh paket JSON dari **Mulai Latihan**, lalu guru/admin mengimpornya di menu **Sinkronisasi Hasil**. Paket versi 2 berisi hasil selesai, analitik, rekomendasi, `skillEvidence`, `remedialPlans`, TP, media, riwayat import, serta soal/paket pendukung bila belum ada di perangkat guru. Paket versi 1 tetap diterima; bukti kompetensinya dibangun ulang dari jawaban yang dikirim.

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
  lib/            Auth, analytics, competency, heatmap, remedial, DOCX, AI adapter, export, result sync
  pages/          Halaman guru, admin, siswa, heatmap, remedial, asisten AI, import DOCX
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
| Sel heatmap bertanda "belum cukup bukti" | Kumpulkan minimal 3 bukti, 3 soal berbeda, dan 2 attempt untuk indikator tersebut; ubah minimal di **Pengaturan** bila diperlukan |
| Tombol **Buat rekomendasi** tidak menghasilkan rencana | Periksa pesan peringatan: bisa karena bukti belum cukup, indikator sudah dikuasai, rencana aktif sudah ada, atau bank soal sesuai tidak tersedia |
| Asisten AI belum bisa dipakai | Aktifkan layanan dan isi endpoint proxy di **Pengaturan**; aplikasi tetap berfungsi tanpa AI |
| Opsi **Impor ulang** tidak muncul setelah reload | Pilih kembali file DOCX asli; cache file hanya berlaku selama sesi |
| Ekspor tidak muncul | Izinkan popup/download di browser dan cek folder unduhan |

---

## Lisensi

Proyek ini dibuat untuk kebutuhan latihan HOTS SMA kelas X. Silakan disesuaikan untuk penggunaan sekolah.
