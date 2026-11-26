import type { SeedInput } from '../seedTypes'

export const BIN: SeedInput[] = [
  {
    code: 'BIN-01', subjectId: 'BIN', topicId: 'bin-1', subTopic: 'Ide pokok',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Setiap hari warga RW 04 menghasilkan sekitar 25 kg sampah plastik. Untuk menguranginya, mereka memasang tempat sampah pilah, mengadakan bank sampah, dan mengajarkan warga membuat kerajinan dari botol bekas. Upaya ini menurunkan sampah yang dibuang ke TPA hingga 40% dalam tiga bulan.',
    prompt: 'Ide pokok paragraf tersebut adalah ...',
    options: ['Cara warga membuat kerajinan dari botol bekas', 'Upaya RW 04 mengurangi sampah plastik', 'Jumlah sampah plastik di setiap RW', 'Penurunan sampah di TPA selama tiga bulan', 'Pemasangan tempat sampah pilah di RW 04'],
    answer: 'B',
    explanation: 'Kalimat topik bukan selalu kalimat pertama. Keseluruhan paragraf membahas serangkaian upaya warga RW 04 untuk mengurangi sampah plastik; data 25 kg, bank sampah, dan penurunan 40% merupakan pendukung ide tersebut.',
    reasons: ['Hanya salah satu upaya, terlalu sempit.', 'Benar: mencakup keseluruhan isi paragraf.', 'Hanya data awal, bukan pokok bahasan.', 'Hanya hasil akhir, bukan keseluruhan upaya.', 'Hanya bagian dari upaya.'],
    indicator: 'Menentukan ide pokok dari paragraf informasi yang kalimat topiknya tidak eksplisit',
    competency: 'Pemahaman teks informasi', misconception: 'Mengira kalimat pertama selalu merupakan ide pokok.', recommendation: 'Latihan mencari kalimat yang mencakup semua kalimat pendukung dalam paragraf.'
  },
  {
    code: 'BIN-02', subjectId: 'BIN', topicId: 'bin-1', subTopic: 'Informasi tersirat',
    cognitive: 'C5', difficulty: 'sulit', type: 'single',
    stimulus: 'Kebun sekolah layu setelah dua minggu tidak disiram. Siswa piket memasang jadwal giliran menyiram, tetapi jadwal itu tidak pernah dicentang. Kepala sekolah kemudian menambahkan kotak centang dan meminta piket melapor setiap Jumat.',
    prompt: 'Simpulan yang paling tepat berdasarkan bacaan adalah ...',
    options: ['Tanaman layu karena pupuk terlalu banyak', 'Jadwal tanpa mekanisme pemantauan tidak menjamin pelaksanaan', 'Kepala sekolah tidak percaya pada siswa piket', 'Kotak centang dibuat untuk menggantikan air', 'Siswa piket tidak mengetahui cara menyiram tanaman'],
    answer: 'B',
    explanation: 'Teks menunjukkan jadwal sudah ada tetapi tidak dicentang, sehingga tidak ada bukti pelaksanaan. Penambahan kotak centang dan laporan Jumat merupakan mekanisme pemantauan. Pilihan lain tidak didukung data teks.',
    reasons: ['Tidak ada informasi tentang pupuk.', 'Benar: masalah utama adalah tidak adanya pemantauan.', 'Tidak ada bukti sikap tidak percaya.', 'Kotak centang melengkapi jadwal, bukan menggantikan air.', 'Tidak disebutkan ketidaktahuan siswa.'],
    indicator: 'Menarik simpulan tersirat dari hubungan sebab-akibat dalam teks',
    competency: 'Penalaran inferensial', misconception: 'Mengambil kesimpulan berdasarkan dugaan pribadi, bukan bukti teks.', recommendation: 'Latihan membedakan fakta tertulis, inferensi kuat, dan dugaan tanpa bukti.'
  },
  {
    code: 'BIN-03', subjectId: 'BIN', topicId: 'bin-1', subTopic: 'Ringkasan',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Bacaan menjelaskan bahwa perpustakaan sekolah menambah 500 buku baru, memperpanjang jam buka hingga pukul 16.00, dan menyediakan sudut baca di setiap kelas. Kepala perpustakaan mengatakan semua kegiatan itu bertujuan meningkatkan minat baca siswa.',
    prompt: 'Ringkasan yang paling tepat untuk bacaan tersebut adalah ...',
    options: ['Perpustakaan menambah 500 buku baru.', 'Perpustakaan memperpanjang jam buka sampai pukul 16.00.', 'Sekolah menambah buku, memperpanjang jam buka, dan membuat sudut baca untuk meningkatkan minat baca.', 'Kepala perpustakaan mengadakan rapat dengan siswa.', 'Sudut baca dibuat di setiap kelas.'],
    answer: 'C',
    explanation: 'Ringkasan yang baik memuat gagasan utama dan pendukung penting tanpa detail berlebih. Pilihan C menggabungkan ketiga upaya dan tujuannya secara ringkas; pilihan A, B, dan E hanya bagian, sedangkan D tidak ada dalam teks.',
    reasons: ['Hanya satu detail pendukung.', 'Hanya satu detail pendukung.', 'Benar: lengkap dan ringkas.', 'Informasi ini tidak terdapat dalam teks.', 'Hanya satu detail pendukung.'],
    indicator: 'Memilih ringkasan yang memuat gagasan utama dan pendukung esensial',
    competency: 'Penyusunan ringkasan', misconception: 'Menyalin satu kalimat penting dan menganggapnya sudah merupakan ringkasan.', recommendation: 'Latihan menggabungkan beberapa kalimat pendukung di bawah satu gagasan utama.'
  },
  {
    code: 'BIN-04', subjectId: 'BIN', topicId: 'bin-2', subTopic: 'Langkah kerja',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Berikut langkah membuat teh hangat: (1) mendidihkan air, (2) memasukkan teh ke dalam gelas, (3) menuangkan air mendidih ke gelas, (4) mengaduk dan mendiamkan beberapa menit, (5) menyaring daun teh.',
    prompt: 'Perbaikan yang paling penting agar prosedur tersebut logis adalah ...',
    options: ['Memasukkan gula sebelum air mendidih', 'Mendiamkan air sebelum mendidihkan', 'Menyaring daun teh sebelum menuangkan air', 'Memindahkan langkah menyaring setelah perasan daun teh diaduk', 'Mengganti gelas dengan teko tanpa alasan'],
    answer: 'D',
    explanation: 'Langkah menyaring harus dilakukan setelah teh diaduk dan didiamkan agar ekstraksi berlangsung. Pilihan D memperbaiki urutan akhir tanpa mengubah maksud prosedur. Pilihan lain menambah atau mengubah langkah secara tidak logis.',
    reasons: ['Gula bisa ditambahkan setelah air, tanpa menyangkut logika utama.', 'Air harus mendidih terlebih dahulu.', 'Teh belum terendam jika disaring lebih awal.', 'Benar: penyaringan terjadi setelah perasan selesai.', 'Perubahan alat tidak diperlukan dan tidak menjelaskan alasan.'],
    indicator: 'Menilai kelogisan urutan langkah teks prosedur',
    competency: 'Evaluasi prosedur', misconception: 'Fokus pada tambahan bahan daripada keteraturan langkah.', recommendation: 'Latihan mengurutkan langkah dengan menandai pra-syarat setiap tindakan.'
  },
  {
    code: 'BIN-05', subjectId: 'BIN', topicId: 'bin-2', subTopic: 'Kata kerja operasional',
    cognitive: 'C5', difficulty: 'sulit', type: 'single',
    stimulus: 'Teks prosedur pembuatan poster berisi kalimat: "Tentukan tema, lalu gambarlah poster dengan warna yang bagus, setelah itu selesailah pekerjaan dan kumpulkan kepada guru."',
    prompt: 'Kesalahan utama kalimat prosedur tersebut adalah ...',
    options: ['Menggunakan kata "tema"', 'Menggunakan kata sifat "bagus" dan kata kerja "selesailah" yang tidak operasional', 'Menggunakan tanda koma', 'Menggabungkan dua kegiatan dalam satu kalimat', 'Menyebutkan guru sebagai penerima'],
    answer: 'B',
    explanation: 'Teks prosedur yang baik memakai kata kerja operasional dan kriteria yang jelas. "Warna yang bagus" bersifat subjektif, sedangkan "selesailah pekerjaan" bukan tindakan yang dapat diamati. Keduanya harus diganti misalnya "gelap untuk judul" dan "periksa kerapian tepi poster".',
    reasons: ['"Tema" adalah nomina yang lazim.', 'Benar: keduanya tidak spesifik dan tidak dapat diukur.', 'Koma digunakan sesuai kaidah.', 'Menggabungkan kegiatan diperbolehkan selama jelas.', 'Penyebutan penerima justru memperjelas langkah.'],
    indicator: 'Mengevaluasi penggunaan kata kerja operasional dalam teks prosedur',
    competency: 'Kaidah teks prosedur', misconception: 'Mengira kata sifat subjektif sudah cukup untuk petunjuk teknis.', recommendation: 'Latihan mengganti kata sifat umum dengan kriteria teramati.'
  },
  {
    code: 'BIN-06', subjectId: 'BIN', topicId: 'bin-3', subTopic: 'Kehematan',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Berikut kalimat dari laporan kegiatan: "Para siswa-siswa semuanya bersama-sama melakukan kerja gotong royong membersihkan lingkungan sekolah bersama guru."',
    prompt: 'Perbaikan kalimat yang paling tepat adalah ...',
    options: ['Para siswa semuanya bersama-sama melakukan gotong royong membersihkan lingkungan sekolah bersama guru.', 'Siswa dan guru bersama-sama melakukan gotong royong membersihkan lingkungan sekolah.', 'Para siswa-siswa melakukan kerja gotong royong membersihkan lingkungan sekolah.', 'Semuanya melakukan kerja gotong royong bersama-sama di sekolah.', 'Para siswa bersama guru melakukan kerja-kerja gotong royong.'],
    answer: 'B',
    explanation: 'Kalimat asli memiliki pengulangan makna: "para siswa-siswa", "semuanya bersama-sama", dan "kerja gotong royong bersama guru". Pilihan B menghilangkan pengulangan sekaligus mempertahankan pelaku dan kegiatan.',
    reasons: ['Masih mempertahankan "semuanya bersama-sama" yang berlebihan.', 'Benar: hemat, jelas, dan tidak mengubah makna.', 'Menghilangkan guru sehingga mengurangi informasi.', 'Terlalu umum dan kehilangan kegiatan spesifik.', 'Masih ada pengulangan "kerja-kerja".'],
    indicator: 'Memperbaiki kalimat tidak efektif akibat pengulangan makna',
    competency: 'Kehematan kalimat', misconception: 'Mengira pengulangan kata selalu salah, padahal yang bermasalah adalah pengulangan makna.', recommendation: 'Latihan menghapus kata yang maknanya sudah melekat pada kata lain.'
  },
  {
    code: 'BIN-07', subjectId: 'BIN', topicId: 'bin-1', subTopic: 'Ciri teks informasi',
    cognitive: 'C4', difficulty: 'sedang', type: 'multiple',
    stimulus: 'Sebuah artikel menyajikan data curah hujan, kutipan ahli meteorologi, dan penjelasan sebab banjir di wilayah pesisir.',
    prompt: 'Ciri yang sesuai dengan teks informasi faktual tersebut adalah ... (pilih semua yang benar)',
    options: ['Menyajikan data berdasarkan pengukuran', 'Menggunakan kata "saya merasa" sebagai bukti utama', 'Mengutip sumber ahli', 'Menjelaskan hubungan sebab-akibat', 'Mengandung opini pribadi tanpa data pendukung'],
    answer: ['A', 'C', 'D'],
    explanation: 'Teks informasi faktual mengandalkan data, sumber kredibel, dan hubungan logis. Opini pribadi tanpa bukti bukan ciri teks faktual.',
    reasons: ['Benar: data merupakan bukti faktual.', 'Salah: perasaan pribadi bukan bukti objektif.', 'Benar: kutipan ahli memperkuat kredibilitas.', 'Benar: sebab-akibat membantu pembaca memahami fenomena.', 'Salah: bertentangan dengan prinsip factualitas.'],
    indicator: 'Mengidentifikasi ciri teks informasi faktual berdasarkan bukti',
    competency: 'Apresiasi teks faktual', misconception: 'Mengira teks informasi boleh didasarkan pada kesan pribadi.', recommendation: 'Latihan membedakan fakta, kutipan ahli, dan opini tanpa bukti.'
  },
  {
    code: 'BIN-08', subjectId: 'BIN', topicId: 'bin-3', subTopic: 'Kalimat efektif',
    cognitive: 'C5', difficulty: 'sulit', type: 'multiple',
    stimulus: 'Perhatikan kalimat-kalimat berikut dari sebuah laporan.\n(1) Para siswa-siswa mengikuti lomba.\n(2) Karena hujan, maka acara ditunda.\n(3) Saya sendiri mengambil keputusan sendiri.\n(4) Peserta datang tepat waktu.',
    prompt: 'Kalimat yang tidak efektif adalah ... (pilih semua yang sesuai)',
    options: ['Kalimat 1', 'Kalimat 2', 'Kalimat 3', 'Kalimat 4', 'Semua kalimat efektif'],
    answer: ['A', 'B', 'C'],
    explanation: 'Kalimat 1 mengulang makna jamak, kalimat 2 memakai pasangan "karena...maka" yang berlebihan, dan kalimat 3 mengulang "sendiri". Kalimat 4 sudah efektif.',
    reasons: ['Benar: "para siswa-siswa" berlebihan.', 'Benar: cukup salah satu penghubung sebab.', 'Benar: pengulangan "sendiri".', 'Salah: kalimat 4 sudah jelas dan hemat.', 'Salah: masih ada tiga kalimat tidak efektif.'],
    indicator: 'Mengevaluasi beberapa kalimat berdasarkan kaidah kehematan dan kesepadanan',
    competency: 'Evaluasi kalimat efektif', misconception: 'Mengira penggunaan dua penghubung sebab membuat kalimat lebih jelas.', recommendation: 'Latihan mengenali pasangan kata berlebihan seperti karena–maka dan agar–supaya.'
  },
  {
    code: 'BIN-09', subjectId: 'BIN', topicId: 'bin-2', subTopic: 'Konsistensi prosedur',
    cognitive: 'C4', difficulty: 'sedang', type: 'multiple',
    stimulus: 'Guru akan menilai teks prosedur karya siswa berdasarkan kriteria tertentu.',
    prompt: 'Kriteria yang tepat untuk menilai teks prosedur adalah ... (pilih semua yang benar)',
    options: ['Langkah disusun berurutan', 'Setiap langkah menggunakan kata kerja yang jelas', 'Simbol dan istilah digunakan secara konsisten', 'Kalimat bersifat puitis dan multitafsir', 'Tujuan prosedur dinyatakan di awal'],
    answer: ['A', 'B', 'C', 'E'],
    explanation: 'Teks prosedur menuntut urutan logis, kata kerja operasional, konsistensi istilah, dan kejelasan tujuan. Bahasa puitis yang multitafsir justru mengaburkan langkah.',
    reasons: ['Benar: urutan menentukan keberhasilan.', 'Benar: tindakan harus dapat dilakukan.', 'Benar: konsistensi mencegah kebingungan.', 'Salah: multitafsir bertentangan dengan prosedur.', 'Benar: tujuan membantu pembaca.'],
    indicator: 'Menetapkan kriteria penilaian teks prosedur',
    competency: 'Penilaian teks', misconception: 'Mengira bahasa indah lebih penting daripada kejelasan instruksi.', recommendation: 'Latihan membandingkan dua teks prosedur dengan kriteria yang sama.'
  },
  {
    code: 'BIN-10', subjectId: 'BIN', topicId: 'bin-3', subTopic: 'Perbaikan teks',
    cognitive: 'C6', difficulty: 'sulit', type: 'multiple',
    stimulus: 'Laporan observer sekolah berisi kalimat:"Semua siswa banyak yang terlambat, karena itu dibuatkan peraturan baru supaya tidak terlambat lagi."',
    prompt: 'Tindakan perbaikan yang tepat terhadap kalimat tersebut adalah ... (pilih semua yang benar)',
    options: ['Mengganti "semua siswa banyak yang" dengan "banyak siswa"', 'Menghilangkan salah satu penghubung "karena itu" atau "supaya"', 'Mengganti "terlambat" dengan "tidak tepat waktu" secara bergantian', 'Menambahkan data jumlah keterlambatan', 'Membiarkan kalimat karena sudah mudah dipahami'],
    answer: ['A', 'B', 'D'],
    explanation: 'Perbaikan mencakup kehematan ("semua...banyak" kontradiktif), penghapusan penghubung berlebihan, dan penguatan bukti berupa data. Mengganti sinonim secara bergantian tidak menyelesaikan masalah kejelasan.',
    reasons: ['Benar: menghilangkan kontradiksi.', 'Benar: salah satu penghubung cukup.', 'Salah: variasi sinonim tidak memperbaiki struktur.', 'Benar: data memperkuat laporan.', 'Salah: masih ada masalah kehematan dan bukti.'],
    indicator: 'Merancang perbaikan teks berdasarkan prinsip kejelasan dan pembuktian',
    competency: 'Penyuntingan teks', misconception: 'Mengira sinonim berganti-ganti membuat teks lebih baik.', recommendation: 'Latihan menyunting kalimat dengan fokus pada kontradiksi dan bukti.'
  }
]
