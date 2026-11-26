import JSZip from 'jszip'

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!))
}

function paragraph(text: string) {
  if (!text) return '<w:p/>'
  return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
}

const INSTRUCTIONS = [
  'PETUNJUK: Isi bagian dalam kurung siku. Setiap soal diawali baris SOAL <nomor>:. Gunakan JENIS: PILIHAN GANDA atau JENIS: MULTIPLE RESPONSE. Tulis STIMULUS, PERTANYAAN, pilihan A. sampai E., KUNCI, PEMBAHASAN, INDIKATOR, TP, KOMPETENSI, MISKONSEPSI, REKOMENDASI, SEMANTIK, LEVEL: C4/C5/C6, dan TINGKAT KESULITAN. Semua penanda boleh huruf besar atau kecil, dengan atau tanpa titik dua.',
  ''
]

const BLANK = [
  ...INSTRUCTIONS,
  'MATA PELAJARAN: [NAMA MATA PELAJARAN]',
  'MATERI: [NAMA MATERI/TOPIK]',
  'SEMESTER: [1 atau 2]',
  'KELAS: [NAMA KELAS]',
  '',
  'SOAL 1:',
  'JENIS: PILIHAN GANDA',
  'TINGKAT KESULITAN: SEDANG',
  'LEVEL: C4',
  'STIMULUS: [Teks, tabel, atau keterangan gambar. Kosongkan bila tidak ada]',
  'PERTANYAAN: [Tuliskan pertanyaan di sini]',
  'A. [Pilihan A]',
  'B. [Pilihan B]',
  'C. [Pilihan C]',
  'D. [Pilihan D]',
  'E. [Pilihan E]',
  'KUNCI: [A/B/C/D/E atau beberapa huruf dipisah koma untuk multiple response]',
  'PEMBAHASAN: [Penjelasan jawaban]',
  'INDIKATOR: [Indikator pencapaian kompetensi]',
  'TP: [Tujuan pembelajaran]',
  'KOMPETENSI: [Kompetensi yang diukur]',
  'MISKONSEPSI: [Kesalahan umum yang mungkin terjadi]',
  'REKOMENDASI: [Tindak lanjut pembelajaran]',
  'SEMANTIK: [konsep/penerapan/analisis]',
  ''
]

const FILLED = [
  ...INSTRUCTIONS,
  'MATA PELAJARAN: MATEMATIKA',
  'MATERI: BARISAN DAN DERET',
  'SEMESTER: 1',
  'KELAS: X-1',
  '',
  'SOAL 1:',
  'JENIS: PILIHAN GANDA',
  'TINGKAT KESULITAN: SEDANG',
  'LEVEL: C4',
  'STIMULUS: Perhatikan barisan bilangan 3, 8, 13, 18, ...',
  'PERTANYAAN: Suku ke-10 barisan tersebut adalah ...',
  'A. 43',
  'B. 45',
  'C. 48',
  'D. 50',
  'E. 53',
  'KUNCI: C',
  'PEMBAHASAN: Beda antarsuku adalah 5, sehingga U10 = 3 + (10 - 1) × 5 = 48.',
  'INDIKATOR: Menentukan suku ke-n barisan aritmetika',
  'TP: Peserta didik dapat menentukan suku ke-n barisan aritmetika',
  'KOMPETENSI: Memahami pola bilangan',
  'MISKONSEPSI: Menganggap beda barisan sama dengan suku pertama',
  'REKOMENDASI: Latihan menentukan beda dan suku ke-n',
  'SEMANTIK: penerapan',
  '',
  'SOAL 2:',
  'JENIS: MULTIPLE RESPONSE',
  'TINGKAT KESULITAN: SULIT',
  'LEVEL: C5',
  'STIMULUS: Data penjualan meningkat 10% setiap bulan selama enam bulan.',
  'PERTANYAAN: Pernyataan yang benar berdasarkan data tersebut adalah ... (pilih semua yang benar)',
  'A. Penjualan bulan kedua lebih tinggi dari bulan pertama',
  'B. Kenaikan bersifat tetap setiap bulan',
  'C. Grafik penjualan menurun',
  'D. Data dapat dipakai memprediksi bulan berikutnya',
  'E. Bulan keenam pasti lebih rendah dari bulan pertama',
  'KUNCI: A, B, D',
  'PEMBAHASAN: Kenaikan 10% membuat nilai selalu naik dan dapat diekstrapolasi.',
  'INDIKATOR: Menganalisis pola perubahan data',
  'TP: Peserta didik dapat menganalisis perubahan data',
  'KOMPETENSI: Menganalisis data',
  'MISKONSEPSI: Mengira kenaikan persentase selalu menurun',
  'REKOMENDASI: Berlatih membaca grafik pertumbuhan',
  'SEMANTIK: analisis'
]

/** Build a minimal but valid .docx containing the official import template. */
export async function buildQuestionTemplateDocx(filled: boolean): Promise<Blob> {
  const lines = filled ? FILLED : BLANK
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${lines.map(paragraph).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="${DOCX_MIME}"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`

  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`

  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${filled ? 'Contoh soal terisi' : 'Template import soal'}</dc:title></cp:coreProperties>`

  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Smart HOTS</Application></Properties>`

  const zip = new JSZip()
  zip.file('[Content_Types].xml', contentTypes)
  zip.file('_rels/.rels', rootRels)
  zip.file('word/document.xml', document)
  zip.file('word/_rels/document.xml.rels', documentRels)
  zip.file('docProps/core.xml', core)
  zip.file('docProps/app.xml', app)
  const bytes = await zip.generateAsync({ type: 'uint8array' })
  return new Blob([bytes as BlobPart], { type: DOCX_MIME })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Download the official blank template (false) or a fully filled example (true). */
export function downloadQuestionTemplate(filled: boolean) {
  buildQuestionTemplateDocx(filled)
    .then(blob => downloadBlob(blob, filled ? 'contoh-import-soal-terisi.docx' : 'template-import-soal.docx'))
    .catch(error => console.error('Gagal membuat template DOCX', error))
}
