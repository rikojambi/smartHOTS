# SMART HOTS – Rencana Pengembangan Advanced Learning Intelligence

## 1. Hasil audit aplikasi existing

### 1.1 Kondisi umum
- Aplikasi berjalan stabil pada React + TypeScript + Vite + Tailwind + Dexie/IndexedDB.
- Git berada di cabang `main`, sinkron dengan `origin/main`, commit terakhir `8d401c9`.
- Tidak ada perubahan worktree sebelum pengembangan dimulai.
- Build produksi sebelumnya berhasil dan PWA aktif.

### 1.2 Struktur database saat ini
Database `smart-hots-db` hanya memiliki `version(1)` dengan 20 tabel:

`users`, `students`, `teachers`, `classes`, `subjects`, `topics`, `learningObjectives`, `questions`, `questionOptions`, `questionMedia`, `questionRevisions`, `exercises`, `exerciseQuestions`, `studentAttempts`, `studentAnswers`, `learningAnalytics`, `remediationRecommendations`, `importHistory`, `applicationSettings`, `syncQueue`.

Catatan penting:
- `studentAnswers` dideklarasikan tetapi tidak dipakai; jawaban sebenarnya tersimpan di `StudentAttempt.answers`.
- `learningAnalytics` berhubungan 1:1 dengan `studentAttempts` melalui `attemptId`.
- `remediationRecommendations` hanya berisi teks rekomendasi manual dan tidak memiliki keterkaitan kuat ke indikator/attempt.
- `syncQueue` bertipe auto-increment number dan sengaja tidak masuk backup.
- Backup penuh sudah menangani blob `questionMedia` sebagai byte array.

### 1.3 Fitur yang sudah berjalan dan harus dipertahankan
- Login dan role guard admin/guru/siswa.
- Bank soal 100 soal dengan CRUD, revisi, arsip/aktif, filter, dan duplikasi deteksi pasca-simpan.
- 10 paket latihan aktif, satu per mata pelajaran.
- Latihan siswa: autosave, flag, timer, submit, penilaian parsial, hasil, dan pembahasan.
- Analitik per attempt: materi, TP, indikator teks bebas, pola kesalahan, miskonsepsi, bukti respons, rekomendasi teks.
- Pengaturan ambang penguasaan, penilaian, sinkronisasi, backup/pulihkan, reset.
- Import DOCX existing dengan parsing OOXML, gambar DrawingML, tabel sebagai teks, dan persamaan sebagai `$...$`.
- Ekspor Excel/CSV/JSON/Word/PDF/print.
- PWA offline dan result-sync ekspor–impor JSON antar-perangkat.

### 1.4 Kesenjangan terhadap requirement baru
1. **Indikator belum memiliki identitas stabil.** `Question.indicator` masih teks bebas sehingga analitik per indikator mudah terfragmentasi.
2. **Bukti penguasaan bersifat per-attempt.** Tidak ada agregasi lintas attempt, lintas siswa, atau time series per indikator.
3. **Belum ada heatmap.** Dashboard dan analitik hanya menampilkan satu attempt atau ringkasan umum.
4. **Remedial belum adaptif.** Tombol "Buat remedial" memakai substring dan hardcoded 70%, tanpa tingkatan, penugasan, evaluasi ulang, atau loop perbaikan.
5. **Import DOCX belum wizard.** Parsing, preview, edit, dan simpan masih satu halaman; belum ada tahap analisis struktur, ekstraksi, penolakan per soal, duplikasi, atau impor ulang terstruktur.
6. **Template tidak sepenuhnya konsisten dengan parser** (misalnya `TINGKAT` terbaca sebagai kesulitan, `Stimulus` lowercase tidak dikenali).
7. **Result-sync belum membawa data baru** seperti bukti kompetensi, paket remedial, media soal, dan metadata objektif pembelajaran.
8. **AI tidak bisa menyimpan API key di frontend.** Ini batas teknis dan keamanan, bukan kekurangan implementasi.

## 2. Keputusan arsitektur

