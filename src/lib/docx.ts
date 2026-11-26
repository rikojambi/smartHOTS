import JSZip from 'jszip'
import { uid } from '../db/db'
import type { CognitiveLevel, Difficulty, ParsedQuestion, QuestionType } from '../types'
import { buildQuestionTemplateDocx, downloadQuestionTemplate } from './docxTemplate'

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const M = 'http://schemas.openxmlformats.org/officeDocument/2006/math'
const V = 'urn:schemas-microsoft-com:vml'

export type DocxProgress = (percent: number, label: string) => void

export interface DocxMetadata {
  subject: string
  topic: string
  semester: string
  className: string
}

export interface DocxImageRef {
  id: string
  relId: string
  name: string
  blob: Blob
}

export interface DocxTableCell {
  text: string
  html: string
  images: DocxImageRef[]
}

export interface DocxBlock {
  kind: 'paragraph' | 'table' | 'image'
  text: string
  html?: string
  blob?: Blob
  name?: string
  images: DocxImageRef[]
  cells?: DocxTableCell[]
}

export interface DocxAnalysis {
  paragraphs: number
  tables: number
  images: number
  equations: number
}

export interface DocxParseResult {
  metadata: DocxMetadata
  blocks: DocxBlock[]
  questions: ParsedQuestion[]
  errors: string[]
  warnings: string[]
  analysis: DocxAnalysis
}

function escapeHtml(value: string) {
  return value.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!))
}

function parseXml(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (Array.from(doc.getElementsByTagName('*')).some(el => el.localName === 'parsererror')) {
    throw new Error('XML dokumen tidak valid.')
  }
  return doc
}

function mimeFor(name: string) {
  const ext = name.toLowerCase().split('.').pop() || ''
  const map: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml', emf: 'image/x-emf'
  }
  return map[ext] || 'image/png'
}

function findMedia(zip: JSZip, target: string) {
  let clean = target
  try { clean = decodeURIComponent(target) } catch { /* keep original */ }
  clean = clean.replace(/^\/+/, '').replace(/^(\.\.\/)+/, '')
  const candidates = clean.startsWith('word/') ? [clean] : [clean, `word/${clean}`]
  for (const path of candidates) {
    const file = zip.file(path)
    if (file) return { path, file }
  }
  return null
}

async function readRelations(zip: JSZip, report: DocxProgress): Promise<Record<string, string>> {
  report(10, 'Membaca relasi dokumen…')
  const file = zip.file('word/_rels/document.xml.rels')
  if (!file) return {}
  const doc = parseXml(await file.async('string'))
  const map: Record<string, string> = {}
  for (const el of Array.from(doc.getElementsByTagNameNS('*', 'Relationship'))) {
    const id = el.getAttribute('Id') || ''
    const target = el.getAttribute('Target') || ''
    if (id) map[id] = target
  }
  return map
}

function mathChild(node: Element, name: string) {
  return Array.from(node.children).find(child => child.namespaceURI === M && child.localName === name)
}

function mathText(node: Element): string {
  const local = node.localName
  if (local === 'r') {
    return Array.from(node.getElementsByTagNameNS(M, 't')).map(t => t.textContent || '').join('')
  }
  if (local === 't') return node.textContent || ''
  if (local === 'f') {
    const num = mathChild(node, 'num')
    const den = mathChild(node, 'den')
    return `\\frac{${num ? mathText(num) : ''}}{${den ? mathText(den) : ''}}`
  }
  if (local === 'rad') {
    const deg = mathChild(node, 'deg')
    const base = mathChild(node, 'e')
    const inner = base ? mathText(base) : ''
    return deg ? `\\sqrt[${mathText(deg)}]{${inner}}` : `\\sqrt{${inner}}`
  }
  if (local === 'sSup') {
    const base = mathChild(node, 'e')
    const sup = mathChild(node, 'sup')
    return `${base ? mathText(base) : ''}^{${sup ? mathText(sup) : ''}}`
  }
  if (local === 'sSub') {
    const base = mathChild(node, 'e')
    const sub = mathChild(node, 'sub')
    return `${base ? mathText(base) : ''}_{${sub ? mathText(sub) : ''}}`
  }
  if (local === 'sSubSup') {
    const base = mathChild(node, 'e')
    const sub = mathChild(node, 'sub')
    const sup = mathChild(node, 'sup')
    return `${base ? mathText(base) : ''}_{${sub ? mathText(sub) : ''}}^{${sup ? mathText(sup) : ''}}`
  }
  if (local === 'd') {
    const base = mathChild(node, 'e')
    return `(${base ? mathText(base) : ''})`
  }
  if (local === 'nary') {
    const chr = mathChild(node, 'chr')?.textContent?.trim() || '∑'
    const sub = mathChild(node, 'sub')
    const sup = mathChild(node, 'sup')
    const base = mathChild(node, 'e')
    return `${chr}${sub ? `_{${mathText(sub)}}` : ''}${sup ? `^{${mathText(sup)}}` : ''} ${base ? mathText(base) : ''}`.trim()
  }
  if (local === 'func') {
    const name = mathChild(node, 'fName')
    const base = mathChild(node, 'e')
    return `${name ? mathText(name) : ''}${base ? mathText(base) : ''}`
  }
  return Array.from(node.childNodes)
    .map(child => child.nodeType === 1 ? mathText(child as Element) : '')
    .join('')
}

