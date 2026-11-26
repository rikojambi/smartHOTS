import type { SeedInput } from '../seedTypes'

export const PAN: SeedInput[] = [
  {
    code: 'PAN-01', subjectId: 'PAN', topicId: 'pan-1', subTopic: 'Sikap demokratis',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Di kelas X, pemilihan ketua kelas dilakukan dengan musyawarah. Dua calon memiliki visi berbeda. Guru mengingatkan agar siswa tidak saling menjelekkan dan menerima hasil musyawarah.',
    prompt: 'Sila Pancasila yang paling relevan dengan sikap tersebut adalah ...',
    options: ['Sila pertama', 'Sila kedua', 'Sila ketiga', 'Sila keempat', 'Sila kelima'],
    answer: 'D',
    explanation: 'Sila keempat, Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan, menekankan musyawarah untuk mufakat dan penerimaan hasil secara demokratis.',
    reasons: ['Sila pertama mengatur ketuhanan, bukan tata cara musyawarah.', 'Sila kedua menekankan kemanusiaan yang adil dan beradab.', 'Sila ketiga menekankan persatuan, bukan mekanisme pengambilan keputusan.', 'Benar: musyawarah adalah inti sila keempat.', 'Sila kelima mengatur keadilan sosial.'],
    indicator: 'Mengaitkan praktik musyawarah dengan sila Pancasila yang sesuai',
    competency: 'Analisis nilai Pancasila', misconception: 'Mencampurkan sila kedua dan keempat karena keduanya berbicara tentang sikap sosial.', recommendation: 'Latihan memetakan kata kunci setiap sila ke contoh perilaku.'
  },
  {
    code: 'PAN-02', subjectId: 'PAN', topicId: 'pan-1', subTopic: 'Toleransi',
    cognitive: 'C5', difficulty: 'sulit', type: 'single',
    stimulus: 'Siswa baru dari daerah dengan tradisi berbeda mendapat ejekan karena cara berpakaiannya. Wakil kepala sekolah mengatakan bahwa keberagaman bukan alasan untuk membedakan perlakuan.',
    prompt: 'Penilaian yang paling tepat terhadap situasi tersebut adalah ...',
    options: ['Ejekan tersebut merupakan bentuk kebebasan berekspresi', 'Sikap itu melanggar sila kedua dan ketiga karena tidak beradab dan memecah persatuan', 'Masalah tersebut hanya ranah pribadi siswa', 'Siswa baru sebaiknya mengubah kebiasaannya agar diterima', 'Sila pertama melarang perbedaan pakaian'],
    answer: 'B',
    explanation: 'Sila kedua menuntut perlakuan beradab dan adil, sedangkan sila ketiga menuntut persatuan dalam kebhinekaan. Ejekan terhadap perbedaan melanggar keduanya.',
    reasons: ['Kebebasan berekspresi tidak boleh merendahkan martabat.', 'Benar: kemanusiaan beradab dan persatuan dilanggar.', 'Perilaku di sekolah merupakan masalah bersama.', 'Menyesuaikan diri tidak membenarkan ejekan.', 'Sila pertama tidak mengatur seragam pakaian.'],
    indicator: 'Menilai pelanggaran nilai kemanusiaan dan persatuan dalam kasus',
    competency: 'Evaluasi nilai Pancasila', misconception: 'Mengira bebas berpendapat berarti boleh mengejek perbedaan.', recommendation: 'Latihan menganalisis kasus dengan merujuk pada dua sila sekaligus.'
  },
  {
    code: 'PAN-03', subjectId: 'PAN', topicId: 'pan-2', subTopic: 'UUD 1945',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Pasal 31 UUD 1945 menyatakan bahwa setiap warga negara berhak mendapat pendidikan dan wajib mengikuti pendidikan dasar.',
    prompt: 'Kesimpulan yang tepat dari pasal tersebut adalah ...',
    options: ['Pendidikan dasar bersifat pilihan', 'Hak dan kewajiban berlaku bersamaan dalam pendidikan dasar', 'Negara tidak perlu menyelenggarakan sekolah', 'Hanya siswa berprestasi yang berhak bersekolah', 'Wajib belajar berlaku hingga perguruan tinggi'],
    answer: 'B',
    explanation: 'Pasal 31 memuat hak atas pendidikan dan kewajiban mengikuti pendidikan dasar. Hak dan kewajiban saling melengkapi, bukan pilihan.',
    reasons: ['Bertentangan dengan kata "wajib".', 'Benar: pasal memuat hak sekaligus kewajiban.', 'Negara justru berkewajiban menyelenggarakannya.', 'Hak pendidikan berlaku bagi setiap warga negara.', 'Kewajiban pada pasal ini dibatasi pendidikan dasar.'],
    indicator: 'Menafsirkan pasal UUD 1945 tentang hak dan kewajiban pendidikan',
    competency: 'Literasi konstitusi', misconception: 'Memisahkan hak dari kewajiban secara absolut.', recommendation: 'Latihan membaca pasal UUD dan menandai kata hak serta wajib.'
  },
  {
    code: 'PAN-04', subjectId: 'PAN', topicId: 'pan-2', subTopic: 'Hak warga negara',
    cognitive: 'C5', difficulty: 'sulit', type: 'single',
    stimulus: 'Seorang siswa dipecat dari kegiatan ekstrakurikuler tanpa diberi kesempatan menjelaskan dugaan pelanggaran.',
    prompt: 'Tindakan yang paling sesuai dengan prinsip keadilan konstitusional adalah ...',
    options: ['Menerima keputusan tanpa pertanyaan', 'Meminta penjelasan dan kesempatan membela diri sesuai prosedur', 'Membalas dengan ejekan kepada pengurus', 'Menyuruh teman memboikot kegiatan', 'Melaporkan tanpa mencari fakta terlebih dahulu'],
    answer: 'B',
    explanation: 'Keadilan prosedural menuntut kesempatan didengar dan pembelaan diri sebelum sanksi. Ini mencerminkan perlindungan hak warga negara.',
    reasons: ['Pasrah tanpa prosedur tidak menjamin keadilan.', 'Benar: hak pembelaan merupakan bagian dari keadilan.', 'Membalas ejekan melanggar kemanusiaan beradab.', 'Boikot tidak menyelesaikan masalah prosedur.', 'Laporan tetap diperbolehkan, tetapi fakta harus dicari lebih dulu.'],
    indicator: 'Mengevaluasi tindakan yang menjunjung keadilan prosedural',
    competency: 'Kesadaran konstitusional', misconception: 'Mengira kepatuhan berarti tidak boleh mempertanyakan keputusan.', recommendation: 'Latihan membedakan kepatuhan dan keadilan prosedural.'
  },
  {
    code: 'PAN-05', subjectId: 'PAN', topicId: 'pan-3', subTopic: 'Pluralisme',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Di sekolah, dua kelompok siswa ingin menggunakan lapangan pada waktu bersamaan. Kepala sekolah membuat jadwal bergilir dan menyediakan forum musyawarah bulanan.',
    prompt: 'Nilai Bhinneka Tunggal Ika yang tercermin dari tindakan kepala sekolah adalah ...',
    options: ['Memaksa satu kelompok mengalah', 'Mengelola perbedaan kepentingan secara adil dan damai', 'Melarang penggunaan lapangan', 'Memilih kelompok yang paling banyak', 'Menyerahkan konflik kepada pihak luar'],
    answer: 'B',
    explanation: 'Bhinneka Tunggal Ika mengajarkan persatuan dalam perbedaan. Jadwal bergilir dan musyawarah mengelola kepentingan tanpa menindas salah satu pihak.',
    reasons: ['Pemaksaan menimbulkan ketidakadilan.', 'Benar: perbedaan dikelola secara adil.', 'Larangan tidak menyelesaikan kebutuhan bersama.', 'Mayoritas tidak boleh selalu mengalahkan minoritas.', 'Konflik internal sebaiknya diselesaikan dengan musyawarah dulu.'],
    indicator: 'Mengidentifikasi penerapan persatuan dalam keberagaman',
    competency: 'Integrasi nasional', misconception: 'Mengira persatuan berarti keseragaman pendapat.', recommendation: 'Latihan mencari contoh pengelolaan konflik yang adil di lingkungan sekolah.'
  },
  {
    code: 'PAN-06', subjectId: 'PAN', topicId: 'pan-1', subTopic: 'Nilai ketuhanan',
    cognitive: 'C4', difficulty: 'mudah', type: 'single',
    stimulus: 'Sebelum memulai kegiatan belajar, siswa dan guru bersama-sama berdoa sesuai keyakinan masing-masing, tanpa memaksa satu cara tertentu.',
    prompt: 'Sikap tersebut mencerminkan ...',
    options: ['Sila pertama yang menjamin kebebasan beragama', 'Sila kelima yang menuntut kesamarataan mutlak', 'Sila ketiga yang melarang doa di sekolah', 'Sila keempat yang mengatur voting', 'Sila kedua yang memisahkan agama dari sekolah'],
    answer: 'A',
    explanation: 'Sila pertama menjamin keyakinan dan peribadatan sesuai agama masing-masing. Tidak ada paksaan satu cara doa, sehingga sikap ini toleran.',
    reasons: ['Benar: kebebasan beragama dalam sila pertama.', 'Keadilan sosial tidak berarti keseragaman ibadah.', 'Sila ketiga justru menjaga persatuan dalam perbedaan.', 'Voting tidak relevan dengan doa.', 'Sila kedua tidak memisahkan agama dari pendidikan.'],
    indicator: 'Mengaitkan praktik keagamaan inklusif dengan sila pertama',
    competency: 'Nilai ketuhanan', misconception: 'Mengira doa bersama berarti memaksakan satu agama.', recommendation: 'Latihan membedakan toleransi beragama dan sinkretisme.'
  },
  {
    code: 'PAN-07', subjectId: 'PAN', topicId: 'pan-2', subTopic: 'Hak dan kewajiban',
    cognitive: 'C4', difficulty: 'sedang', type: 'multiple',
    stimulus: 'Berikut perilaku warga sekolah: (1) mengikuti upacara bendera, (2) meminta fasilitas belajar yang layak, (3) membuang sampah sembarangan, (4) membayar SPP tepat waktu.',
    prompt: 'Yang termasuk kewajiban warga negara/siswa adalah ... (pilih semua yang benar)',
    options: ['(1)', '(2)', '(3)', '(4)', 'Semua merupakan hak'],
    answer: ['A', 'D'],
    explanation: 'Upacara bendera dan membayar SPP tepat waktu adalah kewajiban. Meminta fasilitas layak adalah hak; membuang sampah sembarangan melanggar kewajiban menjaga lingkungan.',
    reasons: ['Benar: mengikuti upacara adalah kewajiban.', 'Salah: ini adalah hak atas pendidikan.', 'Salah: ini pelanggaran kewajiban.', 'Benar: membayar SPP sesuai kesepakatan adalah kewajiban.', 'Salah: tidak semua butir adalah hak.'],
    indicator: 'Mengklasifikasikan hak dan kewajiban dalam contoh perilaku sekolah',
    competency: 'Literasi konstitusi', misconception: 'Mengira semua tindakan yang dilakukan siswa adalah hak.', recommendation: 'Latihan mengelompokkan contoh ke dalam hak, kewajiban, dan pelanggaran.'
  },
  {
    code: 'PAN-08', subjectId: 'PAN', topicId: 'pan-1', subTopic: 'Sila kedua',
    cognitive: 'C5', difficulty: 'sulit', type: 'multiple',
    stimulus: 'Beberapa tindakan terjadi di sekolah: menolong teman yang terjatuh, menyebarkan hoaks tentang guru, menghormati hasil musyawarah, dan membeda-bedakan siswa baru.',
    prompt: 'Tindakan yang sesuai dengan sila kedua adalah ... (pilih semua yang benar)',
    options: ['Menolong teman yang terjatuh', 'Menyebarkan hoaks tentang guru', 'Menghormati hasil musyawarah', 'Membedakan siswa baru', 'Memberi bantuan tanpa menghina penerimanya'],
    answer: ['A', 'E'],
    explanation: 'Sila kedua menekankan kemanusiaan yang adil dan beradab: menolong tanpa merendahkan. Menghormati musyawarah lebih langsung terkait sila keempat; hoaks dan diskriminasi melanggar kemanusiaan.',
    reasons: ['Benar: menolong adalah wujud kemanusiaan.', 'Salah: hoaks tidak beradab.', 'Ini terutama mencerminkan sila keempat.', 'Salah: diskriminasi melanggar keadilan.', 'Benar: membantu dengan menjaga martabat.'],
    indicator: 'Mengevaluasi tindakan berdasarkan nilai kemanusiaan yang adil dan beradab',
    competency: 'Evaluasi nilai kemanusiaan', misconception: 'Mengaitkan semua tindakan baik dengan sila kedua tanpa melihat fokus nilainya.', recommendation: 'Latihan memetakan tindakan ke sila yang paling spesifik.'
  },
  {
    code: 'PAN-09', subjectId: 'PAN', topicId: 'pan-3', subTopic: 'Ancaman integrasi',
    cognitive: 'C5', difficulty: 'sulit', type: 'multiple',
    stimulus: 'Berbagai fenomena diamati: perundungan antarkelompok, hoaks yang memicu curiga, gotong royong lintas kelas, dan penggunaan bahasa daerah untuk merendahkan kelompok lain.',
    prompt: 'Yang dapat menjadi ancaman integrasi nasional adalah ... (pilih semua yang benar)',
    options: ['Perundungan antarkelompok', 'Hoaks yang memicu kecurigaan', 'Gotong royong lintas kelas', 'Penggunaan bahasa daerah untuk merendahkan', 'Musyawarah untuk menyelesaikan konflik'],
    answer: ['A', 'B', 'D'],
    explanation: 'Perundungan, hoaks, dan penggunaan bahasa sebagai alat merendahkan memecah kepercayaan. Gotong royong dan musyawarah justru memperkuat integrasi.',
    reasons: ['Benar: merusak hubungan sosial.', 'Benar: hoaks memecah kepercayaan.', 'Salah: gotong royong memperkuat persatuan.', 'Benar: merendahkan budaya pihak lain memicu perpecahan.', 'Salah: musyawarah adalah solusi Damai.'],
    indicator: 'Mengidentifikasi ancaman terhadap integrasi nasional',
    competency: 'Analisis ancaman integrasi', misconception: 'Mengira bahasa daerah secara inheren menjadi ancaman.', recommendation: 'Latihan membedakan penggunaan budaya dan penyalahgunaannya.'
  },
  {
    code: 'PAN-10', subjectId: 'PAN', topicId: 'pan-3', subTopic: 'Tindakan inklusif',
    cognitive: 'C6', difficulty: 'sulit', type: 'multiple',
    stimulus: 'Sekolah akan menyusun program untuk memperkuat Bhinneka Tunggal Ika di lingkungan kelas X.',
    prompt: 'Rancangan kegiatan yang tepat adalah ... (pilih semua yang benar)',
    options: ['Forum musyawarah siswa setiap bulan', 'Hari budaya dengan pameran adat dan bahasa daerah', 'Aturan yang melarang perbedaan pendapat', 'Kampanye anti-hoaks di grup kelas', 'Sanksi bagi siswa yang berbeda kebiasaan'],
    answer: ['A', 'B', 'D'],
    explanation: 'Program inklusif membuka ruang musyawarah, apresiasi keberagaman, dan literasi informasi. Melarang perbedaan atau menghukum kebiasaan justru mematikan semangat Bhinneka.',
    reasons: ['Benar: musyawarah melatih demokrasi.', 'Benar: apresiasi budaya memperkuat persatuan.', 'Salah: keberagaman pendapat tidak boleh dilarang.', 'Benar: hoaks memecah persatuan.', 'Salah: sanksi terhadap perbedaan bersifat diskriminatif.'],
    indicator: 'Merancang kegiatan sekolah yang memperkuat persatuan dalam keberagaman',
    competency: 'Perancangan solusi sosial', misconception: 'Mengira keteraturan harus dicapai dengan melarang perbedaan.', recommendation: 'Latihan merancang program dengan prinsip inklusi dan musyawarah.'
  }
]
