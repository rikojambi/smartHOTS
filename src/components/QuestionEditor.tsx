import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { History, ImagePlus, Trash2 } from 'lucide-react'
import { db, queueSync, uid } from '../db/db'
import { useAuth } from '../lib/auth'
import type { CognitiveLevel, Difficulty, Question, QuestionOption, QuestionStatus } from '../types'
import { Badge, Button, Field, Modal } from './ui'
import { MediaView, RichText } from './RichText'

const labels = ['A', 'B', 'C', 'D', 'E']

function blankQuestion(subjectId: string, topicId: string): Question {
  const now = Date.now()
  return {
    id: uid('q-'), code: `Q-${now.toString(36).toUpperCase()}`, subjectId, topicId, subTopic: '',
    semester: 1, cp: '', tp: '', indicator: '', cognitive: 'C4', difficulty: 'sedang',
    type: 'single', status: 'draft', active: true, stimulus: '', prompt: '',
    options: labels.map(label => ({ id: uid('opt-'), label, text: '', isCorrect: false, reason: '' })),
    explanation: '', competency: '', misconception: '', recommendation: '',
    teacherId: 'teacher-1', version: 1, createdAt: now, updatedAt: now
  }
}

export default function QuestionEditor({ question, open, onClose, onSaved, defaultSubject, defaultTopic }: {
  question: Question | null; open: boolean; onClose: () => void; onSaved?: () => void
  defaultSubject?: string; defaultTopic?: string
}) {
  const { user } = useAuth()
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray(), []) || []
  const topics = useLiveQuery(() => db.topics.orderBy('order').toArray(), []) || []
  const [draft, setDraft] = useState<Question>(() => question ? structuredClone(question) : blankQuestion(defaultSubject || subjects[0]?.id || 'MAT', defaultTopic || topics[0]?.id || ''))
  const [error, setError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const revisions = useLiveQuery(() => historyOpen && question ? db.questionRevisions.where('questionId').equals(question.id).reverse().sortBy('changedAt') : [], [historyOpen, question?.id]) || []

  useEffect(() => {
    if (open) {
      setDraft(question ? structuredClone(question) : blankQuestion(defaultSubject || subjects[0]?.id || 'MAT', defaultTopic || topics[0]?.id || ''))
      setError('')
    }
  }, [open, question?.id, defaultSubject, defaultTopic])

  const patch = (p: Partial<Question>) => setDraft(d => ({ ...d, ...p }))
  const patchOption = (id: string, p: Partial<QuestionOption>) => patch({ options: draft.options.map(o => o.id === id ? { ...o, ...p } : o) })

  function setCorrect(label: string) {
    const options = draft.options.map(o => ({
      ...o,
      isCorrect: draft.type === 'single' ? o.label === label : o.label === label ? !o.isCorrect : o.isCorrect
    }))
    patch({ options })
  }

  async function upload(file: File, location: 'stimulus' | 'option', optionLabel?: string) {
    if (!file.type.startsWith('image/')) { setError('File harus berupa gambar.'); return }
    const id = uid('media-')
    await db.questionMedia.put({ id, name: file.name, mime: file.type, blob: file, questionId: draft.id, location, createdAt: Date.now() })
    if (location === 'stimulus') patch({ stimulusMediaId: id })
    else patch({ options: draft.options.map(o => o.label === optionLabel ? { ...o, mediaId: id } : o) })
  }

  async function save() {
    setError('')
    if (!draft.prompt.trim()) { setError('Pertanyaan wajib diisi.'); return }
    if (!draft.topicId) { setError('Materi wajib dipilih.'); return }
    const filled = draft.options.filter(o => o.text.trim())
    if (filled.length < 2) { setError('Minimal dua pilihan jawaban harus diisi.'); return }
    const correct = draft.options.filter(o => o.isCorrect && o.text.trim())
    if (draft.type === 'single' && correct.length !== 1) { setError('Pilihan ganda harus memiliki tepat satu kunci.'); return }
    if (draft.type === 'multiple' && correct.length < 2) { setError('Multiple response harus memiliki minimal dua kunci.'); return }
    if (!draft.explanation.trim()) { setError('Pembahasan wajib diisi.'); return }
    if (!draft.cp.trim() || !draft.tp.trim() || !draft.indicator.trim()) { setError('CP, TP, dan indikator wajib diisi.'); return }
    const final: Question = {
      ...draft,
      cp: draft.cp.trim() || topics.find(t => t.id === draft.topicId)?.cp || '',
      tp: draft.tp.trim() || topics.find(t => t.id === draft.topicId)?.tp.join('; ') || '',
      options: draft.options.map(o => ({ ...o, reason: o.reason.trim() || (o.isCorrect ? 'Sesuai dengan penalaran pembahasan.' : 'Tidak sesuai dengan hubungan atau data pada stimulus.') })),
      teacherId: user?.role === 'teacher' ? user.id : draft.teacherId,
      version: question ? question.version + 1 : 1,
      updatedAt: Date.now()
    }
    if (question) {
      await db.questionRevisions.put({ id: uid('rev-'), questionId: question.id, version: question.version, snapshot: question, changedBy: user?.name || 'guru', changedAt: Date.now(), note: 'Perubahan melalui editor soal' })
    }
    await db.questions.put(final)
    await queueSync('questions', final.id)
    onSaved?.(); onClose()
  }

  const topicOptions = topics.filter(t => !draft.subjectId || t.subjectId === draft.subjectId)

  return <Modal open={open} onClose={onClose} title={question ? `Edit soal ${question.code} (v${question.version})` : 'Soal baru'} wide>
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Kode soal"><input className="input" value={draft.code} onChange={e => patch({ code: e.target.value })} /></Field>
        <Field label="Mata pelajaran"><select className="input" value={draft.subjectId} onChange={e => {
          const sid = e.target.value; const firstTopic = topics.find(t => t.subjectId === sid)
          patch({ subjectId: sid, topicId: firstTopic?.id || '' })
        }}>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Materi"><select className="input" value={draft.topicId} onChange={e => patch({ topicId: e.target.value })}><option value="">Pilih materi</option>{topicOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <Field label="Submateri"><input className="input" value={draft.subTopic} onChange={e => patch({ subTopic: e.target.value })} placeholder="mis. Deret geometri" /></Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Kategori"><input className="input" value={draft.category || ''} onChange={e => patch({ category: e.target.value })} placeholder="opsional" /></Field>
        <Field label="Semester"><select className="input" value={draft.semester} onChange={e => patch({ semester: Number(e.target.value) })}><option value={1}>1</option><option value={2}>2</option></select></Field>
        <Field label="Jenis soal"><select className="input" value={draft.type} onChange={e => patch({ type: e.target.value as Question['type'], options: draft.options.map((o, i) => ({ ...o, isCorrect: e.target.value === 'single' ? i === 0 : o.isCorrect })) })}><option value="single">Pilihan ganda</option><option value="multiple">Multiple response</option></select></Field>
        <Field label="Status"><select className="input" value={draft.status} onChange={e => patch({ status: e.target.value as QuestionStatus })}><option value="draft">Draft</option><option value="perlu_diperiksa">Perlu diperiksa</option><option value="siap">Siap digunakan</option><option value="diarsipkan">Diarsipkan</option></select></Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Tingkat kognitif"><select className="input" value={draft.cognitive} onChange={e => patch({ cognitive: e.target.value as CognitiveLevel })}><option>C4</option><option>C5</option><option>C6</option></select></Field>
        <Field label="Kesulitan"><select className="input" value={draft.difficulty} onChange={e => patch({ difficulty: e.target.value as Difficulty })}><option value="mudah">Mudah</option><option value="sedang">Sedang</option><option value="sulit">Sulit</option></select></Field>
        <div className="flex items-end"><label className="flex cursor-pointer items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={draft.active} onChange={e => patch({ active: e.target.checked })} className="h-4 w-4 accent-teal-700" /> Soal aktif</label></div>
      </div>

      <Field label="Capaian Pembelajaran (CP)" hint="Dapat memakai LaTeX dengan $...$"><textarea className="input min-h-[72px]" value={draft.cp} onChange={e => patch({ cp: e.target.value })} /></Field>
      <Field label="Tujuan Pembelajaran (TP)"><textarea className="input min-h-[72px]" value={draft.tp} onChange={e => patch({ tp: e.target.value })} /></Field>
      <Field label="Indikator soal"><textarea className="input min-h-[72px]" value={draft.indicator} onChange={e => patch({ indicator: e.target.value })} /></Field>

      <div className="grid gap-4 lg:grid-cols-2">
        <div><Field label="Stimulus / konteks"><textarea className="input min-h-[140px]" value={draft.stimulus} onChange={e => patch({ stimulus: e.target.value })} placeholder="Teks, tabel, atau konteks soal. Gunakan $x^2$ untuk persamaan." /></Field>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-teal-700"><ImagePlus size={16} /> Tambah gambar stimulus<input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0], 'stimulus')} /></label>
          {draft.stimulusMediaId && <div className="mt-2 flex items-start gap-2"><MediaView mediaId={draft.stimulusMediaId} className="max-h-40 rounded-lg border" /><button className="text-rose-600" onClick={() => patch({ stimulusMediaId: undefined })}><Trash2 size={16} /></button></div>}
        </div>
        <div><Field label="Pertanyaan"><textarea className="input min-h-[140px]" value={draft.prompt} onChange={e => patch({ prompt: e.target.value })} /></Field>
          <div className="mt-3 rounded-xl border bg-slate-50 p-3"><div className="mb-1 text-xs font-semibold uppercase text-slate-400">Pratinjau</div><RichText text={`${draft.stimulus}\n\n${draft.prompt}`} className="text-sm" /><MediaView mediaId={draft.stimulusMediaId} className="mt-3 max-h-32" /></div>
        </div>
      </div>

      <div><div className="mb-2 flex items-center justify-between"><h4 className="font-bold">Pilihan jawaban</h4><span className="text-xs text-slate-500">Centang kunci. Isi alasan setiap pilihan agar pembahasan lengkap.</span></div>
        <div className="space-y-3">{draft.options.map(o => <div key={o.id} className="rounded-xl border p-3">
          <div className="flex items-start gap-3">
            <label className="mt-2 flex items-center gap-1 font-bold text-slate-500"><input type={draft.type === 'single' ? 'radio' : 'checkbox'} name="correct" checked={o.isCorrect} onChange={() => setCorrect(o.label)} className="h-4 w-4 accent-teal-700" />{o.label}</label>
            <div className="flex-1"><input className="input" value={o.text} onChange={e => patchOption(o.id, { text: e.target.value })} placeholder={`Teks pilihan ${o.label}`} />
              <input className="input mt-2 text-xs" value={o.reason} onChange={e => patchOption(o.id, { reason: e.target.value })} placeholder={`Alasan mengapa ${o.label} benar/salah`} />
              <label className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs text-teal-700"><ImagePlus size={14} /> Gambar pada pilihan<input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0], 'option', o.label)} /></label>
              {o.mediaId && <div className="mt-2 flex items-start gap-2"><MediaView mediaId={o.mediaId} className="max-h-28 rounded-lg border" /><button className="text-rose-600" onClick={() => patchOption(o.id, { mediaId: undefined })}><Trash2 size={14} /></button></div>}
            </div>
          </div>
        </div>)}</div>
      </div>

      <Field label="Pembahasan lengkap"><textarea className="input min-h-[100px]" value={draft.explanation} onChange={e => patch({ explanation: e.target.value })} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Kompetensi yang diukur"><textarea className="input min-h-[80px]" value={draft.competency} onChange={e => patch({ competency: e.target.value })} /></Field>
        <Field label="Miskonsepsi possible"><textarea className="input min-h-[80px]" value={draft.misconception} onChange={e => patch({ misconception: e.target.value })} /></Field>
        <Field label="Rekomendasi penguatan"><textarea className="input min-h-[80px]" value={draft.recommendation} onChange={e => patch({ recommendation: e.target.value })} /></Field>
      </div>

      {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="flex gap-2">{question && <Button variant="secondary" onClick={() => setHistoryOpen(true)}><History size={16} /> Riwayat ({revisions.length})</Button>}<Badge className="bg-slate-100">Versi {draft.version}</Badge></div>
        <div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={save}>Simpan soal</Button></div>
      </div>
    </div>

    <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Riwayat perubahan soal">
      <div className="space-y-3">{revisions.length ? revisions.map(r => <div key={r.id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between"><b>Versi {r.version}</b><span className="text-xs text-slate-400">{new Date(r.changedAt).toLocaleString('id-ID')}</span></div><div className="mt-1 text-slate-600">{r.note} — {r.changedBy}</div><div className="mt-1 text-xs text-slate-400">{r.snapshot.prompt.slice(0, 100)}…</div></div>) : <p className="text-sm text-slate-500">Belum ada perubahan.</p>}</div>
    </Modal>
  </Modal>
}