function latexify(value: string) {
  return value
    .replace(/×/g, '\\times').replace(/÷/g, '\\div').replace(/[−–]/g, '-')
    .replace(/π/g, '\\pi').replace(/≤/g, '\\leq').replace(/≥/g, '\\geq')
    .replace(/°/g, '^\\circ').replace(/\s+/g, ' ').trim()
}

function convertMath(node: Element, counter: { count: number }) {
  counter.count += 1
  const inner = latexify(mathText(node))
  return inner ? `$${inner}$` : ''
}

/** Read a paragraph/cell in document order, wrapping only inline OMML math in $...$. */
function richTextFromElement(el: Element, counter: { count: number }): string {
  let out = ''
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType !== 1) continue
    const child = node as Element
    if (child.namespaceURI === M && (child.localName === 'oMath' || child.localName === 'oMathPara')) {
      const nested = child.localName === 'oMathPara' ? Array.from(child.getElementsByTagNameNS(M, 'oMath')) : []
      if (nested.length) {
        for (const item of nested) out += convertMath(item, counter)
      } else {
        out += convertMath(child, counter)
      }
    } else if ((child.namespaceURI === W || child.namespaceURI === M) && child.localName === 't') {
      out += child.textContent || ''
    } else if (child.namespaceURI === W && child.localName === 'tab') {
      out += ' '
    } else if (child.namespaceURI === W && child.localName === 'br') {
      out += '\n'
    } else if (child.namespaceURI !== V) {
      out += richTextFromElement(child, counter)
    }
  }
  return out
}

