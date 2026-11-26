import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import type { LearningAnalytic, Question, Subject, Topic } from '../types'

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadJson(data: unknown, filename = 'smart-hots-export.json') {
  saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename)
}

function questionRows(questions: Question[], subjects: Subject[], topics: Topic[]) {
  return questions.map(q => ({
    'Kode': q.code,
    'Mata Pelajaran': subjects.find(s => s.id === q.subjectId)?.name || q.subjectId,
    'Materi': topics.find(t => t.id === q.topicId)?.name || q.topicId,
    'Submateri': q.subTopic,
    'Semester': q.semester,
    'CP': q.cp,
    'TP': q.tp,
    'Indikator': q.indicator,
    'Kognitif': q.cognitive,
    'Kesulitan': q.difficulty,
    'Jenis': q.type === 'single' ? 'Pilihan Ganda' : 'Multiple Response',
    'Status': q.status,
    'Stimulus': q.stimulus,
    'Pertanyaan': q.prompt,
    'A': q.options[0]?.text || '', 'B': q.options[1]?.text || '', 'C': q.options[2]?.text || '',
    'D': q.options[3]?.text || '', 'E': q.options[4]?.text || '',
    'Kunci': q.options.filter(o => o.isCorrect).map(o => o.label).join(', '),
    'Pembahasan': q.explanation,
    'Kompetensi': q.competency,
    'Miskonsepsi': q.misconception,
    'Rekomendasi': q.recommendation
  }))
}

export function exportQuestionsExcel(questions: Question[], subjects: Subject[], topics: Topic[]) {
  const ws = XLSX.utils.json_to_sheet(questionRows(questions, subjects, topics))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Bank Soal')
  XLSX.writeFile(wb, 'bank-soal-smart-hots.xlsx')
}

export function exportQuestionsCsv(questions: Question[], subjects: Subject[], topics: Topic[]) {
  const ws = XLSX.utils.json_to_sheet(questionRows(questions, subjects, topics))
  saveBlob(new Blob([XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv;charset=utf-8' }), 'bank-soal-smart-hots.csv')
}

const esc = (s: string) => s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!))
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

export async function exportQuestionsDocx(questions: Question[], includeAnswer: boolean) {
  const lines: string[] = []
  questions.forEach((q, i) => {
    lines.push(`SOAL ${i + 1} (${q.code})`)
    if (q.stimulus) lines.push(q.stimulus)
    lines.push(q.prompt)
    q.options.forEach(o => lines.push(`${o.label}. ${o.text}`))
    if (includeAnswer) {
      lines.push(`KUNCI: ${q.options.filter(o => o.isCorrect).map(o => o.label).join(', ')}`)
      lines.push(`PEMBAHASAN: ${q.explanation}`)
    }
    lines.push('')
  })
  const paragraphs = lines.map(l => l ? `<w:p><w:r><w:t xml:space="preserve">${esc(l)}</w:t></w:r></w:p>` : '<w:p/>').join('')
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>${paragraphs}<w:sectPr/></w:body></w:document>`
  const types = `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
  const rels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
  const zip = new JSZip()
  zip.file('[Content_Types].xml', types); zip.file('_rels/.rels', rels); zip.file('word/document.xml', doc)
  saveBlob(new Blob([await zip.generateAsync({ type: 'arraybuffer' })], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    includeAnswer ? 'soal-dan-pembahasan.docx' : 'soal-tanpa-kunci.docx')
}

export function printQuestions(questions: Question[], includeAnswer: boolean) {
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Cetak Soal SMART HOTS</title>
<style>body{font-family:Arial,sans-serif;font-size:12px;line-height:1.5;padding:24px}.q{page-break-inside:avoid;margin-bottom:22px}.opt{margin-left:18px}.answer{background:#f0fdfa;padding:8px;border-left:3px solid #0d9488}</style></head><body>
<h2>SMART HOTS – Bank Soal</h2>
${questions.map((q, i) => `<div class="q"><strong>${i + 1}. ${esc(q.code)}</strong> — ${esc(q.indicator)}<p>${esc(q.stimulus)}</p><p><strong>${esc(q.prompt)}</strong></p>${q.options.map(o => `<div class="opt">${o.label}. ${esc(o.text)}</div>`).join('')}${includeAnswer ? `<div class="answer"><strong>Kunci:</strong> ${q.options.filter(o => o.isCorrect).map(o => o.label).join(', ')}<br><strong>Pembahasan:</strong> ${esc(q.explanation)}</div>` : ''}</div>`).join('')}
</body></html>`
  const w = window.open('', '_blank')
  if (!w) { alert('Izinkan popup untuk mencetak.'); return }
  w.document.write(html); w.document.close(); w.focus(); w.print()
}

export function downloadPdfReport(title: string, lines: string[], filename = 'laporan-smart-hots.pdf') {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  pdf.setFontSize(16); pdf.text(title, 14, 18)
  pdf.setFontSize(10)
  let y = 28
  lines.forEach(line => {
    const wrapped = pdf.splitTextToSize(line.replace(/[^\x20-\x7E]/g, m => m), 180) as string[]
    wrapped.forEach(part => {
      if (y > 280) { pdf.addPage(); y = 18 }
      pdf.text(part, 14, y); y += 5
    })
  })
  pdf.save(filename)
}

export function analyticsLines(a: LearningAnalytic) {
  return [
    `Skor: ${a.score}`,
    'Ringkasan penguasaan:',
    ...a.findings.filter(f => f.type === 'materi').map(f => `${f.label}: ${f.percentage}% (${f.category})`),
    'Pola kesalahan (dugaan diagnostik):',
    ...(a.errorPatterns.length ? a.errorPatterns : ['Tidak ada kesalahan tercatat.']),
    'Rekomendasi:',
    ...a.recommendations
  ]
}
