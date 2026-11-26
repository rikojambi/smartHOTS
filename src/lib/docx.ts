import JSZip from 'jszip'
import { uid } from '../db/db'
import type { CognitiveLevel, Difficulty, ParsedQuestion, QuestionType } from '../types'

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const M = 'http://schemas.openxmlformats.org/officeDocument/2006/math'

interface Block { text: string; images: { id: string; name: string; blob: Blob }[] }

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!))
}

async function readRelations(zip: JSZip) {
  const map: Record<string, string> = {}
  const file = zip.file('word/_rels/document.xml.rels')
  if (!file) return map
  const xml = await file.async('string')
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  for (const el of Array.from(doc.getElementsByTagName('Relationship'))) {
    map[el.getAttribute('Id') || ''] = el.getAttribute('Target') || ''
  }
  return map
}

async function readBlocks(zip: JSZip): Promise<Block[]> {
  const docFile = zip.file('word/document.xml')
  if (!docFile) throw new Error('File DOCX tidak memiliki word/document.xml.')
  const xml = await docFile.async('string')
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const body = doc.getElementsByTagNameNS(W, 'body')[0]
  if (!body) throw new Error('Struktur dokumen Word tidak dikenali.')
  const rels = await readRelations(zip)
  const blocks: Block[] = []

  async function imagesIn(el: Element) {
    const result: Block['images'] = []
    for (const blip of Array.from(el.getElementsByTagNameNS(A, 'blip'))) {
      const id = blip.getAttributeNS(R, 'embed') || blip.getAttributeNS(R, 'link')
      const target = id ? rels[id] : undefined
      if (!target) continue
      const path = target.startsWith('word/') ? target : `word/${target.replace(/^\//, '')}`
      const media = zip.file(path)
      if (!media) continue
      result.push({ id: uid('img-'), name: path.split('/').pop() || 'gambar', blob: await media.async('blob') })
    }
    return result
  }

  for (const child of Array.from(body.children)) {
    if (child.localName === 'p') {
      const hasMath = child.getElementsByTagNameNS(M, 'oMath').length > 0
      const parts = Array.from(child.getElementsByTagNameNS(W, 't')).map(n => n.textContent || '')
      let text = parts.join('')
      if (hasMath && text.trim()) text = `$${text.trim()}$`
      const images = await imagesIn(child)
      if (text.trim() || images.length) blocks.push({ text: text.trim(), images })
    } else if (child.localName === 'tbl') {
      const rows = Array.from(child.getElementsByTagNameNS(W, 'tr')).map(tr =>
        Array.from(tr.getElementsByTagNameNS(W, 'tc')).map(tc =>
          Array.from(tc.getElementsByTagNameNS(W, 't')).map(n => n.textContent || '').join('').trim()
        ).join(' | ')
      )
      blocks.push({ text: rows.join('\n'), images: await imagesIn(child) })
    }
  }
  return blocks
}

const isOption = (s: string) => /^([A-E])[.).]\s*(.+)$/i.exec(s.trim())
const KNOWN = /^(SOAL|JENIS|KUNCI|PEMBAHASAN|TP|TINGKAT KOGNITIF|TINGKAT|MATERI|MATA PELAJARAN|SEMSTER|SEMESTER)\b/i