### 2.1 Prinsip
- **Tidak membangun ulang aplikasi.**
- **Tidak mengganti database.** Seluruh perubahan bersifat aditif melalui Dexie `version(2)`.
- Semua modul baru memakai tabel, peran, dan komponen yang sudah ada.
- Tidak ada penghapusan fitur lama.
- Tidak ada soal baru atau kunci jawaban yang dibuat otomatis tanpa validasi guru.

### 2.2 Alasan perubahan skema
Dexie `version(1)` tidak bisa menambah index tanpa migrasi. Modul heatmap dan remedial memerlukan:
- identitas indikator yang stabil,
- bukti jawaban lintas attempt,
- paket remedial dan riwayat evaluasinya,
- agregat kelas yang dapat dihitung ulang saat ambang berubah.

Oleh karena itu ditambahkan `version(2)` secara aditif. Ini lebih aman daripada menimpa skema karena seluruh data existing tetap terbaca dan backup lama tetapRESTORE-able.

### 2.3 Perubahan database yang direncanakan
Ditambahkan tabel baru:

| Tabel | Tujuan | Index utama |
|---|---|---|
| `skillEvidence` | Satu baris bukti per jawaban siswa yang dinilai, dipakai heatmap/trend | `id`, `studentId`, `attemptId`, `questionId`, `subjectId`, `topicId`, `indicatorKey`, `cognitive`, `createdAt`, `[studentId+indicatorKey]`, `[studentId+createdAt]` |
| `remedialPlans` | Paket remedial adaptif per siswa/indikator | `id`, `studentId`, `subjectId`, `topicId`, `indicatorKey`, `level`, `status`, `assignedBy`, `createdAt`, `dueAt`, `[studentId+status]` |

Field opsional ditambahkan tanpa mengubah tabel:
- `Question.indicatorKey`, `Question.learningObjectiveId`, `Question.generatedBy`, `Question.approvedBy`, `Question.approvedAt`.
- `StudentAttempt.kind` (`reguler`/`remedial`/`pengayaan`) dan `StudentAttempt.remedialPlanId`.
- `ImportHistory` diperluas dengan `successCount`, `failedCount`, `imageCount`, `errors`, `questionIds`, `reimportOf`.
- `ApplicationSetting` baru: `heatmapColors`, `heatmapMinEvidence`, `remedialSettings`, `aiConfig`.

Index baru pada tabel existing:
- `questions`: `indicatorKey`, `learningObjectiveId`.
- `studentAttempts`: `[studentId+status]`.
- `learningAnalytics`: `[studentId+createdAt]`.

Migrasi `version(2)` mengisi `indicatorKey` untuk soal lama dan setting baru tanpa menghapus data.

### 2.4 Identitas kompetensi
`indicatorKey` dibentuk dari `topicId` + indikator yang dinormalisasi (huruf kecil, spasi dan tanda baca disatukan). Ini:
- tidak mengubah teks indikator yang tampil ke guru,
- cukup stabil untuk agregasi,
- tidak memaksa guru mengisi kode baru secara manual.

Jika tersedia `learningObjectiveId`, kode itulah yang dipakai sebagai identitas utama.

### 2.5 Integrasi antarmodul
Alur data yang dipakai:

`submit latihan` → `gradeAnswer` → `StudentAttempt` → `LearningAnalytic` → `skillEvidence` → `Heatmap` → `remedialPlans` → `attempt remedial` → evaluasi ulang → `skillEvidence` terbaru → `Heatmap` dan `remedialPlans` diperbarui.

Semua modul memakai `db` yang sama. Tidak ada duplikasi siswa atau bank soal.

### 2.6 Word-to-Question
Parser OOXML existing dipertahankan dan diperluas:
- token case-insensitive,
- metadata dokumen (`MATA PELAJARAN`, `MATERI`, `SEMESTER`, `KELAS`),
- `PERTANYAAN`, `LEVEL`, `INDIKATOR`, `STIMULUS`,
- tabel sebagai HTML, bukan hanya teks pipa,
- gambar tetap terhubung ke soal/opsi lewat relationship ID,
- OMML dasar (pecahan, akar, pangkat) dikonversi ke teks matematika yang bisa dirender KaTeX,
- wizard 5 tahap,
- duplikasi berdasarkan kemiripan teks + materi,
- penyimpanan bertahap untuk 500 soal.

