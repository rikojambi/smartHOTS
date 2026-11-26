import type { SeedInput } from '../seedTypes'

export const PJO: SeedInput[] = [
  {
    code: 'PJO-01', subjectId: 'PJO', topicId: 'pjo-1', subTopic: 'Prinsip FITT',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Andi berlatih lari 3 kali seminggu, 30 menit sekali, dengan denyut jantung sekitar 70% dari denyut maksimal. Ia ingin meningkatkan daya tahan jantung.',
    prompt: 'Prinsip FITT yang sudah diterapkan Andi ditunjukkan oleh ...',
    options: ['Frequency 3×, Intensity 70%, Time 30 menit, Type lari', 'Frequency 30 menit, Intensity 3×, Time lari, Type 70%', 'Frequency 70%, Intensity lari, Time 3×, Type 30 menit', 'Hanya intensity dan type yang diperhatikan', 'Latihan tanpa batas karena sudah rutin'],
    answer: 'A',
    explanation: 'FITT terdiri atas Frequency (berapa kali), Intensity (seberapa berat), Time (berapa lama), dan Type (jenis latihan). Data Andi memetakan keempatnya dengan tepat.',
    reasons: ['Benar: pemetaan FITT sesuai.', 'Menukur konsep frequency dan time.', 'Menukur intensity dan frequency.', 'Frequency dan time juga termasuk FITT.', 'Latihan tetap perlu batas aman.'],
    indicator: 'Memetakan program latihan ke prinsip FITT',
    competency: 'Perencanaan latihan', misconception: 'Mengira FITT hanya terdiri dari jenis dan durasi latihan.', recommendation: 'Latihan mengidentifikasi empat komponen FITT dari jadwal latihan.'
  },
  {
    code: 'PJO-02', subjectId: 'PJO', topicId: 'pjo-1', subTopic: 'Tes kebugaran',
    cognitive: 'C5', difficulty: 'sulit', type: 'single',
    stimulus: 'Siswa mengikuti tes lari 1.000 meter. Waktunya lebih lambat dibanding tes bulan lalu, tetapi denyut jantung pemulihannya lebih cepat.',
    prompt: 'Penilaian yang paling tepat adalah ...',
    options: ['Kebugaran siswa pasti menurun', 'Pemulihan denyut lebih cepat dapat menandakan peningkatan daya tahan meski waktu lari memburuk', 'Waktu lari satu-satunya indikator kebugaran', 'Siswa harus mengulang tes tanpa istirahat', 'Denyut pemulihan tidak relevan'],
    answer: 'B',
    explanation: 'Kebugaran tidak diukur dari satu indikator. Pemulihan denyut jantung yang lebih cepat mencerminkan efisiensi sistem kardiovaskular, meski performa waktu bisa dipengaruhi kondisi lain.',
    reasons: ['Terlalu menyederhanakan hasil.', 'Benar: beberapa indikator perlu dibaca bersama.', 'Ada indikator lain seperti pemulihan denyut.', 'Istirahat justru diperlukan.', 'Pemulihan denyut adalah indikator penting.'],
    indicator: 'Mengevaluasi beberapa indikator hasil tes kebugaran',
    competency: 'Analisis kebugaran', misconception: 'Menilai kebugaran hanya dari waktu lari.', recommendation: 'Latihan membaca bersama waktu tempuh dan recovery heart rate.'
  },
  {
    code: 'PJO-03', subjectId: 'PJO', topicId: 'pjo-2', subTopic: 'Sepak bola',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Tim sepak bola sekolah memiliki pemain bertahan yang lambat. Pelatih meminta pemain tengah turun membantu saat lawan melakukan serangan balik.',
    prompt: 'Strategi tersebut bertujuan ...',
    options: ['Meningkatkan jumlah penonton', 'Menutup ruang antara lini belakang dan tengah', 'Mengganti posisi penjaga gawang', 'Mengurangi jumlah pemain depan menjadi satu', 'Menunda pertandingan'],
    answer: 'B',
    explanation: 'Pemain tengah yang turun membantu menutup celah antarlini sehingga lawan lebih sulit masuk ke area berbahaya. Ini adalah prinsip kompaktnya tim saat bertahan.',
    reasons: ['Tidak berkaitan dengan strategi bertahan.', 'Benar: menutup ruang antarlini.', 'Penjaga gawang tidak diganti.', 'Jumlah pemain depan tidak harus berubah.', 'Menunda pertandingan bukan strategi.'],
    indicator: 'Menganalisis tujuan perubahan posisi dalam strategi bertahan',
    competency: 'Strategi sepak bola', misconception: 'Mengira semua pemain harus kembali ke belakang saat bertahan.', recommendation: 'Latihan membaca ruang antarlini dalam diagram formasi.'
  },
  {
    code: 'PJO-04', subjectId: 'PJO', topicId: 'pjo-2', subTopic: 'Bola basket',
    cognitive: 'C5', difficulty: 'sulit', type: 'single',
    stimulus: 'Dalam pertandingan basket, pemain A melakukan screen untuk membantu rekan yang membawa bola. Wasit menghentikan permainan karena kontak dianggap terlalu keras.',
    prompt: 'Penilaian yang paling tepat adalah ...',
    options: ['Screen selalu melanggar aturan', 'Screen yang sah harus dilakukan dengan posisi diam dan kontak wajar', 'Pemain yang membawa bola harus berhenti', 'Wasit tidak boleh menghentikan permainan', 'Kontak keras diperbolehkan selama tim mendapat keuntungan'],
    answer: 'B',
    explanation: 'Screen sah jika pemain berdiri diam, kaki tidak bergerak, dan kontak tidak berlebihan. Kontak keras atau moving screen dapat dianggap foul.',
    reasons: ['Screen yang sah diperbolehkan.', 'Benar: posisi statis dan kontak wajar.', 'Pemain boleh terus menggiring.', 'Wasit berwenang menghentikan pelanggaran.', 'Keuntungan tidak membenarkan pelanggaran.'],
    indicator: 'Menilai Legalitas screen berdasarkan aturan bola basket',
    competency: 'Aturan permainan', misconception: 'Mengira setiap kontak dalam screen adalah foul.', recommendation: 'Latihan membedakan screen sah, moving screen, dan foul.'
  },
  {
    code: 'PJO-05', subjectId: 'PJO', topicId: 'pjo-3', subTopic: 'Pencegahan cedera',
    cognitive: 'C5', difficulty: 'sedang', type: 'single',
    stimulus: 'Sebelum latihan, siswa langsung melakukan lari cepat tanpa pemanasan. Setelah itu, ia merasa nyeri pada otot paha.',
    prompt: 'Tindakan pencegahan yang paling tepat adalah ...',
    options: ['Melanjutkan latihan sampai nyeri hilang', 'Mengompres area nyeri dengan es dan beristirahat', 'Meminum obat tanpa mengetahui jenis cedera', 'Menutup nyeri dengan pita dan tetap berlari', 'Menambah kecepatan lari'],
    answer: 'B',
    explanation: 'Untuk cedera ringan akibat otot tegang, kompres dingin dan istirahat membantu mengurangi bengkak dan nyeri. Jika nyeri berlanjut, perlu pemeriksaan medis.',
    reasons: ['Memaksa latihan memperparah cedera.', 'Benar: kompres es dan istirahat sesuai penanganan awal.', 'Obat harus sesuai jenis dan dosis.', 'Menutup nyeri tidak mengatasi cedera.', 'Kecepatan menambah beban otot.'],
    indicator: 'Memilih penanganan awal cedera olahraga ringan',
    competency: 'Keselamatan olahraga', misconception: 'Mengira nyeri saat latihan adalah hal biasa yang harus ditahan.', recommendation: 'Latihan prosedur RICE untuk cedera ringan.'
  },
  {
    code: 'PJO-06', subjectId: 'PJO', topicId: 'pjo-3', subTopic: 'Hidrasi',
    cognitive: 'C4', difficulty: 'mudah', type: 'single',
    stimulus: 'Siswa berlatih sepak bola selama 60 menit pada siang hari yang panas. Ia hanya minum setelah latihan selesai.',
    prompt: 'Tindakan yang lebih tepat adalah ...',
    options: ['Minum secukupnya sebelum, saat, dan sesudah latihan', 'Minum banyak hanya setelah latihan', 'Tidak minum agar tidak sering ke kamar mandi', 'Minum minuman bersoda saat latihan', 'Menunggu sampai merasa haus'],
    answer: 'A',
    explanation: 'Hidrasi harus dilakukan sebelum, selama, dan setelah aktivitas untuk mengganti cairan yang hilang melalui keringat. Haus bukan satu-satunya tanda kebutuhan cairan.',
    reasons: ['Benar: hidrasi bertahap lebih aman.', 'Terlambat mengganti cairan.', 'Dehidrasi berisiko.', 'Minuman bersoda kurang tepat.', 'Rasa haus muncul setelah kehilangan cairan.'],
    indicator: 'Merencanakan hidrasi yang tepat selama aktivitas fisik',
    competency: 'Kesehatan olahraga', misconception: 'Menunggu haus sebagai satu-satunya penanda minum.', recommendation: 'Latihan menyusun jadwal minum untuk latihan 60 menit.'
  },
  {
    code: 'PJO-07', subjectId: 'PJO', topicId: 'pjo-1', subTopic: 'Komposisi tubuh',
    cognitive: 'C4', difficulty: 'sedang', type: 'multiple',
    stimulus: 'Dua siswa dengan berat badan sama memiliki komposisi tubuh berbeda: satu lebih banyak massa otot, satunya lebih banyak lemak.',
    prompt: 'Pernyataan yang benar tentang komposisi tubuh adalah ... (pilih semua yang benar)',
    options: ['Berat badan saja tidak menggambarkan kebugaran', 'Massa otot lebih besar umumnya mendukung kekuatan', 'Persentase lemak tinggi selalu menandakan sehat', 'Komposisi tubuh dapat berubah dengan latihan', 'Komposisi tubuh tidak berhubungan dengan kesehatan'],
    answer: ['A', 'B', 'D'],
    explanation: 'Komposisi tubuh mempertimbangkan proporsi otot, lemak, tulang, dan air. Latihan dapat mengubah proporsi tersebut meski berat badan relatif sama.',
    reasons: ['Benar: berat bukan satu-satunya ukuran.', 'Benar: otot berperan pada kekuatan.', 'Salah: lemak berlebih berisiko.', 'Benar: latihan mengubah komposisi.', 'Salah: komposisi tubuh berkaitan dengan kesehatan.'],
    indicator: 'Mengevaluasi komposisi tubuh sebagai indikator kebugaran',
    competency: 'Kebugaran jasmani', misconception: 'Menyamakan berat badan dengan komposisi tubuh.', recommendation: 'Latihan membaca contoh komposisi tubuh dan implikasinya.'
  },
  {
    code: 'PJO-08', subjectId: 'PJO', topicId: 'pjo-2', subTopic: 'Bola voli',
    cognitive: 'C5', difficulty: 'sulit', type: 'multiple',
    stimulus: 'Tim voli akan melakukan serangan. Beberapa opsi yang dipertimbangkan: set-up akurat, spike pada celah blok, serves ke sudut, dan berteriak saat bola datang.',
    prompt: 'Opsi yang merupakan strategi serangan yang baik adalah ... (pilih semua yang benar)',
    options: ['Set-up yang akurat ke penyerang', 'Spike mengarah ke celah antarblokir', 'Serve ke sudut lapangan lawan', 'Berteriak agar lawan kaget', 'Menghalangi penglihatan wasit'],
    answer: ['A', 'B', 'C'],
    explanation: 'Strategi voli yang efektif mengandalkan pengaturan bola, penempatan serangan, dan variasi serve. Gangguan nonverbal tidak termasuk strategi sah.',
    reasons: ['Benar: umpan menentukan serangan.', 'Benar: celah blok adalah target.', 'Benar: serve sudut menyulitkan terima.', 'Salah: bukan teknik permainan yang sah.', 'Salah: menghalangi wasit melanggar aturan.'],
    indicator: 'Mengevaluasi strategi serangan bola voli',
    competency: 'Strategi permainan', misconception: 'Mengira tindakan mengganggu lawan termasuk strategi sah.', recommendation: 'Latihan memetakan strategi sah dan tidak sah dalam permainan.'
  },
  {
    code: 'PJO-09', subjectId: 'PJO', topicId: 'pjo-3', subTopic: 'P3K',
    cognitive: 'C5', difficulty: 'sulit', type: 'multiple',
    stimulus: 'Di lapangan, seorang siswa terjatuh dan mengalami luka lecet kecil, memar, serta kaku pada pergelangan.',
    prompt: 'Penanganan awal yang tepat adalah ... (pilih semua yang benar)',
    options: ['Membersihkan luka dengan air bersih', 'Mengompres memar dengan es', 'Menggerakkan pergelangan secara paksa', 'Menutup luka dengan kasa steril', 'Membiarkan luka terbuka agar kering'],
    answer: ['A', 'B', 'D'],
    explanation: 'P3K luka ringan mencakup pembersihan, kompres dingin untuk memar, dan penutupan dengan kasa steril. Gerakan paksa dan luka terbuka berisiko.',
    reasons: ['Benar: mencegah infeksi.', 'Benar: mengurangi bengkak.', 'Salah: dapat memperparah cedera.', 'Benar: melindungi luka.', 'Salah: luka terbuka mudah terkontaminasi.'],
    indicator: 'Memilih tindakan P3K untuk cedera ringan',
    competency: 'Pertolongan pertama', misconception: 'Mengira membiarkan luka terbuka mempercepat penyembuhan.', recommendation: 'Latihan urutan membersihkan, mengompres, dan menutup luka.'
  },
  {
    code: 'PJO-10', subjectId: 'PJO', topicId: 'pjo-1', subTopic: 'Perencanaan latihan',
    cognitive: 'C6', difficulty: 'sulit', type: 'multiple',
    stimulus: 'Seorang siswa ingin meningkatkan daya tahan lari dalam 8 minggu.',
    prompt: 'Rancangan latihan yang sesuai prinsip FITT dan aman adalah ... (pilih semua yang benar)',
    options: ['Menentukan frekuensi 3 kali seminggu', 'Menambah durasi secara bertahap', 'Menetapkan intensitas sesuai denyut target', 'Menambah intensitas drastis setiap hari', 'Menyisipkan hari istirahat'],
    answer: ['A', 'B', 'C', 'E'],
    explanation: 'Perencanaan aman menetapkan frekuensi, durasi progresif, intensitas terukur, dan istirahat. Peningkatan drastis setiap hari berisiko cedera.',
    reasons: ['Benar: frequency jelas.', 'Benar: progresi bertahap.', 'Benar: intensity terukur.', 'Salah: terlalu cepat meningkatkan beban.', 'Benar: pemulihan bagian dari latihan.'],
    indicator: 'Merancang program latihan delapan minggu dengan prinsip FITT',
    competency: 'Perancangan program latihan', misconception: 'Mengira latihan setiap hari selalu lebih baik.', recommendation: 'Latihan menyusun jadwal mingguan dengan progresi dan istirahat.'
  }
]
