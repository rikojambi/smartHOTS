import type { SeedInput } from '../seedTypes'

export const MAT: SeedInput[] = [
  {
    code: 'MAT-01', subjectId: 'MAT', topicId: 'mat-1', subTopic: 'Barisan aritmetika',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Sebuah teater memiliki susunan kursi. Baris pertama berisi 12 kursi, baris kedua 17 kursi, baris ketiga 22 kursi, dan seterusnya mengikuti pola yang sama.',
    prompt: 'Jumlah kursi pada baris ke-20 adalah ...',
    options: ['102', '104', '107', '112', '117'],
    answer: 'C',
    explanation: 'Pola tersebut merupakan barisan aritmetika dengan suku pertama a = 12 dan beda b = 17 − 12 = 5. Suku ke-n dirumuskan Uₙ = a + (n − 1)b, sehingga U₂₀ = 12 + 19 × 5 = 107.',
    reasons: ['102 adalah U₁₉, yaitu 12 + 18 × 5; siswa lupa menaikkan indeks ke-20.', '104 diperoleh jika beda dianggap 4, bukan 5.', 'Benar: 12 + 19 × 5 = 107.', '112 diperoleh dengan menambahkan 5 dua puluh kali, bukan sembilan belas kali.', '117 adalah U₂₂, bukan U₂₀.'],
    indicator: 'Menentukan suku ke-n barisan aritmetika dari pola kontekstual',
    competency: 'Pemodelan pola bilangan', misconception: 'Menggunakan jumlah langkah yang sama dengan nomor suku (off-by-one).', recommendation: 'Latihan membedakan indeks suku dan selang antarsuku pada barisan aritmetika.'
  },
  {
    code: 'MAT-02', subjectId: 'MAT', topicId: 'mat-2', subTopic: 'Titik puncak',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Penyelenggara acara memproyeksikan jumlah pengunjung dengan fungsi f(x) = x² − 4x − 12, dengan x menyatakan jam sejak pintu dibuka.',
    prompt: 'Titik puncak grafik fungsi tersebut adalah ...',
    options: ['(2, −16)', '(4, −12)', '(−2, 0)', '(2, −12)', '(0, −12)'],
    answer: 'A',
    explanation: 'Untuk f(x) = ax² + bx + c dengan a = 1, b = −4, absis titik puncak xₚ = −b/(2a) = 4/2 = 2. Ordinatnya f(2) = 4 − 8 − 12 = −16. Jadi titik puncaknya (2, −16).',
    reasons: ['Benar: xₚ = 2 dan f(2) = −16.', 'Ini titik potong sumbu X positif, bukan titik puncak.', 'Ini titik potong sumbu X negatif, bukan titik puncak.', 'Nilai f(2) salah dihitung; −4 × 2 = −8, bukan −4.', 'Ini titik potong sumbu Y.'],
    indicator: 'Menentukan titik puncak fungsi kuadrat dari konteks',
    competency: 'Analisis grafik fungsi kuadrat', misconception: 'Mengira titik potong sumbu X sebagai titik puncak.', recommendation: 'Latihan membedakan titik puncak, titik potong sumbu X, dan titik potong sumbu Y.'
  },
  {
    code: 'MAT-03', subjectId: 'MAT', topicId: 'mat-3', subTopic: 'Persamaan kuadrat',
    cognitive: 'C5', difficulty: 'sulit', type: 'single',
    stimulus: 'Pak Dani akan membuat kebun sayur berbentuk persegi panjang dengan luas 48 m². Panjang kebun 4 m lebih besar daripada lebarnya.',
    prompt: 'Lebar kebun tersebut adalah ...',
    options: ['4 m', '6 m', '8 m', '10 m', '12 m'],
    explanation: 'Misalkan lebar x meter, maka panjangnya (x + 4) meter. Persamaannya x(x + 4) = 48 atau x² + 4x − 48 = 0. Faktorisasi (x + 8)(x − 6) = 0 memberi x = −8 atau x = 6. Karena lebar harus positif, lebar = 6 m.',
    answer: 'B',
    reasons: ['4 × 8 = 32, bukan 48; jumlah sisi juga tidak sesuai.', 'Benar: 6 × 10 = 48 dan selisihnya 4.', '8 × 12 = 96, bukan 48.', '10 × 14 = 140, bukan 48.', '12 × 16 = 192, bukan 48.'],
    indicator: 'Menyusun dan menyelesaikan persamaan kuadrat dari masalah luas',
    competency: 'Pemodelan persamaan kuadrat', misconception: 'Menerima akar negatif sebagai ukuran fisik.', recommendation: 'Latihan menafsirkan akar persamaan kuadrat dalam konteks ukuran nyata.'
  },
  {
    code: 'MAT-04', subjectId: 'MAT', topicId: 'mat-1', subTopic: 'Deret geometri',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Sebuah benih tanaman menghasilkan 2 tunas pada minggu pertama. Setiap minggu berikutnya jumlah tunas tiga kali lipat dari minggu sebelumnya: 2, 6, 18, ...',
    prompt: 'Jumlah seluruh tunas hingga minggu keenam adalah ...',
    options: ['242', '486', '728', '729', '1458'],
    answer: 'C',
    explanation: 'Ini deret geometri dengan a = 2, r = 3, n = 6. Rumus Sₙ = a(rⁿ − 1)/(r − 1) = 2(3⁶ − 1)/(3 − 1) = 3⁶ − 1 = 729 − 1 = 728.',
    reasons: ['242 adalah jumlah lima suku pertama: 2 + 6 + 18 + 54 + 162.', '486 adalah suku keenam (2 × 3⁵), bukan jumlahnya.', 'Benar: S₆ = 728.', '729 lupa mengurangi 1 dari 3⁶.', '1458 adalah dua kali 729, akibat kesalahan pembagian denominator.'],
    indicator: 'Menghitung jumlah n suku deret geometri dari konteks pertumbuhan',
    competency: 'Analisis deret geometri', misconception: 'Mencampurkan rumus suku ke-n dengan rumus jumlah n suku.', recommendation: 'Latihan membedakan Uₙ = arⁿ⁻¹ dan Sₙ = a(rⁿ−1)/(r−1).'
  },
  {
    code: 'MAT-05', subjectId: 'MAT', topicId: 'mat-2', subTopic: 'Nilai maksimum',
    cognitive: 'C5', difficulty: 'sulit', type: 'single',
    stimulus: 'Sebuah kios menjual es teh. Berdasarkan pengalaman, penerimaan harian (dalam ribu rupiah) dimodelkan R(x) = −2x² + 80x, dengan x jumlah gelas yang dijual.',
    prompt: 'Jumlah gelas yang memberikan penerimaan maksimum adalah ...',
    options: ['10 gelas', '20 gelas', '40 gelas', '80 gelas', '160 gelas'],
    answer: 'B',
    explanation: 'Karena a = −2 < 0, parabola terbuka ke bawah sehingga memiliki nilai maksimum di xₚ = −b/(2a) = −80/(−4) = 20. Jadi penerimaan maksimum tercapai saat 20 gelas terjual.',
    reasons: ['Pada x = 10, R = 600; masih bisa dinaikkan.', 'Benar: puncak parabola ada di x = 20.', 'Pada x = 40, R = 0 karena merupakan titik potong sumbu X.', '80 adalah nilai koefisien b, bukan jumlah optimal.', '160 adalah dua kali 80, tidak berkaitan dengan titik puncak.'],
    indicator: 'Menentukan nilai optimum fungsi kuadrat dalam masalah penerimaan',
    competency: 'Optimasi fungsi kuadrat', misconception: 'Mengira koefisien b sebagai jumlah optimum.', recommendation: 'Latihan menentukan titik puncak pada fungsi kuadrat dengan a negatif.'
  },
  {
    code: 'MAT-06', subjectId: 'MAT', topicId: 'mat-1', subTopic: 'Deret aritmetika',
    cognitive: 'C4', difficulty: 'sulit', type: 'single',
    stimulus: 'Diketahui suku ke-5 sebuah barisan aritmetika adalah 18 dan suku ke-12 adalah 39.',
    prompt: 'Jumlah 10 suku pertama barisan tersebut adalah ...',
    options: ['165', '180', '195', '210', '225'],
    answer: 'C',
    explanation: 'Beda b = (U₁₂ − U₅)/(12 − 5) = (39 − 18)/7 = 3. U₁ = 18 − 4 × 3 = 6. U₁₀ = 6 + 9 × 3 = 33. S₁₀ = 10/2 × (U₁ + U₁₀) = 5 × 39 = 195.',
    reasons: ['165 diperoleh jika U₁₀ dianggap 27.', '180 diperoleh dengan beda 3 tetapi U₁ salah dihitung.', 'Benar: S₁₀ = 195.', '210 menggunakan rata-rata suku ke-5 dan ke-12 secara keliru.', '225 menggunakan jumlah 15 suku.'],
    indicator: 'Menentukan jumlah n suku dari dua suku yang diketahui',
    competency: 'Penalaran barisan aritmetika', misconception: 'Menggunakan rata-rata dua suku yang diketahui tanpa menghitung U₁ dan Uₙ.', recommendation: 'Latihan menyusun kembali barisan dari dua suku acak.'
  },
  {
    code: 'MAT-07', subjectId: 'MAT', topicId: 'mat-1', subTopic: 'Barisan aritmetika',
    cognitive: 'C4', difficulty: 'sedang', type: 'multiple',
    stimulus: 'Perhatikan barisan bilangan 3, 8, 13, 18, ... yang melanjutkan pola tetap.',
    prompt: 'Pernyataan yang benar tentang barisan tersebut adalah ... (pilih semua yang benar)',
    options: ['Beda barisan adalah 5', 'Suku ke-10 adalah 48', 'Jumlah 10 suku pertama adalah 250', 'Rumus suku ke-n adalah 5n − 2', 'Bilangan 53 merupakan salah satu suku barisan'],
    answer: ['A', 'B', 'D', 'E'],
    explanation: 'Dengan a = 3 dan b = 5, Uₙ = 3 + (n−1)5 = 5n − 2. U₁₀ = 48. S₁₀ = 10/2 (3 + 48) = 255, sehingga pernyataan C yang menyebut 250 salah. Selanjutnya 5n − 2 = 53 memberi n = 11, jadi 53 benar-benar merupakan suku barisan.',
    reasons: ['Benar: 8 − 3 = 5.', 'Benar: U₁₀ = 3 + 9 × 5 = 48.', 'Salah: S₁₀ = 5 × 51 = 255, bukan 250.', 'Benar: 5n − 2 menghasilkan 3 untuk n = 1.', 'Benar: 53 adalah suku ke-11.'],
    indicator: 'Mengevaluasi beberapa pernyataan sifat barisan aritmetika',
    competency: 'Evaluasi sifat barisan', misconception: 'Menganggap hanya ada satu pernyataan benar pada soal multiple response.', recommendation: 'Latihan memeriksa setiap pilihan secara mandiri pada soal multiple response.'
  },
  {
    code: 'MAT-08', subjectId: 'MAT', topicId: 'mat-2', subTopic: 'Grafik fungsi kuadrat',
    cognitive: 'C5', difficulty: 'sulit', type: 'multiple',
    stimulus: 'Diketahui fungsi kuadrat f(x) = x² − 2x − 8 yang grafiknya dipakai untuk memodelkan lintasan sebuah bola.',
    prompt: 'Pernyataan yang sesuai dengan grafik fungsi tersebut adalah ... (pilih semua yang benar)',
    options: ['Grafik terbuka ke atas', 'Sumbu simetri grafik adalah x = −1', 'Titik puncaknya adalah (1, −9)', 'Akar-akarnya adalah −2 dan 4', 'Grafik memotong sumbu Y di (0, −8)'],
    answer: ['A', 'C', 'D', 'E'],
    explanation: 'a = 1 > 0 sehingga terbuka ke atas. Sumbu simetri x = −b/2a = 1, bukan −1. Titik puncak (1, f(1)) = (1, −9). Faktor (x + 2)(x − 4) memberi akar −2 dan 4. f(0) = −8.',
    reasons: ['Benar karena koefisien x² positif.', 'Salah: sumbu simetri x = 1.', 'Benar: f(1) = 1 − 2 − 8 = −9.', 'Benar: (x + 2)(x − 4) = 0.', 'Benar: substitusi x = 0 menghasilkan −8.'],
    indicator: 'Mengevaluasi karakteristik grafik fungsi kuadrat secara simultan',
    competency: 'Analisis grafik', misconception: 'Keliru tanda pada rumus sumbu simetri −b/2a.', recommendation: 'Latihan memeriksa tanda koefisien b pada rumus sumbu simetri.'
  },
  {
    code: 'MAT-09', subjectId: 'MAT', topicId: 'mat-1', subTopic: 'Deret geometri',
    cognitive: 'C4', difficulty: 'sedang', type: 'multiple',
    stimulus: 'Sebuah sel bakteri membelah menjadi 2 sel setiap menit. Jumlah sel mengikuti barisan 1, 2, 4, 8, ...',
    prompt: 'Pernyataan yang benar tentang barisan dan deret tersebut adalah ... (pilih semua yang benar)',
    options: ['Rasionya adalah 2', 'Suku ke-6 adalah 32', 'Jumlah 5 suku pertama adalah 30', 'Jumlah n suku pertama dirumuskan 2ⁿ − 1', 'Suku ke-7 adalah 64'],
    answer: ['A', 'B', 'D', 'E'],
    explanation: 'Dengan a = 1 dan r = 2, Uₙ = 2ⁿ⁻¹ sehingga U₆ = 32 dan U₇ = 64. Jumlah n suku Sₙ = (2ⁿ − 1)/(2 − 1) = 2ⁿ − 1. S₅ = 31, bukan 30.',
    reasons: ['Benar: 2/1 = 2.', 'Benar: U₆ = 2⁵ = 32.', 'Salah: S₅ = 1 + 2 + 4 + 8 + 16 = 31.', 'Benar: Sₙ = 2ⁿ − 1.', 'Benar: U₇ = 2⁶ = 64.'],
    indicator: 'Meng_evaluasi rumus suku dan jumlah deret geometri',
    competency: 'Analisis deret geometri', misconception: 'Menganggap S₅ sama dengan U₅ atau menjumlahkan hingga suku ke-4 saja.', recommendation: 'Latihan daftar suku sebelum menghitung jumlah untuk memeriksa hasil.'
  },
  {
    code: 'MAT-10', subjectId: 'MAT', topicId: 'mat-3', subTopic: 'Pertidaksamaan kuadrat',
    cognitive: 'C6', difficulty: 'sulit', type: 'multiple',
    stimulus: 'Seorang petani memiliki kawat sepanjang 40 meter untuk membuat pagar kebun berbentuk persegi panjang. Ia ingin luas kebun sebesar mungkin.',
    prompt: 'Langkah atau simpulan yang tepat untuk merancang kebun tersebut adalah ... (pilih semua yang benar)',
    options: ['Jika lebar x, maka panjangnya 20 − x', 'Luas dinyatakan L(x) = x(20 − x)', 'Luas selalu bertambah jika lebar diperbesar', 'Luas maksimum dicapai saat x = 10', 'Bentuk optimalnya adalah persegi 10 m × 10 m'],
    answer: ['A', 'B', 'D', 'E'],
    explanation: 'Keliling 2(p + l) = 40 sehingga p + l = 20. Jika lebar x, panjang 20 − x, luas L(x) = x(20 − x) = −x² + 20x. Puncak terjadi di x = −20/(−2) = 10, menghasilkan luas 100 m². Penambahan lebar tidak selalu menaikkan luas setelah melewati x = 10.',
    reasons: ['Benar: p + l = 20.', 'Benar: L = panjang × lebar.', 'Salah: setelah x = 10 luas justru menurun.', 'Benar: xₚ = 10.', 'Benar: panjang = 20 − 10 = 10, sehingga berbentuk persegi.'],
    indicator: 'Merancang strategi optimasi luas dengan fungsi kuadrat',
    competency: 'Perancangan solusi optimasi', misconception: 'Mengira penambahan salah satu sisi selalu menambah luas.', recommendation: 'Latihan menyusun fungsi kuadrat dari kendala keliling sebelum mengoptimalkan.'
  }
]