async function readDocument(zip: JSZip, report: DocxProgress, errors: string[]): Promise<{ blocks: DocxBlock[]; analysis: DocxAnalysis }> {
  const docFile = zip.file('word/document.xml')
  if (!docFile) throw new Error('File DOCX tidak memiliki word/document.xml.')
  report(14, 'Membaca word/document.xml…')
  const doc = parseXml(await docFile.async('string'))
  const body = doc.getElementsByTagNameNS(W, 'body')[0]
  if (!body) throw new Error('Struktur dokumen Word tidak dikenali.')
  const rels = await readRelations(zip, report)

  const totalImages = doc.getElementsByTagNameNS(A, 'blip').length + doc.getElementsByTagNameNS(V, 'imagedata').length
  let imageIndex = 0
  const mathCounter = { count: 0 }
  const analysis: DocxAnalysis = { paragraphs: 0, tables: 0, images: 0, equations: 0 }

  async function imagesIn(el: Element): Promise<DocxImageRef[]> {
    const found: Element[] = [
      ...Array.from(el.getElementsByTagNameNS(A, 'blip')),
      ...Array.from(el.getElementsByTagNameNS(V, 'imagedata'))
    ]
    const result: DocxImageRef[] = []
    for (const node of found) {
      const relId = node.getAttributeNS(R, 'embed') || node.getAttributeNS(R, 'link') ||
        node.getAttributeNS(R, 'id') || node.getAttribute('r:embed') ||
        node.getAttribute('r:link') || node.getAttribute('r:id') || ''
      if (!relId || /^https?:/i.test(relId)) continue
      const target = rels[relId]
      if (!target) { errors.push(`Relasi gambar "${relId}" tidak ditemukan.`); continue }
      if (/^https?:/i.test(target)) continue
      const media = findMedia(zip, target)
      if (!media) { errors.push(`Berkas gambar "${target}" tidak ditemukan.`); continue }
      imageIndex += 1
      analysis.images += 1
      report(20 + Math.round((imageIndex / Math.max(1, totalImages)) * 50), `Mengekstrak gambar ${imageIndex} dari ${totalImages}…`)
      let blob = await media.file.async('blob')
      if (!blob.type) blob = new Blob([blob], { type: mimeFor(media.path) })
      result.push({ id: uid('img-'), relId, name: media.path.split('/').pop() || 'gambar', blob })
    }
    return result
  }

  const blocks: DocxBlock[] = []
  for (const child of Array.from(body.children)) {
    if (child.namespaceURI !== W) continue
    if (child.localName === 'p') {
      analysis.paragraphs += 1
      const text = richTextFromElement(child, mathCounter).trim()
      const images = await imagesIn(child)
      if (text || images.length) {
        blocks.push({
          kind: images.length && !text ? 'image' : 'paragraph',
          text, images,
          blob: images[0]?.blob, name: images[0]?.name
        })
      }
    } else if (child.localName === 'tbl') {
      analysis.tables += 1
      const cells: DocxTableCell[] = []
      const rowsHtml: string[] = []
      for (const tr of Array.from(child.children)) {
        if (tr.namespaceURI !== W || tr.localName !== 'tr') continue
        const cellHtml: string[] = []
        for (const tc of Array.from(tr.children)) {
          if (tc.namespaceURI !== W || tc.localName !== 'tc') continue
          const text = richTextFromElement(tc, mathCounter).trim()
          const html = `<td>${escapeHtml(text).replace(/\n/g, '<br/>')}</td>`
          const images = await imagesIn(tc)
          cells.push({ text, html, images })
          cellHtml.push(html)
        }
        if (cellHtml.length) rowsHtml.push(`<tr>${cellHtml.join('')}</tr>`)
      }
      const html = `<table>${rowsHtml.join('')}</table>`
      const text = cells.map(cell => cell.text).join('\n')
      const images = cells.flatMap(cell => cell.images)
      blocks.push({ kind: 'table', text, html, images, cells })
    }
  }
  analysis.equations = mathCounter.count
  report(70, 'Struktur dokumen berhasil dibaca.')
  return { blocks, analysis }
}

type MarkerKey = 'MATA PELAJARAN' | 'MATERI' | 'SEMESTER' | 'KELAS' | 'JENIS' | 'PERTANYAAN' |
  'STIMULUS' | 'TINGKAT KESULITAN' | 'TINGKAT KOGNITIF' | 'TINGKAT' | 'KUNCI' |
  'PEMBAHASAN' | 'INDIKATOR' | 'TP' | 'KOMPETENSI' | 'MISKONSEPSI' | 'REKOMENDASI' | 'SEMANTIK'

interface Marker { key: MarkerKey; value: string }

