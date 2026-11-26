import type { SeedInput } from '../seedTypes'

export const INF: SeedInput[] = [
  {
    code: 'INF-01', subjectId: 'INF', topicId: 'inf-1', subTopic: 'Pseudocode',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Pseudocode berikut menentukan status kelulusan: BACA nilai; JIKA nilai ≥ 75 MAKA cetak "Lulus" SELAIN ITU cetak "Remedial".',
    prompt: 'Jika siswa memperoleh nilai 74, keluaran pseudocode tersebut adalah ...',
    options: ['Lulus', 'Remedial', 'Tidak ada keluaran', 'Nilai 75', 'Error karena nilai desimal'],
    answer: 'B',
    explanation: 'Syarat nilai ≥ 75 tidak terpenuhi untuk 74, sehingga cabang SELAIN ITU dijalankan dan mencetak "Remedial".',
    reasons: ['74 lebih kecil dari 75.', 'Benar: cabang alternatif dipilih.', 'Setiap cabang memiliki keluaran.', 'Nilai tidak diubah menjadi 75.', '74 adalah bilangan bulat valid.'],
    indicator: 'Menentukan keluaran algoritma percabangan',
    competency: 'Analisis algoritma', misconception: 'Mengira batas 75 termasuk nilai di bawahnya.', recommendation: 'Latihan mengevaluasi kondisi dengan nilai di sekitar batas.'
  },
  {
    code: 'INF-02', subjectId: 'INF', topicId: 'inf-1', subTopic: 'Perulangan',
    cognitive: 'C5', difficulty: 'sulit', type: 'single',
    stimulus: 'Pseudocode: total ← 0; UNTUK i = 1 SAMPAI 4 LAKUKAN total ← total + i; CETAK total.',
    prompt: 'Nilai yang tercetak adalah ...',
    options: ['4', '10', '14', '16', '0'],
    answer: 'B',
    explanation: 'Perulangan menjumlahkan 1 + 2 + 3 + 4 = 10. Variabel total berubah setiap iterasi sebelum akhirnya dicetak.',
    reasons: ['4 adalah jumlah iterasi, bukan akumulasi.', 'Benar: 1+2+3+4 = 10.', '14 diperoleh jika perulangan sampai 5.', '16 adalah 4 × 4, bukan penjumlahan berurutan.', '0 hanya nilai awal sebelum loop.'],
    indicator: 'Mensimulasikan akumulasi dalam perulangan',
    competency: 'Penelusuran algoritma', misconception: 'Mengira jumlah iterasi sama dengan nilai akumulator.', recommendation: 'Latihan menjejak nilai variabel per iterasi dalam tabel.'
  },
  {
    code: 'INF-03', subjectId: 'INF', topicId: 'inf-1', subTopic: 'Percabangan bersarang',
    cognitive: 'C5', difficulty: 'sulit', type: 'single',
    stimulus: 'Program menentukan grade: jika nilai ≥ 90 maka A, lain jika nilai ≥ 75 maka B, lain jika nilai ≥ 60 maka C, lain D.',
    prompt: 'Grade untuk nilai 88 adalah ...',
    options: ['A', 'B', 'C', 'D', 'Tidak ditentukan'],
    answer: 'B',
    explanation: 'Nilai 88 tidak memenuhi syarat pertama (≥90), tetapi memenuhi syarat kedua (≥75), sehingga grade B.',
    reasons: ['88 kurang dari 90.', 'Benar: 88 berada pada rentang 75–89.', 'C untuk rentang 60–74.', 'D untuk nilai di bawah 60.', 'Semua rentang telah tercakup.'],
    indicator: 'Mengevaluasi percabangan bersarang pada rentang nilai',
    competency: 'Logika percabangan', misconception: 'Memeriksa semua kondisi secara terpisah sehingga bisa memperoleh dua grade.', recommendation: 'Latihan menelusuri percabangan bersarang satu per satu dari atas.'
  },
  {
    code: 'INF-04', subjectId: 'INF', topicId: 'inf-2', subTopic: 'Representasi data',
    cognitive: 'C4', difficulty: 'sedang', type: 'multiple',
    stimulus: 'Sebuah aplikasi menyimpan suhu dalam bilangan bulat derajat Celsius. Data yang dimasukkan: 28, 30, 29, 31.',
    prompt: 'Pernyataan yang benar tentang representasi dan pengolahan data tersebut adalah ... (pilih semua yang benar)',
    options: ['Nilai disimpan sebagai tipe bilangan bulat karena tidak memiliki desimal', 'Rata-rata data dapat dihitung karena tipe datanya numerik', 'Data harus disimpan sebagai teks agar tampil dengan satuan derajat', 'Data dapat dikonversi ke skala suhu lain dengan operasi aritmetika', 'Karena nilainya beragam, data tersebut bertipe boolean'],
    answer: ['A', 'B', 'D'],
    explanation: 'Data suhu berupa bilangan bulat sehingga bertipe numerik. Tipe numerik memungkinkan perhitungan rata-rata dan konversi satuan. Penambahan satuan pada tampilan tidak mengubah tipe penyimpanan, dan variasi nilai tidak menjadikan data boolean.',
    reasons: ['Benar: nilai tanpa desimal direpresentasikan sebagai bilangan bulat.', 'Benar: operasi aritmetika valid pada data numerik.', 'Salah: satuan adalah format tampilan, bukan alasan tipe teks.', 'Benar: konversi Celsius ke skala lain memakai operasi aritmetika.', 'Salah: boolean hanya memiliki dua nilai, benar/salah.'],
    indicator: 'Mengevaluasi tipe data dan operasi yang sah pada data numerik',
    competency: 'Representasi data', misconception: 'Mengira keberadaan satuan pada tampilan menentukan tipe data penyimpanan.', recommendation: 'Latihan membedakan tipe penyimpanan dan format tampilan serta operasi yang didukung tiap tipe.'
  },
  {
    code: 'INF-05', subjectId: 'INF', topicId: 'inf-2', subTopic: 'Keamanan data',
    cognitive: 'C5', difficulty: 'sulit', type: 'single',
    stimulus: 'Seorang siswa menerima pesan yang meminta mengisi kata sandi akun sekolah melalui tautan singkat. Pesan itu mengancam akun akan ditutup jika tidak segera diisi.',
    prompt: 'Tindakan paling aman adalah ...',
    options: ['Mengisi kata sandi karena ada ancaman', 'Membuka tautan dan mengisi data di browser', 'Mengabaikan pesan dan melapor ke guru/admin', 'Mengirim kata sandi ke pengirim agar dicek', 'Mengganti kata sandi di tautan tersebut'],
    answer: 'C',
    explanation: 'Pesan tersebut merupakan indikasi phishing. Tindakan aman adalah tidak mengisi data, tidak mengikuti tautan, serta melapor kepada pihak berwenang.',
    reasons: ['Ancaman adalah teknik tekanan dalam phishing.', 'Mengisi di tautan palsu membocorkan kata sandi.', 'Benar: hindari tautan dan laporkan.', 'Memberikan kata sandi sama dengan menyerahkan akun.', 'Tautan palsu bukan tempat resmi mengubah sandi.'],
    indicator: 'Mengevaluasi tindakan terhadap potensi serangan phishing',
    competency: 'Keamanan informasi', misconception: 'Mengira alamat singkat selalu aman karena terlihat sederhana.', recommendation: 'Latihan mengenali ciri phishing: urgensi, tautan asing, permintaan kata sandi.'
  },
  {
    code: 'INF-06', subjectId: 'INF', topicId: 'inf-3', subTopic: 'IP address',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Sebuah komputer memiliki alamat IP 192.168.1.10 dan terhubung ke router 192.168.1.1.',
    prompt: 'Pernyataan yang benar adalah ...',
    options: ['IP 192.168.1.1 adalah alamat perangkat komputer tersebut', 'Router berfungsi sebagai penghubung jaringan', 'Alamat IP hanya digunakan untuk menyimpan file', 'Komputer tidak memerlukan alamat IP untuk berkomunikasi', '192.168.1.10 adalah alamat DNS publik'],
    answer: 'B',
    explanation: 'Router menghubungkan perangkat dalam jaringan dan ke jaringan lain. IP 192.168.1.10 milik komputer, sedangkan 192.168.1.1 lazimnya alamat router/gateway.',
    reasons: ['Itu adalah alamat router.', 'Benar: router mengarahkan lalu lintas jaringan.', 'IP dipakai untuk identifikasi dan komunikasi.', 'Komunikasi jaringan memerlukan alamat.', '192.168.x.x termasuk alamat privat, bukan DNS publik.'],
    indicator: 'Menjelaskan peran alamat IP dan router dalam jaringan',
    competency: 'Jaringan komputer', misconception: 'Mengira alamat IP adalah kata sandi perangkat.', recommendation: 'Latihan mengidentifikasi perangkat dan alamatnya dalam diagram jaringan sederhana.'
  },
  {
    code: 'INF-07', subjectId: 'INF', topicId: 'inf-1', subTopic: 'Algoritma',
    cognitive: 'C6', difficulty: 'sulit', type: 'single',
    stimulus: 'Siswa diminta merancang algoritma mencari nilai terbesar dari sekumpulan bilangan.',
    prompt: 'Rancangan yang paling logis adalah ...',
    options: ['Simpan bilangan pertama sebagai sementara, lalu bandingkan setiap bilangan berikutnya', 'Urutkan semua bilangan secara menaik lalu ambil yang pertama', 'Jumlahkan semua bilangan lalu dibagi jumlah data', 'Ambil bilangan terakhir karena selalu terbesar', 'Ulangi pengecekan hanya pada bilangan genap'],
    answer: 'A',
    explanation: 'Algoritma minimum-maksimum menggunakan nilai sementara, membandingkannya dengan setiap elemen, dan memperbarui jika ada nilai lebih besar.',
    reasons: ['Benar: strategi ini efisien dan umum.', 'Mengurutkan bisa benar jika diambil yang terakhir, bukan yang pertama.', 'Itu menghitung rata-rata.', 'Posisi tidak menentukan nilai terbesar.', 'Bilangan ganjil juga mungkin terbesar.'],
    indicator: 'Merancang strategi algoritma pencarian nilai maksimum',
    competency: 'Perancangan algoritma', misconception: 'Mengira bilangan terakhir selalu paling besar.', recommendation: 'Latihan menulis pseudocode pencarian maksimum dan membandingkannya dengan pengurutan.'
  },
  {
    code: 'INF-08', subjectId: 'INF', topicId: 'inf-1', subTopic: 'Pseudocode dan perulangan',
    cognitive: 'C4', difficulty: 'sedang', type: 'multiple',
    stimulus: 'Berikut potongan pseudocode: baca n; i ← 1; SELAMA i ≤ n LAKUKAN cetak i; i ← i + 1.',
    prompt: 'Pernyataan yang benar tentang pseudocode tersebut adalah ... (pilih semua yang benar)',
    options: ['Mencetak bilangan 1 sampai n', 'Menggunakan perulangan bersyarat', 'Variabel i bertambah 1 setiap iterasi', 'Perulangan berhenti ketika i sama dengan n', 'Termasuk contoh percabangan bersarang'],
    answer: ['A', 'B', 'C'],
    explanation: 'Perulangan SELAMA adalah perulangan bersyarat. Nilai i mulai dari 1, dicetak, lalu ditambah 1. Proses berhenti ketika i menjadi n + 1, bukan saat i = n.',
    reasons: ['Benar: deret 1..n.', 'Benar: syarat i ≤ n.', 'Benar: i ← i + 1.', 'Salah: iteration terakhir masih berjalan saat i = n.', 'Salah: tidak ada percabangan bersarang.'],
    indicator: 'Mengevaluasi perilaku perulangan bersyarat',
    competency: 'Analisis pseudocode', misconception: 'Mengira perulangan berhenti tepat saat kondisi masih terpenuhi.', recommendation: 'Latihan menjejak nilai i sebelum dan sesudah iterasi terakhir.'
  },
  {
    code: 'INF-09', subjectId: 'INF', topicId: 'inf-2', subTopic: 'Keamanan data',
    cognitive: 'C5', difficulty: 'sulit', type: 'multiple',
    stimulus: 'Sekolah akan menyimpan data nilai siswa secara digital.',
    prompt: 'Prinsip keamanan data yang harus diterapkan adalah ... (pilih semua yang benar)',
    options: ['Membatasi akses hanya untuk pihak berwenang', 'Membuat kata sandi kuat dan berbeda untuk tiap akun', 'Menyimpan kata sandi dalam teks biasa agar mudah diingat', 'Membuat cadangan data berkala', 'Membagikan data nilai ke grup chat kelas'],
    answer: ['A', 'B', 'D'],
    explanation: 'Kerahasiaan, kata sandi kuat, dan cadangan data merupakan praktik keamanan. Menyimpan kata sandi apa adanya dan menyebarkan data nilai melanggar privasi.',
    reasons: ['Benar: prinsip least privilege.', 'Benar: mengurangi risiko credential stuffing.', 'Salah: kata sandi harus disimpan dengan hash.', 'Benar: cadangan mencegah kehilangan data.', 'Salah: data nilai bersifat sensitif.'],
    indicator: 'Mengevaluasi praktik keamanan dan privasi data sekolah',
    competency: 'Etika dan keamanan data', misconception: 'Mengira kemudahan mengingat lebih penting daripada keamanan penyimpanan.', recommendation: 'Latihan menyusun daftar praktik aman dan tidak aman untuk data sensitif.'
  },
  {
    code: 'INF-10', subjectId: 'INF', topicId: 'inf-3', subTopic: 'Ancaman jaringan',
    cognitive: 'C6', difficulty: 'sulit', type: 'multiple',
    stimulus: 'Jaringan sekolah mengalami lambat dan beberapa akun siswa terkunci. Tim IT akan merancang penanganan.',
    prompt: 'Langkah penanganan yang tepat adalah ... (pilih semua yang benar)',
    options: ['Memeriksa log aktivitas login', 'Memaksa seluruh akun mengganti kata sandi', 'Mengabaikan peringatan sistem', 'Mengaktifkan verifikasi dua langkah', 'Menonaktifkan semua firewall agar jaringan cepat'],
    answer: ['A', 'B', 'D'],
    explanation: 'Pemeriksaan log membantu melihat pola serangan, penggantian sandi memutus akses tidak sah, dan 2FA menambah lapisan keamanan. Firewall justru harus tetap aktif.',
    reasons: ['Benar: log memberi bukti.', 'Benar: tindakan darurat yang umum.', 'Salah: peringatan harus ditindaklanjuti.', 'Benar: 2FA mengurangi risiko.', 'Salah: mematikan firewall membuka ancaman.'],
    indicator: 'Merancang langkah respons insiden keamanan jaringan',
    competency: 'Respons insiden', misconception: 'Mengira kinerja jaringan lebih penting daripada perlindungan.', recommendation: 'Latihan menyusun urutan respons insiden sederhana.'
  }
]