export async function parseDocx(file: File): Promise<{ questions: ParsedQuestion[]; errors: string[] }> {
  const zip = await JSZip.loadAsync(file)
  const blocks = await readBlocks(zip)
  const questions: ParsedQuestion[] = []
  const errors: string[] = []
  let current: ParsedQuestion | null = null
  let mode: 'stem' | 'explanation' | 'tp' | 'none' = 'stem'
  let lastNumber = 0
  let pending: { type?: QuestionType; cognitive?: CognitiveLevel; difficulty?: Difficulty; tp?: string } = {}

  function finish() {
    const q = current
    if (!q) return
    if (q.options.length < 2) q.warnings.push('Pilihan jawaban kurang dari dua.')
    if (!q.answer.length) q.warnings.push('Kunci jawaban tidak ditemukan.')
    if (!q.prompt) q.warnings.push('Pertanyaan kosong.')
    const wrong = q.answer.filter(a => !q.options.some(o => o.label === a))
    if (wrong.length) q.warnings.push(`Kunci ${wrong.join(', ')} tidak memiliki pilihan sesuai.`)
    if (q.type === 'single' && q.answer.length > 1) q.warnings.push('Pilihan ganda memiliki lebih dari satu kunci.')
    if (q.type === 'multiple' && q.answer.length < 2) q.warnings.push('Multiple response hanya memiliki satu kunci.')
    questions.push(q)
    current = null
  }

  for (const block of blocks) {
    const line = block.text.trim()
    if (!line && !block.images.length) continue

    // Format lama meletakkan JENIS sebelum nomor soal. Jika soal sebelumnya sudah
    // memiliki kunci, JENIS berikutnya menandai awal soal baru.
    const nextType = /^JENIS\s*:\s*(.*)$/i.exec(line)
    if (nextType && current && current.answer.length) {
      finish()
      pending.type = /MULTIPLE|JAWABAN LEBIH|MR/i.test(nextType[1]) ? 'multiple' : 'single'
      continue
    }

    const start = /^(?:SOAL|QUESTION)\s*(\d+)?\s*:?/i.exec(line)
    if (start) {
      finish()
      const num = start[1] ? Number(start[1]) : lastNumber + 1
      if (lastNumber && num !== lastNumber + 1) errors.push(`Nomor soal ${num} tidak berurutan setelah ${lastNumber}.`)
      lastNumber = num
      const pre = pending
      pending = {}
      current = {
        tempId: uid('tmp-'), number: num, type: pre.type || 'single', stimulus: '', prompt: '',
        options: [], answer: [], explanation: '', tp: pre.tp || '', cognitive: pre.cognitive || 'C4', difficulty: pre.difficulty || 'sedang',
        images: [], warnings: []
      }
      mode = 'stem'
      block.images.forEach(img => current!.images.push({ ...img, location: 'stimulus' }))
      continue
    }

    if (!current) {
      const preHeader = /^([A-Z\s]+)\s*:\s*(.*)$/.exec(line)
      if (preHeader) {
        const key = preHeader[1].trim().toUpperCase().replace(/\s+/g, ' ')
        const value = preHeader[2].trim()
        if (key === 'JENIS') pending.type = /MULTIPLE|JAWABAN LEBIH|MR/i.test(value) ? 'multiple' : 'single'
        else if (key === 'TP') pending.tp = value
        else if (key === 'TINGKAT KOGNITIF') pending.cognitive = value.toUpperCase().match(/C[4-6]/)?.[0] as CognitiveLevel || 'C4'
        else if (key === 'TINGKAT' || key === 'TINGKAT KESULITAN') pending.difficulty = /mudah|easy/i.test(value) ? 'mudah' : /sulit|hard/i.test(value) ? 'sulit' : 'sedang'
      } else if (block.images.length) errors.push('Gambar ditemukan sebelum nomor soal; gambar diabaikan.')
      continue
    }

    const header = /^([A-Z\s]+)\s*:\s*(.*)$/.exec(line)
    if (header) {
      const key = header[1].trim().toUpperCase().replace(/\s+/g, ' ')
      const value = header[2].trim()
      if (key === 'JENIS') {
        current.type = /MULTIPLE|JAWABAN LEBIH|MR/i.test(value) ? 'multiple' : 'single'
        mode = 'none'
      } else if (key === 'KUNCI' || key === 'JAWABAN') {
        current.answer = value.toUpperCase().replace(/[^A-E,;\s]/g, '').split(/[,;\s]+/).filter(Boolean)
        mode = 'none'
      } else if (key === 'PEMBAHASAN') {
        current.explanation = value
        mode = 'explanation'
      } else if (key === 'TP') {
        current.tp = value
        mode = 'tp'
      } else if (key === 'TINGKAT KOGNITIF') {
        const c = value.toUpperCase().match(/C[4-6]/)?.[0]
        if (c) current.cognitive = c as CognitiveLevel
        mode = 'none'
      } else if (key === 'TINGKAT' || key === 'TINGKAT KESULITAN') {
        const d = value.toLowerCase()
        current.difficulty = /mudah|easy/i.test(d) ? 'mudah' : /sulit|hard/i.test(d) ? 'sulit' : 'sedang'
        mode = 'none'
      } else if (key === 'STIMULUS') {
        current.stimulus = value
        mode = 'stem'
      } else {
        mode = 'none'
      }
      if (block.images.length) {
        block.images.forEach(img => current!.images.push({ ...img, location: mode === 'explanation' ? 'option' : 'stimulus' }))
      }
      continue
    }

    const option = isOption(line)
    if (option) {
      const label = option[1].toUpperCase()
      const mediaId = block.images[0]?.id
      current.options.push({ label, text: option[2], mediaId })
      block.images.forEach(img => current!.images.push({ ...img, location: 'option', optionLabel: label }))
      mode = 'none'
      continue
    }

    if (mode === 'explanation') current.explanation += `${current.explanation ? '\n' : ''}${line}`
    else if (mode === 'tp') current.tp += `${current.tp ? '\n' : ''}${line}`
    else {
      const stemText = current.prompt ? `${current.prompt}\n${line}` : line
      if (!current.stimulus && /\?$/.test(line) && stemText.includes('\n')) {
        const parts = stemText.split('\n')
        current.prompt = parts.pop() || ''
        current.stimulus = parts.join('\n')
      } else current.prompt = stemText
    }
    block.images.forEach(img => current!.images.push({ ...img, location: 'stimulus' }))
  }
  finish()

  if (!questions.length) errors.push('Tidak ada soal yang terdeteksi. Gunakan format "SOAL 1:" pada template.')
  if (new Set(questions.map(q => q.type)).size === 1 && questions.length >= 4) {
    errors.push('Periksa jenis soal: semua soal terdeteksi satu jenis. Pastikan format JENIS: MULTIPLE RESPONSE digunakan.')
  }
  return { questions, errors }
}

