import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { db, queueSync, uid } from '../db/db'
import { useAuth } from '../lib/auth'
import { Badge, Button, Card, Confirm, EmptyState, Field, Modal } from '../components/ui'
import type { Difficulty, Exercise, ExerciseSetting, QuestionType } from '../types'

const defaultSettings = (): ExerciseSetting => ({
  questionCount: 10, durationMinutes: 20, difficulties: ['mudah', 'sedang', 'sulit'], types: ['single', 'multiple'],
  shuffleQuestions: true, shuffleOptions: false, allowRetry: 2, showExplanation: 'selesai',
  partialScoring: true, wrongPenalty: 0, topicIds: []
})

export default function ExercisesPage() {
  const { user } = useAuth()
  const exercises = useLiveQuery(() => db.exercises.reverse().sortBy('createdAt').then(a => a.reverse()), []) || []
  const questions = useLiveQuery(() => db.questions.toArray(), []) || []
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray(), []) || []
  const topics = useLiveQuery(() => db.topics.toArray(), []) || []
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [open, setOpen] = useState(false)
  const [del, setDel] = useState<Exercise | null>(null)
  const [subject, setSubject] = useState(subjects[0]?.id || 'MAT')
  const [topicFilter, setTopicFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [message, setMessage] = useState('')

  function blank(): Exercise {
    return { id: uid('ex-'), title: '', subjectId: subject, teacherId: user?.id || 'teacher-1', settings: defaultSettings(), questionIds: [], active: true, createdAt: Date.now() }
  }

  const candidates = questions.filter(q => q.active && q.status === 'siap' && q.subjectId === (editing?.subjectId || subject)
    && (!topicFilter || q.topicId === topicFilter) && (!typeFilter || q.type === typeFilter)
    && (!difficultyFilter || q.difficulty === difficultyFilter))
  const selectedIds = editing?.questionIds || []

  function toggleCandidate(id: string) {
    if (!editing) return
    const ids = editing.questionIds.includes(id) ? editing.questionIds.filter(x => x !== id) : [...editing.questionIds, id]
    setEditing({ ...editing, questionIds: ids, settings: { ...editing.settings, questionCount: ids.length } })
  }
  function autoSelect() {
    if (!editing) return
    const s = editing.settings
    const pool = candidates.filter(q => (!s.topicIds.length || s.topicIds.includes(q.topicId)) && s.types.includes(q.type) && s.difficulties.includes(q.difficulty))
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, s.questionCount)
    setEditing({ ...editing, questionIds: shuffled.map(q => q.id) })
  }
  function patchSetting(p: Partial<ExerciseSetting>) {
    if (!editing) return
    setEditing({ ...editing, settings: { ...editing.settings, ...p } })
  }

  async function save() {
    if (!editing) return
    if (!editing.title.trim()) { setMessage('Judul latihan wajib diisi.'); return }
    if (!editing.questionIds.length) { setMessage('Pilih minimal satu soal.'); return }
    await db.exercises.put(editing)
    await db.exerciseQuestions.where('exerciseId').equals(editing.id).delete()
    for (const [i, qid] of editing.questionIds.entries()) {
      await db.exerciseQuestions.put({ id: uid('eq-'), exerciseId: editing.id, questionId: qid, order: i + 1 })
    }
    await queueSync('exercises', editing.id)
    setMessage('Latihan berhasil disimpan.'); setOpen(false); setEditing(null)
  }
  async function duplicate(e: Exercise) {
    const copy: Exercise = { ...structuredClone(e), id: uid('ex-'), title: `${e.title} (salinan)`, createdAt: Date.now() }
    await db.exercises.put(copy); await queueSync('exercises', copy.id); setMessage('Latihan berhasil digandakan.')
  }
  async function remove(e: Exercise) { await db.exercises.delete(e.id); await db.exerciseQuestions.where('exerciseId').equals(e.id).delete(); setMessage('Latihan dihapus.') }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-extrabold">Kelola Latihan</h1><p className="text-sm text-slate-500">Susun paket soal, durasi, acak, penilaian parsial, dan pembahasan.</p></div>
      <Button onClick={() => { setEditing(blank()); setOpen(true) }}><Plus size={16} /> Latihan baru</Button></div>
    {message && <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{message}</div>}

    {exercises.length === 0 ? <EmptyState title="Belum ada latihan" description="Buat paket latihan pertama untuk siswa." action={<Button onClick={() => { setEditing(blank()); setOpen(true) }}>Buat latihan</Button>} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{exercises.map(e => <Card key={e.id}>
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{e.title}</h3><div className="mt-1 text-xs text-slate-500">{subjects.find(s => s.id === e.subjectId)?.name} • {e.questionIds.length} soal</div></div><Badge className={e.active ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'}>{e.active ? 'Aktif' : 'Nonaktif'}</Badge></div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600"><Badge className="bg-blue-50 text-blue-700">{e.settings.durationMinutes} menit</Badge><Badge className="bg-violet-50 text-violet-700">{e.settings.types.join(' + ')}</Badge><Badge className="bg-amber-50 text-amber-700">Ulangan ×{e.settings.allowRetry}</Badge></div>
      <div className="mt-4 flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => { setEditing(structuredClone(e)); setOpen(true) }}><Pencil size={15} /> Edit</Button><button className="rounded-xl p-2 hover:bg-slate-100" onClick={() => duplicate(e)}><Copy size={16} /></button><button className="rounded-xl p-2 text-rose-600 hover:bg-rose-50" onClick={() => setDel(e)}><Trash2 size={16} /></button></div>
    </Card>)}</div>}

    <Modal open={open} onClose={() => setOpen(false)} title={editing?.title ? `Edit latihan: ${editing.title}` : 'Latihan baru'} wide>
      {editing && <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3"><Field label="Judul latihan" hint=""><input className="input" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} /></Field>
          <Field label="Mata pelajaran"><select className="input" value={editing.subjectId} onChange={e => setEditing({ ...editing, subjectId: e.target.value, questionIds: [] })}>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Status"><select className="input" value={editing.active ? 'aktif' : 'nonaktif'} onChange={e => setEditing({ ...editing, active: e.target.value === 'aktif' })}><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select></Field></div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Field label="Jumlah soal"><input type="number" min={1} max={100} className="input" value={editing.settings.questionCount} onChange={e => patchSetting({ questionCount: Number(e.target.value) })} /></Field>
          <Field label="Durasi (menit)"><input type="number" min={1} className="input" value={editing.settings.durationMinutes} onChange={e => patchSetting({ durationMinutes: Number(e.target.value) })} /></Field>
          <Field label="Kesempatan"><input type="number" min={1} className="input" value={editing.settings.allowRetry} onChange={e => patchSetting({ allowRetry: Number(e.target.value) })} /></Field>
          <Field label="Pembahasan"><select className="input" value={editing.settings.showExplanation} onChange={e => patchSetting({ showExplanation: e.target.value as ExerciseSetting['showExplanation'] })}><option value="selesai">Setelah selesai</option><option value="langsung">Langsung per soal</option></select></Field>
          <Field label="Penalti jawaban salah"><select className="input" value={editing.settings.wrongPenalty} onChange={e => patchSetting({ wrongPenalty: Number(e.target.value) })}><option value={0}>Tidak ada</option><option value={0.25}>25%</option><option value={0.5}>50%</option></select></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Jenis soal"><div className="flex flex-wrap gap-3 pt-1">{(['single', 'multiple'] as QuestionType[]).map(t => <label key={t} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={editing.settings.types.includes(t)} onChange={() => patchSetting({ types: editing.settings.types.includes(t) ? editing.settings.types.filter(x => x !== t) : [...editing.settings.types, t] })} className="accent-teal-700" />{t === 'single' ? 'Pilihan ganda' : 'Multiple response'}</label>)}</div></Field>
          <Field label="Kesulitan"><div className="flex flex-wrap gap-3 pt-1">{(['mudah', 'sedang', 'sulit'] as Difficulty[]).map(t => <label key={t} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={editing.settings.difficulties.includes(t)} onChange={() => patchSetting({ difficulties: editing.settings.difficulties.includes(t) ? editing.settings.difficulties.filter(x => x !== t) : [...editing.settings.difficulties, t] })} className="accent-teal-700" />{t}</label>)}</div></Field>
        </div>
        <div className="flex flex-wrap gap-4 rounded-xl bg-slate-50 p-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={editing.settings.shuffleQuestions} onChange={e => patchSetting({ shuffleQuestions: e.target.checked })} className="accent-teal-700" /> Acak urutan soal</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={editing.settings.shuffleOptions} onChange={e => patchSetting({ shuffleOptions: e.target.checked })} className="accent-teal-700" /> Acak pilihan jawaban</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={editing.settings.partialScoring} onChange={e => patchSetting({ partialScoring: e.target.checked })} className="accent-teal-700" /> Nilai parsial multiple response</label>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <select className="input" value={topicFilter} onChange={e => setTopicFilter(e.target.value)}><option value="">Semua materi</option>{topics.filter(t => t.subjectId === editing.subjectId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="">Semua jenis</option><option value="single">PG</option><option value="multiple">MR</option></select>
          <select className="input" value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)}><option value="">Semua kesulitan</option><option value="mudah">Mudah</option><option value="sedang">Sedang</option><option value="sulit">Sulit</option></select>
          <Button variant="secondary" onClick={autoSelect}>Pilih otomatis {editing.settings.questionCount} soal</Button>
        </div>
        <div className="max-h-64 overflow-y-auto rounded-xl border p-3">{candidates.length ? <div className="grid gap-2 sm:grid-cols-2">{candidates.map(q => <label key={q.id} className="flex items-start gap-2 rounded-lg p-2 text-xs hover:bg-slate-50"><input type="checkbox" checked={selectedIds.includes(q.id)} onChange={() => toggleCandidate(q.id)} className="mt-0.5 accent-teal-700" /><span><b>{q.code}</b> — {q.prompt.slice(0, 80)}…<span className="block text-slate-400">{q.type === 'single' ? 'PG' : 'MR'} • {q.difficulty} • {q.cognitive}</span></span></label>)}</div> : <p className="text-sm text-slate-500">Tidak ada soal siap pakai sesuai filter.</p>}</div>
        <div className="text-sm font-semibold text-teal-700">{selectedIds.length} soal dipilih</div>
        <div className="flex justify-end gap-2 border-t pt-4"><Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button><Button onClick={save}>Simpan latihan</Button></div>
      </div>}
    </Modal>
    <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && remove(del)} message={`Hapus latihan "${del?.title}"? Riwayat siswa tetap tersimpan.`} />
  </div>
}
