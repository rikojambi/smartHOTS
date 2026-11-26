import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Copy, Download, FileDown, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { db, queueSync, uid } from '../db/db'
import { Badge, Button, Card, Confirm, EmptyState, Field, Modal } from '../components/ui'
import QuestionEditor from '../components/QuestionEditor'
import { downloadTemplate } from '../lib/docx'
import { exportQuestionsCsv, exportQuestionsExcel, exportQuestionsDocx, printQuestions } from '../lib/export'
import type { Question, QuestionStatus } from '../types'

const statusLabel: Record<QuestionStatus, string> = { draft: 'Draft', perlu_diperiksa: 'Perlu diperiksa', siap: 'Siap digunakan', diarsipkan: 'Diarsipkan' }
const statusClass: Record<QuestionStatus, string> = {
  draft: 'bg-slate-100 text-slate-700', perlu_diperiksa: 'bg-amber-100 text-amber-700',
  siap: 'bg-teal-100 text-teal-700', diarsipkan: 'bg-rose-100 text-rose-700'
}

export default function QuestionBank() {
  const questions = useLiveQuery(() => db.questions.orderBy('code').toArray(), []) || []
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray(), []) || []
  const topics = useLiveQuery(() => db.topics.toArray(), []) || []
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [type, setType] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [status, setStatus] = useState('')
  const [limit, setLimit] = useState(50)
  const [editing, setEditing] = useState<Question | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [deleting, setDeleting] = useState<Question | null>(null)
  const [moving, setMoving] = useState<Question | null>(null)
  const [moveTarget, setMoveTarget] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [message, setMessage] = useState('')

  const duplicateCodes = useMemo(() => {
    const map = new Map<string, string[]>()
    questions.forEach(q => {
      const key = `${q.stimulus}\n${q.prompt}`.trim().toLowerCase().replace(/\s+/g, ' ')
      map.set(key, [...(map.get(key) || []), q.code])
    })
    return [...map.values()].filter(v => v.length > 1).flat()
  }, [questions])

  const filtered = questions.filter(q => {
    const text = `${q.code} ${q.prompt} ${q.stimulus} ${q.indicator} ${q.subTopic}`.toLowerCase()
    return (!search || text.includes(search.toLowerCase())) &&
      (!subject || q.subjectId === subject) && (!topic || q.topicId === topic) &&
      (!type || q.type === type) && (!difficulty || q.difficulty === difficulty) &&
      (!status || q.status === status)
  })
  const shown = filtered.slice(0, limit)
  const selectedQuestions = questions.filter(q => selected.includes(q.id))

  async function toggle(q: Question, field: 'active' | 'status') {
    const patch: Partial<Question> = field === 'active' ? { active: !q.active } : { status: q.status === 'diarsipkan' ? 'siap' : 'diarsipkan' }
    await db.questions.update(q.id, patch); await queueSync('questions', q.id)
  }
  async function duplicate(q: Question) {
    const now = Date.now()
    const copy: Question = { ...structuredClone(q), id: uid('q-'), code: `${q.code}-SALIN-${now.toString(36).slice(-4).toUpperCase()}`, version: 1, createdAt: now, updatedAt: now, status: 'draft' }
    await db.questions.put(copy); await queueSync('questions', copy.id)
    setMessage(`Soal ${q.code} berhasil digandakan.`)
  }
  async function remove(q: Question) {
    await db.questions.delete(q.id)
    await db.questionMedia.where('questionId').equals(q.id).delete()
    await queueSync('questions', q.id, 'delete')
    setMessage(`Soal ${q.code} dihapus.`)
  }
  async function doMove() {
    if (!moving || !moveTarget) return
    const target = topics.find(t => t.id === moveTarget)
    if (!target) return
    await db.questionRevisions.put({
      id: uid('rev-'), questionId: moving.id, version: moving.version, snapshot: moving,
      changedBy: 'guru', changedAt: Date.now(), note: `Dipindahkan ke ${target.name}`
    })
    await db.questions.update(moving.id, {
      topicId: target.id,
      subjectId: target.subjectId,
      category: target.category,
      semester: target.semester,
      cp: target.cp,
      tp: target.tp.join('; '),
      version: moving.version + 1,
      updatedAt: Date.now()
    })
    await queueSync('questions', moving.id)
    setMessage(`Soal ${moving.code} dipindahkan ke ${target.name}. CP dan TP disesuaikan.`)
    setMoving(null)
  }
  function toggleSelect(id: string) { setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]) }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold">Bank Soal</h1><p className="text-sm text-slate-500">{questions.length} soal • {questions.filter(q => q.type === 'single').length} pilihan ganda • {questions.filter(q => q.type === 'multiple').length} multiple response</p></div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={downloadTemplate}><FileDown size={16} /> Template Word</Button>
        <Link to="/import"><Button variant="secondary">Import DOCX</Button></Link>
        <Button onClick={() => { setEditing(null); setEditorOpen(true) }}><Plus size={16} /> Soal baru</Button>
      </div>
    </div>

    {message && <div className="rounded-xl bg-teal-50 px-4 py-2 text-sm text-teal-800">{message}</div>}
    {duplicateCodes.length > 0 && <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Terdeteksi {duplicateCodes.length} soal dengan pertanyaan identik: {duplicateCodes.slice(0, 8).join(', ')}.</div>}

    <Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input className="input pl-9" placeholder="Cari kode, teks, indikator…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="input" value={subject} onChange={e => { setSubject(e.target.value); setTopic('') }}><option value="">Semua mapel</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <select className="input" value={topic} onChange={e => setTopic(e.target.value)}><option value="">Semua materi</option>{topics.filter(t => !subject || t.subjectId === subject).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <select className="input" value={type} onChange={e => setType(e.target.value)}><option value="">Semua jenis</option><option value="single">Pilihan ganda</option><option value="multiple">Multiple response</option></select>
        <div className="grid grid-cols-2 gap-2"><select className="input" value={difficulty} onChange={e => setDifficulty(e.target.value)}><option value="">Semua tingkat</option><option value="mudah">Mudah</option><option value="sedang">Sedang</option><option value="sulit">Sulit</option></select><select className="input" value={status} onChange={e => setStatus(e.target.value)}><option value="">Semua status</option>{Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      </div>
      {selected.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-teal-50 p-3 text-sm">
        <span className="font-semibold text-teal-800">{selected.length} soal dipilih</span>
        <Button variant="secondary" onClick={() => exportQuestionsExcel(selectedQuestions, subjects, topics)}><Download size={15} /> Excel</Button>
        <Button variant="secondary" onClick={() => exportQuestionsCsv(selectedQuestions, subjects, topics)}>CSV</Button>
        <Button variant="secondary" onClick={() => exportQuestionsDocx(selectedQuestions, true)}>Word + kunci</Button>
        <Button variant="secondary" onClick={() => printQuestions(selectedQuestions, false)}>Cetak soal</Button>
        <Button variant="secondary" onClick={() => printQuestions(selectedQuestions, true)}>Cetak kunci</Button>
        <button className="text-slate-500" onClick={() => setSelected([])}>kosongkan</button>
      </div>}
    </Card>

    {filtered.length === 0 ? <EmptyState title="Tidak ada soal yang cocok" description="Ubah filter atau tambahkan soal baru." action={<Button onClick={() => { setEditing(null); setEditorOpen(true) }}>Tambah soal</Button>} /> : <Card className="overflow-x-auto">
      <table className="table"><thead><tr><th></th><th>Kode</th><th>Soal</th><th>Materi</th><th>Jenis</th><th>Kognitif</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>{shown.map(q => <tr key={q.id} className={!q.active ? 'opacity-50' : ''}>
          <td><input type="checkbox" checked={selected.includes(q.id)} onChange={() => toggleSelect(q.id)} className="accent-teal-700" /></td>
          <td className="whitespace-nowrap font-semibold">{q.code}{duplicateCodes.includes(q.code) && <div className="text-[10px] text-amber-600">kemungkinan duplikat</div>}</td>
          <td className="max-w-md"><div className="line-clamp-2">{q.prompt}</div><div className="mt-1 text-xs text-slate-400">{subjects.find(s => s.id === q.subjectId)?.name} • {q.subTopic}</div></td>
          <td className="whitespace-nowrap text-xs">{topics.find(t => t.id === q.topicId)?.name || '-'}</td>
          <td><Badge className={q.type === 'single' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}>{q.type === 'single' ? 'PG' : 'MR'}</Badge></td>
          <td><Badge className="bg-slate-100">{q.cognitive}</Badge></td>
          <td><Badge className={statusClass[q.status]}>{statusLabel[q.status]}</Badge></td>
          <td><div className="flex gap-1">
            <button title="Edit" className="rounded-lg p-2 hover:bg-slate-100" onClick={() => { setEditing(q); setEditorOpen(true) }}><Pencil size={15} /></button>
            <button title="Gandakan" className="rounded-lg p-2 hover:bg-slate-100" onClick={() => duplicate(q)}><Copy size={15} /></button>
            <button title="Aktif/nonaktif" className="rounded-lg px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50" onClick={() => toggle(q, 'active')}>{q.active ? 'Nonaktif' : 'Aktif'}</button>
            <button title="Pindah materi" className="rounded-lg px-2 py-1 text-xs hover:bg-slate-100" onClick={() => { setMoving(q); setMoveTarget(q.topicId) }}>Pindah</button>
            <button title="Arsipkan" className="rounded-lg px-2 py-1 text-xs hover:bg-amber-50" onClick={() => toggle(q, 'status')}>{q.status === 'diarsipkan' ? 'Aktifkan' : 'Arsip'}</button>
            <button title="Hapus" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" onClick={() => setDeleting(q)}><Trash2 size={15} /></button>
          </div></td>
        </tr>)}</tbody></table>
      {filtered.length > shown.length && <div className="p-4 text-center"><Button variant="secondary" onClick={() => setLimit(l => l + 50)}>Tampilkan 50 soal berikutnya</Button></div>}
    </Card>}

    <QuestionEditor open={editorOpen} question={editing} onClose={() => setEditorOpen(false)} onSaved={() => setMessage('Soal berhasil disimpan.')}
      defaultSubject={subject || subjects[0]?.id} defaultTopic={topic || topics[0]?.id} />
    <Confirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove(deleting)} message={`Hapus soal ${deleting?.code}? Tindakan ini tidak dapat dibatalkan.`} />
    <Modal open={!!moving} onClose={() => setMoving(null)} title={`Pindahkan ${moving?.code} ke materi lain`}>
      <Field label="Materi tujuan"><select className="input" value={moveTarget} onChange={e => setMoveTarget(e.target.value)}>{topics.map(t => <option key={t.id} value={t.id}>{subjects.find(s => s.id === t.subjectId)?.name} — {t.name}</option>)}</select></Field>
      <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setMoving(null)}>Batal</Button><Button onClick={doMove}>Pindahkan</Button></div>
    </Modal>
  </div>
}