const MARKERS: { key: MarkerKey; pattern: RegExp }[] = [
  { key: 'MATA PELAJARAN', pattern: /^MATA\s+PELAJARAN\s*:?\s*(.*)$/i },
  { key: 'MATA PELAJARAN', pattern: /^MAPEL\s*:?\s*(.*)$/i },
  { key: 'MATERI', pattern: /^MATERI\s*:?\s*(.*)$/i },
  { key: 'SEMESTER', pattern: /^SEMESTER\s*:?\s*(.*)$/i },
  { key: 'KELAS', pattern: /^KELAS\s*:?\s*(.*)$/i },
  { key: 'JENIS', pattern: /^JENIS\s*(?:SOAL)?\s*:?\s*(.*)$/i },
  { key: 'PERTANYAAN', pattern: /^PERTANYAAN\s*:?\s*(.*)$/i },
  { key: 'STIMULUS', pattern: /^STIMULUS\s*:?\s*(.*)$/i },
  { key: 'TINGKAT KESULITAN', pattern: /^TINGKAT\s+KESULITAN\s*:?\s*(.*)$/i },
  { key: 'TINGKAT KOGNITIF', pattern: /^TINGKAT\s+KOGNITIF\s*:?\s*(.*)$/i },
  { key: 'TINGKAT KOGNITIF', pattern: /^LEVEL\s*(?:KOGNITIF)?\s*:?\s*(.*)$/i },
  { key: 'TINGKAT', pattern: /^TINGKAT\s*:?\s*(.*)$/i },
  { key: 'KUNCI', pattern: /^KUNCI\s+JAWABAN\s*:?\s*(.*)$/i },
  { key: 'KUNCI', pattern: /^KUNCI\s*:?\s*(.*)$/i },
  { key: 'KUNCI', pattern: /^JAWABAN\s*:?\s*(.*)$/i },
  { key: 'PEMBAHASAN', pattern: /^PEMBAHASAN\s*:?\s*(.*)$/i },
  { key: 'INDIKATOR', pattern: /^INDIKATOR\s*:?\s*(.*)$/i },
  { key: 'KOMPETENSI', pattern: /^KOMPETENSI\s*:?\s*(.*)$/i },
  { key: 'MISKONSEPSI', pattern: /^MISKONSEPSI\s*:?\s*(.*)$/i },
  { key: 'REKOMENDASI', pattern: /^REKOMENDASI\s*:?\s*(.*)$/i },
  { key: 'SEMANTIK', pattern: /^SEMANTIK\s*:?\s*(.*)$/i },
  { key: 'TP', pattern: /^TP\s*:?\s*(.*)$/i }
]

const START = /^(?:SOAL|QUESTION)\s*(\d+)?\s*:?\s*(.*)$/i
const OPTION = /^([A-E])\s*[.):]\s*(.*)$/i

function parseMarker(line: string): Marker | null {
  for (const item of MARKERS) {
    const match = item.pattern.exec(line)
    if (match) return { key: item.key, value: match[1].trim() }
  }
  return null
}

function parseType(value: string): QuestionType {
  return /MULTIPLE|LEBIH|MR\b|MULTI/i.test(value.toUpperCase()) ? 'multiple' : 'single'
}

function parseCognitive(value: string): CognitiveLevel | undefined {
  return value.toUpperCase().match(/C[4-6]/)?.[0] as CognitiveLevel | undefined
}

function parseDifficulty(value: string): Difficulty {
  if (/MUDAH|EASY|RENDAH/i.test(value)) return 'mudah'
  if (/SULIT|HARD|TINGGI/i.test(value)) return 'sulit'
  return 'sedang'
}

function parseKeys(value: string) {
  const upper = value.toUpperCase()
  const labels = Array.from(new Set(upper.match(/[A-E]/g) || []))
  const invalid = upper.split(/[,;\s]+/).map(part => part.trim()).filter(part => part && !/^[A-E]$/.test(part))
  return { labels, invalid }
}

function countMath(text: string) {
  return (text.match(/\$[^$]+\$/g) || []).length
}

function append(base: string, line: string) {
  return base ? `${base}\n${line}` : line
}

interface Pending {
  type?: QuestionType
  cognitive?: CognitiveLevel
  difficulty?: Difficulty
  tp?: string
  indicator?: string
}

type Mode = 'none' | 'stem' | 'stimulus' | 'explanation' | 'indicator' | 'tp' |
  'competency' | 'misconception' | 'recommendation'