Template Word diperbaiki agar parser dan template saling cocok, dengan satu contoh terisi.

### 2.7 Adaptive Remedial
Mesin remedial memakai `skillEvidence`, bukan nilai total:
- menentukan indikator belum tuntas dari ambang yang bisa diatur guru,
- membedakan "belum cukup bukti" dan "belum menguasai",
- menentukan tingkat 1/2/3 dari pola jawaban dan kognitif,
- memilih soal dari bank yang cocok dan belum recently used,
- memberi peringatan jika bank tidak cukup,
- tidak membuat soal/kunci baru otomatis,
- setelah remedial selesai, mengevaluasi ulang dan naik tingkat/tuntas/pengayaan.

Guru dapat menyetujui, mengubah, menugaskan,_memberi tenggat, menghentikan, dan memberi pengayaan.

### 2.8 AI Learning Assistant
Karena API key tidak boleh disimpan di frontend:
- modul AI hanya berupa adapter ke endpoint proxy yang dikonfigurasi admin;
- tidak ada field API key di UI;
- default `enabled: false`;
- aplikasi tetap penuh tanpa AI;
- keluaran AI hanya draft soal/teks analisis;
- draft tidak otomatis masuk bank soal dan tidak mengubah nilai/ketuntasan;
- guru harus menyetujui draft.

### 2.9 Result-sync
Format paket dinaikkan ke `version: 2`, tetap menerima `version: 1`. Paket baru membawa:
- `skillEvidence`,
- `remedialPlans`,
- `learningObjectives`,
- `questionMedia`,
- `importHistory`.

Impor tetap idempoten berdasarkan primary key dan tidak menimpa data yang ada.

## 3. Rencana implementasi modular

### Fase 0 – Fondasi
1. Dokumen rencana ini.
2. Update `src/types.ts`.
3. Update `src/db/db.ts` dengan Dexie `version(2)` + migrasi.
4. Update seed dan pengaturan default.
5. Update `analytics.ts` untuk menghasilkan `skillEvidence`.

### Fase 1 – Learning Heatmap
1. `src/lib/heatmap.ts`.
2. `src/pages/HeatmapPage.tsx`.
3. Filter, matriks, agregat kelas, detail siswa, tren per indikator, cetak/ekspor.
4. Pengaturan warna dan minimal bukti.

### Fase 2 – Word-to-Question Engine
1. Perluas `src/lib/docx.ts`.
2. Ubah `src/pages/ImportPage.tsx` menjadi wizard 5 tahap.
3. Template Word resmi + contoh terisi.
4. Riwayat impor, duplikasi, impor ulang, dan pemrosesan bertahap.

### Fase 3 – Adaptive Remedial Learning
1. `src/lib/remedial.ts`.
2. `src/pages/RemedialPage.tsx`.
3. `src/pages/StudentRemedialPage.tsx`.
4. `src/pages/RemedialReportPage.tsx`.
5. Integrasi submit latihan dan evaluasi ulang.

### Fase 4 – Integrasi & pengujian
1. Route, guard, sidebar, dashboard shortcut.
2. Update result-sync dan ekspor.
3. Update README.
4. Build produksi.
5. Uji browser: heatmap, import DOCX, remedial, sinkronisasi, dan regresi fitur lama.
6. Commit bertahap ke `origin/main`.

## 4. Kriteria keberhasilan

- Seluruh fitur lama tetap berfungsi.
- Tidak ada data siswa/soal duplikat akibat modul baru.
- Heatmap menampilkan bukti jumlah soal dan status "belum cukup bukti".
- Agregat kelas, siswa terlemah/terkuat, dan indikator error tertinggi benar.
- DOCX dengan gambar, tabel, dan persamaan dapat di-preview dan diedit sebelum disimpan.
- Import 500 soal tidak crash dan progres terlihat.
- Rekomendasi remedial berbeda antar-siswa sesuai bukti.
- Remedial memiliki evaluasi ulang dan update heatmap.
- Guru dapat mengontrol penuh proses remedial.
- Paket hasil antar-perangkat tetap dapat diimpor.
- AI tidak pernah menyimpan API key di frontend dan tidak mengubah nilai.
