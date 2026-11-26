import type { CognitiveLevel, Difficulty, Question, QuestionType } from '../types'
import { indicatorKeyOf } from '../lib/competency'

export const SEED_TEACHER = 'teacher-1'

export interface TopicSeed {
  id: string
  subjectId: string
  name: string
  subTopics: string[]
  category?: string
  semester: number
  order: number
  cp: string
  tp: string[]
  categories?: string[]
}

export const TOPIC_SEEDS: TopicSeed[] = [
  { id: 'mat-1', subjectId: 'MAT', name: 'Barisan dan Deret', subTopics: ['Barisan aritmetika', 'Deret aritmetika', 'Barisan geometri', 'Deret geometri'], semester: 1, order: 1, cp: 'Fase E: Memahami pola bilangan, barisan, dan deret serta menggunakan konsepnya untuk menyelesaikan masalah kontekstual.', tp: ['TP1 Menentukan suku dan jumlah suku barisan aritmetika dan geometri', 'TP2 Memodelkan situasi kehidupan dengan barisan dan deret'] },
  { id: 'mat-2', subjectId: 'MAT', name: 'Fungsi Kuadrat', subTopics: ['Grafik fungsi kuadrat', 'Titik puncak', 'Titik potong sumbu X'], semester: 1, order: 2, cp: 'Fase E: Menganalisis fungsi kuadrat, grafiknya, serta menggunakannya dalam pemodelan masalah.', tp: ['TP3 Menganalisis grafik fungsi kuadrat', 'TP4 Menentukan nilai maksimum dan minimum dalam konteks'] },
  { id: 'mat-3', subjectId: 'MAT', name: 'Persamaan dan Pertidaksamaan', subTopics: ['Persamaan kuadrat', 'Pertidaksamaan kuadrat', 'Sistem persamaan linear'], semester: 1, order: 3, cp: 'Fase E: Menyelesaikan persamaan dan pertidaksamaan kuadrat serta sistem persamaan untuk masalah nyata.', tp: ['TP5 Menyelesaikan persamaan kuadrat kontekstual', 'TP6 Menafsirkan himpunan penyelesaian pertidaksamaan'] },
  { id: 'bin-1', subjectId: 'BIN', name: 'Teks Informasi dan Fakta', subTopics: ['Ide pokok', 'Informasi tersirat', 'Ringkasan'], semester: 1, order: 1, cp: 'Fase E: Memahami, mengevaluasi, dan menyusun teks informasi faktual serta menyimpulkan isi bacaan.', tp: ['TP1 Menemukan ide pokok dan informasi tersirat', 'TP2 Menyusun ringkasan teks informasi'] },
  { id: 'bin-2', subjectId: 'BIN', name: 'Teks Prosedur', subTopics: ['Langkah kerja', 'Kata kerja operasional', 'Konsistensi prosedur'], semester: 1, order: 2, cp: 'Fase E: Mengapresiasi dan memproduksi teks prosedur dengan langkah yang logis dan bahasa yang tepat.', tp: ['TP3 Menilai kelogisan langkah prosedur', 'TP4 Memperbaiki kesalahan prosedur'] },
  { id: 'bin-3', subjectId: 'BIN', name: 'Penulisan Kalimat Efektif', subTopics: ['Koherensi', 'Kesepadanan', 'Kehematan'], semester: 1, order: 3, cp: 'Fase E: Menggunakan kaidah kebahasaan secara tepat dalam teks tulis.', tp: ['TP5 Mengidentifikasi kalimat tidak efektif', 'TP6 Memperbaiki kalimat berdasarkan kaidah'] },
  { id: 'bing-1', subjectId: 'BING', name: 'Analytical Exposition', subTopics: ['Thesis', 'Arguments', 'Reiteration'], semester: 1, order: 1, cp: 'Fase E: Memahami dan mengevaluasi teks eksposisi analitis dalam bahasa Inggris.', tp: ['TP1 Mengidentifikasi struktur teks eksposisi', 'TP2 Menilai kekuatan argumen'] },
  { id: 'bing-2', subjectId: 'BING', name: 'Recount Text', subTopics: ['Orientation', 'Events', 'Reorientation'], semester: 1, order: 2, cp: 'Fase E: Memahami teks recount dan menyusun urutan peristiwa secara kronologis.', tp: ['TP3 Menentukan urutan peristiwa', 'TP4 Menggunakan past tense secara tepat'] },
  { id: 'bing-3', subjectId: 'BING', name: 'Modal Verbs & Advice', subTopics: ['Should', 'Must', 'Have to'], semester: 1, order: 3, cp: 'Fase E: Menggunakan modal verbs untuk menyatakan saran, kewajiban, dan larangan.', tp: ['TP5 Memilih modal verb sesuai fungsi', 'TP6 Membuat saran berdasarkan situasi'] },
  { id: 'pan-1', subjectId: 'PAN', name: 'Nilai Pancasila dalam Kehidupan', subTopics: ['Silakan nilai', 'Sikap demokratis', 'Toleransi'], semester: 1, order: 1, cp: 'Fase E: Menganalisis nilai Pancasila dalam perilaku sosial kemasyarakatan.', tp: ['TP1 Mengaitkan sila Pancasila dengan sikap sehari-hari', 'TP2 Menilai pelanggaran nilai Pancasila'] },
  { id: 'pan-2', subjectId: 'PAN', name: 'Konstitusi dan HAM', subTopics: ['UUD 1945', 'Hak warga negara', 'Kewajiban warga negara'], semester: 1, order: 2, cp: 'Fase E: Memahami kedudukan UUD 1945 serta hak dan kewajiban warga negara.', tp: ['TP3 Menganalisis pasal UUD 1945 dalam kasus', 'TP4 Membedakan hak dan kewajiban'] },
  { id: 'pan-3', subjectId: 'PAN', name: 'Bhineka Tunggal Ika', subTopics: ['Pluralisme', 'Integrasi nasional', 'Sikap inklusif'], semester: 1, order: 3, cp: 'Fase E: Menilai upaya menjaga kebhinekaan tunggal ika di lingkungan sekolah dan masyarakat.', tp: ['TP5 Mengidentifikasi ancaman integrasi', 'TP6 Merancang tindakan inklusif'] },
  { id: 'ipa-1', subjectId: 'IPA', name: 'Biologi: Sel dan Sistem Organ', subTopics: ['Struktur sel', 'Organel sel', 'Sistem organ'], semester: 1, order: 1, category: 'Biologi', cp: 'Fase E: Memahami struktur dan fungsi sel serta keterkaitannya dengan sistem organ makhluk hidup.', tp: ['TP1 Menganalisis fungsi organel sel', 'TP2 Menjelaskan keterkaitan sistem organ'] },
  { id: 'ipa-2', subjectId: 'IPA', name: 'Fisika: Besaran dan Pengukuran', subTopics: ['Besaran pokok', 'Besaran turunan', 'Alat ukur'], semester: 1, order: 2, category: 'Fisika', cp: 'Fase E: Menggunakan besaran dan satuan secara tepat serta melakukan pengukuran ilmiah.', tp: ['TP3 Mengklasifikasikan besaran', 'TP4 Menilai ketepatan pengukuran'] },
  { id: 'ipa-3', subjectId: 'IPA', name: 'Kimia: Materi dan Perubahannya', subTopics: ['Zat murni', 'Campuran', 'Perubahan fisika dan kimia'], semester: 1, order: 3, category: 'Kimia', cp: 'Fase E: Menganalisis komposisi materi dan perubahannya berdasarkan bukti empiris.', tp: ['TP5 Membedakan campuran dan zat murni', 'TP6 Menilai bukti perubahan kimia'] },
  { id: 'ips-1', subjectId: 'IPS', name: 'Geografi: Litosfer dan Lingkungan', subTopics: ['Struktur bumi', 'Tanah', 'Bencana geologi'], semester: 1, order: 1, category: 'Geografi', cp: 'Fase E: Menganalisis proses geologi dan kaitannya dengan lingkungan serta aktivitas manusia.', tp: ['TP1 Menjelaskan proses geologi', 'TP2 Menilai risiko bencana'] },
  { id: 'ips-2', subjectId: 'IPS', name: 'Ekonomi: Kebutuhan dan Sumber Daya', subTopics: ['Kelangkaan', 'Nilai guna', 'Sistem ekonomi'], semester: 1, order: 2, category: 'Ekonomi', cp: 'Fase E: Menganalisis masalah kelangkaan dan pengambilan keputusan ekonomi.', tp: ['TP3 Menilai biaya peluang', 'TP4 Menganalisis mekanisme pasar'] },
  { id: 'ips-3', subjectId: 'IPS', name: 'Sejarah: Peradaban Awal', subTopics: ['Zaman prasejarah', 'Peradaban sungai', 'Sumber sejarah'], semester: 1, order: 3, category: 'Sejarah', cp: 'Fase E: Memahami perkembangan peradaban awal dan penggunaan sumber sejarah.', tp: ['TP5 Membandingkan peradaban', 'TP6 Menilai keandalan sumber sejarah'] },
  { id: 'inf-1', subjectId: 'INF', name: 'Algoritma dan Pemrograman', subTopics: ['Pseudocode', 'Percabangan', 'Perulangan'], semester: 1, order: 1, cp: 'Fase E: Merancang dan menganalisis algoritma pemecahan masalah sederhana.', tp: ['TP1 Menulis pseudocode', 'TP2 Menganalisis alur percabangan dan perulangan'] },
  { id: 'inf-2', subjectId: 'INF', name: 'Data dan Informasi', subTopics: ['Representasi data', 'Penyimpanan data', 'Keamanan data'], semester: 1, order: 2, cp: 'Fase E: Mengelola data secara etis dan memahami representasi informasi digital.', tp: ['TP3 Membaca representasi data', 'TP4 Menilai keamanan data'] },
  { id: 'inf-3', subjectId: 'INF', name: 'Jaringan Komputer', subTopics: ['IP address', 'Protokol', 'Keamanan jaringan'], semester: 1, order: 3, cp: 'Fase E: Memahami cara kerja jaringan komputer dan menjaga keamanan informasi.', tp: ['TP5 Menjelaskan alur data jaringan', 'TP6 Mengidentifikasi ancaman jaringan'] },
  { id: 'pjo-1', subjectId: 'PJO', name: 'Kebugaran Jasmani', subTopics: ['Komposisi tubuh', 'VO2 maks', 'Prinsip FITT'], semester: 1, order: 1, cp: 'Fase E: Menerapkan prinsip latihan untuk meningkatkan kebugaran jasmani.', tp: ['TP1 Menerapkan prinsip FITT', 'TP2 Menilai hasil tes kebugaran'] },
  { id: 'pjo-2', subjectId: 'PJO', name: 'Permainan Bola Besar', subTopics: ['Sepak bola', 'Bola basket', 'Bola voli'], semester: 1, order: 2, cp: 'Fase E: Memahami strategi dan teknik dasar permainan bola besar serta menerapkannya.', tp: ['TP3 Menganalisis strategi permainan', 'TP4 Menilai pelanggaran aturan'] },
  { id: 'pjo-3', subjectId: 'PJO', name: 'Keselamatan dan Kesehatan', subTopics: ['Pencegahan cedera', 'P3K', 'Hidrasi'], semester: 1, order: 3, cp: 'Fase E: Mengambil keputusan yang aman dan sehat dalam aktivitas jasmani.', tp: ['TP5 Menangani cedera ringan', 'TP6 Merencanakan hidrasi latihan'] },
  { id: 'sen-1', subjectId: 'SEN', name: 'Seni Musik', subTopics: ['Notasi', 'Dinamika', 'Ansambel'], semester: 1, order: 1, category: 'Seni Musik', cp: 'Fase E: Mengapresiasi dan menciptakan karya musik sederhana dengan unsur musik yang tepat.', tp: ['TP1 Membaca notasi', 'TP2 Menilai keselarasan ansambel'] },
  { id: 'sen-2', subjectId: 'SEN', name: 'Seni Rupa', subTopics: ['Unsur rupa', 'Prinsip desain', 'Komposisi'], semester: 1, order: 2, category: 'Seni Rupa', cp: 'Fase E: Menganalisis unsur dan prinsip seni rupa dalam karya.', tp: ['TP3 Mengidentifikasi prinsip desain', 'TP4 Menilai komposisi karya'] },
  { id: 'sen-3', subjectId: 'SEN', name: 'Seni Tari dan Teater', subTopics: ['Gerak tari', 'Ekspresi', 'Panggung'], semester: 1, order: 3, category: 'Seni Tari', cp: 'Fase E: Memahami unsur gerak dan ekspresi dalam pertunjukan.', tp: ['TP5 Menganalisis gerak tari', 'TP6 Menilai ekspresi panggung'] },
  { id: 'pra-1', subjectId: 'PRA', name: 'Kerajinan', subTopics: ['Bahan', 'Teknik', 'Nilai ekonomi'], semester: 1, order: 1, category: 'Kerajinan', cp: 'Fase E: Merancang dan memproduksi karya kerajinan dengan mempertimbangkan bahan, teknik, dan nilai.', tp: ['TP1 Memilih bahan tepat', 'TP2 Menilai teknik pembuatan'] },
  { id: 'pra-2', subjectId: 'PRA', name: 'Rekayasa', subTopics: ['Perancangan', 'Alat sederhana', 'Uji coba'], semester: 1, order: 2, category: 'Rekayasa', cp: 'Fase E: Merancang alat sederhana melalui proses rekayasa dan uji coba.', tp: ['TP3 Merancang solusi alat', 'TP4 Menganalisis hasil uji coba'] },
  { id: 'pra-3', subjectId: 'PRA', name: 'Budidaya dan Pengolahan', subTopics: ['Budidaya tanaman', 'Pengolahan pangan', 'Keamanan pangan'], semester: 1, order: 3, category: 'Budidaya', cp: 'Fase E: Memahami proses budidaya dan pengolahan hasil secara aman dan berkelanjutan.', tp: ['TP5 Menilai tahap budidaya', 'TP6 Menilai keamanan pengolahan'] }
]