function groupBlocks(blocks: DocxBlock[], errors: string[]) {
  const questions: ParsedQuestion[] = []
  const warnings: string[] = []
  const metadata: DocxMetadata = { subject: '', topic: '', semester: '', className: '' }
  const imageNames = new Map<string, string>()
  const attached = new Set<string>()
  const ignored = new Set<string>()
  for (const block of blocks) {
    for (const image of block.images) imageNames.set(image.id, image.name)
  }

  let current: ParsedQuestion | null = null
  let pending: Pending = {}
  let mode: Mode = 'stem'
  let lastNumber = 0
  let lastOptionLabel: string | null = null

  function warn(question: ParsedQuestion | null, message: string) {
    if (question) {
      question.warnings.push(message)
      warnings.push(`Soal ${question.number}: ${message}`)
    } else {
      warnings.push(message)
    }
  }

  function attach(images: DocxImageRef[], location: 'stimulus' | 'option', optionLabel?: string) {
    if (!current) {
      for (const image of images) {
        ignored.add(image.id)
        warn(null, `Gambar "${image.name}" ditemukan sebelum SOAL pertama dan tidak dilampirkan.`)
      }
      return
    }
    for (const image of images) {
      current.images.push({ id: image.id, name: image.name, blob: image.blob, location, optionLabel })
      attached.add(image.id)
    }
  }

  function finish() {
    const question = current
    if (!question) return
    if (question.tableHtml) {
      question.stimulus = !question.stimulus ? question.tableHtml
        : question.stimulus.includes('<table') ? question.stimulus : `${question.stimulus}\n${question.tableHtml}`
    }
    if (!question.prompt.trim()) warn(question, 'Pertanyaan kosong.')
    if (question.options.length < 2) warn(question, 'Pilihan jawaban kurang dari dua.')
    if (!question.answer.length) warn(question, 'Kunci jawaban tidak ditemukan.')
    const wrongKeys = question.answer.filter(label => !question.options.some(option => option.label === label))
    if (wrongKeys.length) warn(question, `Kunci ${wrongKeys.join(', ')} tidak memiliki pilihan sesuai.`)
    if (question.type === 'single' && question.answer.length > 1) warn(question, 'Pilihan ganda memiliki lebih dari satu kunci.')
    if (question.type === 'multiple' && question.answer.length < 2) warn(question, 'Multiple response hanya memiliki satu kunci.')
    const duplicateLabels = Array.from(new Set(question.options.map(option => option.label).filter((label, index, all) => all.indexOf(label) !== index)))
    if (duplicateLabels.length) warn(question, `Pilihan dengan label ganda: ${duplicateLabels.join(', ')}.`)
    for (const image of question.images) {
      if (image.location === 'option' && image.optionLabel && !question.options.some(option => option.label === image.optionLabel)) {
        warn(question, `Gambar pada pilihan ${image.optionLabel} tidak memiliki pilihan sesuai.`)
      }
    }
    questions.push(question)
    current = null
    mode = 'stem'
    lastOptionLabel = null
  }

  function handleMarker(marker: Marker, images: DocxImageRef[]) {
    const question = current!
    const value = marker.value
    question.equationCount = (question.equationCount || 0) + countMath(value)
    switch (marker.key) {
      case 'JENIS':
        question.type = parseType(value)
        mode = 'none'
        break
      case 'PERTANYAAN':
        if (value) question.prompt = append(question.prompt, value)
        mode = 'stem'
        break
      case 'STIMULUS':
        if (value) question.stimulus = append(question.stimulus, value)
        mode = 'stimulus'
        break
      case 'KUNCI': {
        const keys = parseKeys(value)
        if (keys.invalid.length) warn(question, `Token kunci ${keys.invalid.join(', ')} tidak dikenali.`)
        question.answer = keys.labels
        mode = 'none'
        break
      }
      case 'PEMBAHASAN':
        question.explanation = append(question.explanation, value)
        mode = 'explanation'
        break
      case 'INDIKATOR':
        question.indicator = append(question.indicator || '', value)
        mode = 'indicator'
        break
      case 'TP':
        question.tp = append(question.tp, value)
        mode = 'tp'
        break
      case 'KOMPETENSI':
        question.competency = append(question.competency || '', value)
        mode = 'competency'
        break
      case 'MISKONSEPSI':
        question.misconception = append(question.misconception || '', value)
        mode = 'misconception'
        break
      case 'REKOMENDASI':
        question.recommendation = append(question.recommendation || '', value)
        mode = 'recommendation'
        break
      case 'SEMANTIK': {
        const semantic = (['konsep', 'penerapan', 'analisis'] as const).find(item => value.toLowerCase().includes(item))
        if (semantic) question.semantic = semantic
        else warn(question, `Nilai SEMANTIK "${value}" tidak dikenali.`)
        mode = 'none'
        break
      }
      case 'TINGKAT KESULITAN':
        question.difficulty = parseDifficulty(value)
        mode = 'none'
        break
      case 'TINGKAT KOGNITIF': {
        const cognitive = parseCognitive(value)
        if (cognitive) question.cognitive = cognitive
        else warn(question, `Tingkat kognitif "${value}" tidak dikenali; digunakan C4.`)
        mode = 'none'
        break
      }
      case 'TINGKAT': {
        const cognitive = parseCognitive(value)
        if (cognitive) question.cognitive = cognitive
        else question.difficulty = parseDifficulty(value)
        mode = 'none'
        break
      }
      case 'MATA PELAJARAN':
        if (!metadata.subject) metadata.subject = value
        mode = 'none'
        break
      case 'MATERI':
        if (!metadata.topic) metadata.topic = value
        mode = 'none'
        break
      case 'SEMESTER':
        if (!metadata.semester) metadata.semester = value
        mode = 'none'
        break
      case 'KELAS':
        if (!metadata.className) metadata.className = value
        mode = 'none'
        break
    }
    if (images.length) attach(images, 'stimulus')
  }

  function processLine(line: string, images: DocxImageRef[]) {
    const trimmed = line.trim()
    if (!trimmed && !images.length) return

    const start = START.exec(trimmed)
    if (start) {
      finish()
      const number = start[1] ? Number(start[1]) : lastNumber + 1
      if (!Number.isFinite(number) || number < 1) errors.push(`Nomor soal "${start[1] || ''}" tidak valid.`)
      if (lastNumber && number !== lastNumber + 1) errors.push(`Nomor soal ${number} tidak berurutan setelah ${lastNumber}.`)
      lastNumber = number
      const pre = pending
      pending = {}
      const trailing = start[2]?.trim() || ''
      current = {
        tempId: uid('tmp-'), number, type: pre.type || 'single',
        stimulus: '', prompt: trailing, options: [], answer: [], explanation: '', tp: '',
        indicator: pre.indicator || '', competency: '', misconception: '', recommendation: '',
        semantic: undefined, tableHtml: '',
        equationCount: countMath(trailing),
        cognitive: pre.cognitive || 'C4', difficulty: pre.difficulty || 'sedang',
        images: [], warnings: []
      }
      mode = 'stem'
      lastOptionLabel = null
      attach(images, 'stimulus')
      return
    }

    const marker = parseMarker(trimmed)
    // Legacy documents put JENIS before SOAL; an answered question marks the boundary.
    if (marker?.key === 'JENIS' && current && current.answer.length) {
      finish()
      pending.type = parseType(marker.value)
      attach(images, 'stimulus')
      return
    }

    if (!current) {
      if (marker) {
        if (marker.key === 'MATA PELAJARAN') metadata.subject = marker.value
        else if (marker.key === 'MATERI') metadata.topic = marker.value
        else if (marker.key === 'SEMESTER') metadata.semester = marker.value
        else if (marker.key === 'KELAS') metadata.className = marker.value
        else if (marker.key === 'JENIS') pending.type = parseType(marker.value)
        else if (marker.key === 'TP') pending.tp = marker.value
        else if (marker.key === 'INDIKATOR') pending.indicator = marker.value
        else if (marker.key === 'TINGKAT KESULITAN') pending.difficulty = parseDifficulty(marker.value)
        else if (marker.key === 'TINGKAT KOGNITIF' || marker.key === 'TINGKAT') {
          const cognitive = parseCognitive(marker.value)
          if (cognitive) pending.cognitive = cognitive
          else if (marker.key === 'TINGKAT') pending.difficulty = parseDifficulty(marker.value)
        }
      } else if (trimmed && !/^PETUNJUK\b/i.test(trimmed)) {
        warnings.push(`Teks sebelum SOAL pertama diabaikan: "${trimmed.slice(0, 80)}"`)
      }
      if (images.length) attach(images, 'stimulus')
      return
    }

    if (marker) {
      handleMarker(marker, images)
      return
    }

    const option = OPTION.exec(trimmed)
    if (option) {
      const label = option[1].toUpperCase()
      if (current.options.some(item => item.label === label)) warn(current, `Pilihan ${label} duplikat; yang pertama digunakan.`)
      else current.options.push({ label, text: option[2].trim(), mediaId: images[0]?.id })
      if (images.length) attach(images, 'option', label)
      mode = 'none'
      lastOptionLabel = label
      return
    }

    current.equationCount = (current.equationCount || 0) + countMath(trimmed)
    if (!trimmed && images.length) {
      if (lastOptionLabel) attach(images, 'option', lastOptionLabel)
      else attach(images, 'stimulus')
      return
    }

    if (mode === 'explanation') current.explanation = append(current.explanation, trimmed)
    else if (mode === 'indicator') current.indicator = append(current.indicator || '', trimmed)
    else if (mode === 'tp') current.tp = append(current.tp, trimmed)
    else if (mode === 'competency') current.competency = append(current.competency || '', trimmed)
    else if (mode === 'misconception') current.misconception = append(current.misconception || '', trimmed)
    else if (mode === 'recommendation') current.recommendation = append(current.recommendation || '', trimmed)
    else if (mode === 'stimulus') current.stimulus = append(current.stimulus, trimmed)
    else {
      const stemText = append(current.prompt, trimmed)
      if (!current.stimulus && /\?$/.test(trimmed) && current.prompt.trim()) {
        const parts = stemText.split('\n')
        current.prompt = parts.pop() || ''
        current.stimulus = parts.join('\n')
      } else {
        current.prompt = stemText
      }
    }
    if (images.length) attach(images, 'stimulus')
    if (trimmed) lastOptionLabel = null
  }

  for (const block of blocks) {
    if (block.kind === 'table' && block.cells) {
      const hasMarkers = block.cells.some(cell => cell.text.split('\n').some(line =>
        START.test(line) || !!parseMarker(line) || OPTION.test(line)))
      if (hasMarkers) {
        for (const cell of block.cells) {
          for (const line of cell.text.split('\n')) processLine(line, cell.images)
          if (!cell.text.trim() && cell.images.length) processLine('', cell.images)
        }
        continue
      }
      const active = current as ParsedQuestion | null
      if (active) {
        active.tableHtml = append(active.tableHtml || '', block.html || '')
        active.equationCount = (active.equationCount || 0) + countMath(block.text)
        attach(block.images, 'stimulus')
      } else {
        errors.push('Tabel ditemukan sebelum SOAL pertama; tabel diabaikan.')
        for (const image of block.images) ignored.add(image.id)
      }
      continue
    }
    processLine(block.text, block.images)
  }
  finish()

  for (const [id, name] of imageNames) {
    if (!attached.has(id) && !ignored.has(id)) warnings.push(`Gambar "${name}" tidak dapat dilampirkan ke soal mana pun.`)
  }
  if (!questions.length) errors.push('Tidak ada soal yang terdeteksi. Gunakan format "SOAL 1:" pada template.')
  if (questions.length >= 4 && new Set(questions.map(question => question.type)).size === 1) {
    warnings.push('Semua soal terdeteksi sebagai satu jenis. Pastikan JENIS: MULTIPLE RESPONSE digunakan bila ada.')
  }
  return { questions, warnings, metadata }
}