const W_NS = `xmlns:w="${W}"`

export async function buildTemplateDocx(): Promise<Blob> {
  const sample = [
    ['MATA PELAJARAN: MATEMATIKA'],
    ['MATERI: BARISAN DAN DERET'],
    ['SEMESTER: 1'],
    [''],
    ['SOAL 1:'],
    ['JENIS: PILIHAN GANDA'],
    ['TINGKAT: C4'],
    ['Perhatikan barisan 3, 8, 13, 18, ... Suku ke-10 barisan tersebut adalah ...'],
    ['A. 43'],
    ['B. 45'],
    ['C. 48'],
    ['D. 50'],
    ['E. 53'],
    ['KUNCI: C'],
    ['PEMBAHASAN:'],
    ['Beda barisan 5, sehingga U10 = 3 + 9 × 5 = 48.'],
    ['TP: Menentukan suku ke-n barisan aritmetika'],
    ['TINGKAT KOGNITIF: C4'],
    [''],
    ['SOAL 2:'],
    ['JENIS: MULTIPLE RESPONSE'],
    ['TINGKAT: C5'],
    ['Stimulus: Grafik penjualan menunjukkan kenaikan 10% setiap bulan.'],
    ['Pernyataan yang benar adalah ... (pilih semua yang benar)'],
    ['A. Penjualan bulan kedua lebih tinggi dari bulan pertama'],
    ['B. Kenaikan bersifat tetap'],
    ['C. Grafik menurun'],
    ['D. Data dapat dipakai untuk memprediksi bulan berikutnya'],
    ['E. Bulan kelima pasti lebih rendah dari bulan pertama'],
    ['KUNCI: A, B, D'],
    ['PEMBAHASAN: Kenaikan 10% membuat nilai naik terus dan dapat diekstrapolasi.'],
    ['TP: Menganalisis data grafik'],
    ['TINGKAT KOGNITIF: C5']
  ]
  const paragraphs = sample.flat().map(text => {
    if (!text) return `<w:p/>`
    return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
  }).join('')
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W_NS}><w:body>${paragraphs}<w:sectPr/></w:body></w:document>`
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

  const zip = new JSZip()
  zip.file('[Content_Types].xml', contentTypes)
  zip.file('_rels/.rels', rootRels)
  zip.file('word/document.xml', document)
  return new Blob([await zip.generateAsync({ type: 'arraybuffer' })], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

export async function downloadTemplate() {
  const url = URL.createObjectURL(await buildTemplateDocx())
  const a = document.createElement('a')
  a.href = url; a.download = 'template-smart-hots.docx'; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
