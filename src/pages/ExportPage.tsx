import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, FileDown, Printer } from 'lucide-react'
import { db } from '../db/db'
import { Button, Card, Field } from '../components/ui'
import { downloadJson, exportQuestionsCsv, exportQuestionsDocx, exportQuestionsExcel, printQuestions } from '../lib/export'
import { downloadTemplate } from '../lib/docx'

export default function ExportPage() {
  const questions = useLiveQuery(() => db.questions.toArray(), []) || []
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray(), []) || []
  const topics = useLiveQuery(() => db.topics.toArray(), []) || []
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [type, setType] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const filtered = questions.filter(q => (!subject || q.subjectId === subject) && (!topic || q.topicId === topic)
    && (!type || q.type === type) && (includeInactive || q.active))

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-extrabold">Ekspor & Cetak Soal</h1><p className="text-sm text-slate-500">Ekspor bank soal ke Excel, CSV, JSON, Word, atau cetak untuk latihan offline.</p></div>
    <Card><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Mata pelajaran"><select className="input" value={subject} onChange={e => { setSubject(e.target.value); setTopic('') }}><option value="">Semua</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Materi"><select className="input" value={topic} onChange={e => setTopic(e.target.value)}><option value="">Semua</option>{topics.filter(t => !subject || t.subjectId === subject).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
      <Field label="Jenis"><select className="input" value={type} onChange={e => setType(e.target.value)}><option value="">Semua</option><option value="single">Pilihan ganda</option><option value="multiple">Multiple response</option></select></Field>
      <div className="flex items-end"><label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} className="accent-teal-700" /> Termasuk nonaktif/arsip</label></div>
    </div><div className="mt-4 text-sm font-semibold text-teal-700">{filtered.length} soal akan diekspor</div></Card>

    <Card><h2 className="mb-4 font-bold">Ekspor data</h2><div className="flex flex-wrap gap-2">
      <Button onClick={() => exportQuestionsExcel(filtered, subjects, topics)}><Download size={16} /> Excel (.xlsx)</Button>
      <Button variant="secondary" onClick={() => exportQuestionsCsv(filtered, subjects, topics)}>CSV</Button>
      <Button variant="secondary" onClick={() => downloadJson(filtered, 'bank-soal-smart-hots.json')}>JSON</Button>
      <Button variant="secondary" onClick={() => exportQuestionsDocx(filtered, true)}><FileDown size={16} /> Word + kunci</Button>
      <Button variant="secondary" onClick={() => exportQuestionsDocx(filtered, false)}>Word tanpa kunci</Button>
      <Button variant="secondary" onClick={downloadTemplate}>Template import DOCX</Button>
    </div></Card>

    <Card><h2 className="mb-4 font-bold">Cetak offline</h2><div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => printQuestions(filtered, false)}><Printer size={16} /> Cetak soal (tanpa kunci)</Button>
      <Button variant="secondary" onClick={() => printQuestions(filtered, true)}><Printer size={16} /> Cetak kunci & pembahasan</Button>
    </div><p className="mt-3 text-xs text-slate-500">Gunakan menu Cetak browser untuk menyimpan sebagai PDF atau mencetak kertas. Kunci dan pembahasan dapat dicetak terpisah dari soal.</p></Card>
  </div>
}