/**
 * Parse a DOCX into structured blocks, questions, media, metadata and a diagnostics report.
 * `onProgress` reports 0-100 with a human-readable stage label.
 */
export async function parseDocx(file: File, onProgress: DocxProgress = () => {}): Promise<DocxParseResult> {
  const report = (percent: number, label: string) => {
    try { onProgress(Math.max(0, Math.min(100, Math.round(percent))), label) } catch { /* ignore UI callback errors */ }
  }
  report(2, 'Membuka berkas DOCX…')
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch (error) {
    throw new Error(`Gagal membaca DOCX: ${error instanceof Error ? error.message : String(error)}`)
  }
  const errors: string[] = []
  report(6, 'Membaca struktur dokumen…')
  const { blocks, analysis } = await readDocument(zip, report, errors)
  report(76, 'Mengurai penanda soal…')
  const grouped = groupBlocks(blocks, errors)
  report(96, 'Menyusun hasil akhir…')
  return {
    metadata: grouped.metadata,
    blocks,
    questions: grouped.questions,
    errors,
    warnings: grouped.warnings,
    analysis
  }
}

/** Backward-compatible helpers (the official templates live in docxTemplate). */
export async function buildTemplateDocx(): Promise<Blob> {
  return buildQuestionTemplateDocx(true)
}

export function downloadTemplate() {
  downloadQuestionTemplate(true)
}