export interface SeedInput {
  code: string
  subjectId: string
  topicId: string
  subTopic: string
  category?: string
  cognitive: CognitiveLevel
  difficulty: Difficulty
  type: QuestionType
  stimulus: string
  prompt: string
  options: string[]
  answer: string | string[]
  explanation: string
  reasons: string[]
  indicator: string
  competency: string
  misconception: string
  recommendation: string
}

export function buildQuestion(s: SeedInput, index: number): Question {
  const topic = TOPIC_SEEDS.find(t => t.id === s.topicId)!
  const correct = Array.isArray(s.answer) ? s.answer : [s.answer]
  const labels = ['A', 'B', 'C', 'D', 'E']
  const now = Date.now() + index
  return {
    id: `q-${s.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    code: s.code,
    subjectId: s.subjectId,
    topicId: s.topicId,
    subTopic: s.subTopic,
    category: s.category || topic.category,
    semester: 1,
    cp: topic.cp,
    tp: topic.tp.join('; '),
    indicator: s.indicator,
    indicatorKey: indicatorKeyOf({ topicId: s.topicId, indicator: s.indicator }),
    generatedBy: 'teacher',
    cognitive: s.cognitive,
    difficulty: s.difficulty,
    type: s.type,
    status: 'siap',
    active: true,
    stimulus: s.stimulus,
    prompt: s.prompt,
    options: labels.map((label, i) => ({
      id: `${s.code}-${label}`, label, text: s.options[i],
      isCorrect: correct.includes(label),
      reason: s.reasons[i] || ''
    })),
    explanation: s.explanation,
    competency: s.competency,
    misconception: s.misconception,
    recommendation: s.recommendation,
    teacherId: SEED_TEACHER,
    version: 1,
    createdAt: now,
    updatedAt: now
  }
}
