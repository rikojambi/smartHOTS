import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ClipboardList, Play, Sparkles } from 'lucide-react'
import { db } from '../db/db'
import { useAuth } from '../lib/auth'
import { indicatorKeyOf } from '../lib/competency'
import {
  assignPlan, createEnrichmentPlan, generateRemedialPlans, levelLabel,
  statusLabel, stopPlan, updatePlan
} from '../lib/remedial'
import { Badge, Button, Card, Confirm, EmptyState, Field, Modal, ProgressBar, StatCard } from '../components/ui'
import type { RemedialLevel, RemedialPlan, RemedialStatus } from '../types'

type GenerateResult = Awaited<ReturnType<typeof generateRemedialPlans>>
type Feedback = { title: string; messages: string[]; insufficient: GenerateResult['insufficient']; tone: 'ok' | 'warn' }

const dateInput = (value: number) => new Date(value).toISOString().slice(0, 10)

function statusClass(status: RemedialStatus) {
  switch (status) {
    case 'disarankan': return 'bg-amber-100 text-amber-800'
    case 'disetujui': return 'bg-blue-100 text-blue-800'
    case 'ditugaskan': return 'bg-indigo-100 text-indigo-800'
    case 'berjalan': return 'bg-teal-100 text-teal-800'
    case 'tuntas': return 'bg-emerald-100 text-emerald-800'
    case 'pengayaan': return 'bg-purple-100 text-purple-800'
    default: return 'bg-slate-100 text-slate-600'
  }
}

export default function RemedialPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const handoffStudent = searchParams.get('student') || ''
  const handoffIndicator = searchParams.get('indicator') || ''
  const { teacher, user } = useAuth()
  const plans = useLiveQuery(() => db.remedialPlans.toArray(), []) || []
  const students = useLiveQuery(() => db.students.toArray(), []) || []
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || []
  const attempts = useLiveQuery(() => db.studentAttempts.toArray(), []) || []
  const evidence = useLiveQuery(() => db.skillEvidence.toArray(), []) || []
  const questions = useLiveQuery(() => db.questions.toArray(), []) || []

  const [studentFilter, setStudentFilter] = useState(handoffStudent)
  const [indicatorFilter, setIndicatorFilter] = useState(handoffIndicator)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [busy, setBusy] = useState(false)

  const [assignTarget, setAssignTarget] = useState<RemedialPlan | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [editTarget, setEditTarget] = useState<RemedialPlan | null>(null)
  const [editLevel, setEditLevel] = useState('1')
  const [editMaterials, setEditMaterials] = useState('')
  const [editQuestionIds, setEditQuestionIds] = useState<string[]>([])
  const [evidenceTarget, setEvidenceTarget] = useState<RemedialPlan | null>(null)
  const [stopTarget, setStopTarget] = useState<RemedialPlan | null>(null)

  useEffect(() => {
    if (handoffStudent) setStudentFilter(handoffStudent)
    if (handoffIndicator) setIndicatorFilter(handoffIndicator)
  }, [handoffStudent, handoffIndicator])

  function clearHandoff() {
    setIndicatorFilter('')
    setSearchParams({}, { replace: true })
  }

  const filtered = useMemo(() => plans.filter(plan => {
    if (studentFilter && plan.studentId !== studentFilter) return false
    if (indicatorFilter && plan.indicatorKey !== indicatorFilter) return false
    if (subjectFilter && plan.subjectId !== subjectFilter) return false
    if (statusFilter && plan.status !== statusFilter) return false
    if (levelFilter && plan.level !== Number(levelFilter)) return false
    if (fromDate && plan.createdAt < new Date(`${fromDate}T00:00:00`).getTime()) return false
    if (toDate && plan.createdAt > new Date(`${toDate}T23:59:59`).getTime()) return false
    return true
  }).sort((a, b) => b.createdAt - a.createdAt),
  [plans, studentFilter, indicatorFilter, subjectFilter, statusFilter, levelFilter, fromDate, toDate])

  const stats = {
    needing: filtered.filter(plan => plan.status === 'disarankan' || plan.status === 'disetujui').length,
    running: filtered.filter(plan => plan.status === 'ditugaskan' || plan.status === 'berjalan').length,
    completed: filtered.filter(plan => plan.status === 'tuntas').length,
    enrichment: filtered.filter(plan => plan.status === 'pengayaan').length,
    warnings: feedback?.tone === 'warn' ? feedback.messages.length + feedback.insufficient.length : 0
  }

  const nameOf = (studentId: string) => students.find(student => student.id === studentId)?.name || 'Siswa tidak ditemukan'
  const subjectOf = (subjectId: string) => subjects.find(subject => subject.id === subjectId)?.name || '-'
  const runningAttempt = (planId: string) => attempts
    .filter(attempt => attempt.remedialPlanId === planId && attempt.status === 'berjalan')
    .sort((a, b) => b.startedAt - a.startedAt)[0]
  const progressOf = (plan: RemedialPlan) => {
    if (plan.status === 'tuntas') return 100
    const attempt = runningAttempt(plan.id)
    if (!attempt || !attempt.answers.length) return 0
    return Math.round(attempt.answers.filter(answer => answer.selected.length).length / attempt.answers.length * 100)
  }

  const editCandidates = useMemo(() => {
    if (!editTarget) return []
    const available = questions.filter(question => question.active !== false
      && question.status !== 'diarsipkan' && question.subjectId === editTarget.subjectId)
    const exact = available.filter(question => indicatorKeyOf(question) === editTarget.indicatorKey)
    return exact.length ? exact : available
  }, [questions, editTarget])

  const visibleEvidence = useMemo(() => evidence
    .filter(row => !!evidenceTarget && row.studentId === evidenceTarget.studentId && row.indicatorKey === evidenceTarget.indicatorKey)
    .sort((a, b) => b.createdAt - a.createdAt), [evidence, evidenceTarget])

  const handoffLabel = handoffIndicator
    ? evidence.find(row => row.indicatorKey === handoffIndicator)?.indicator
      || plans.find(plan => plan.indicatorKey === handoffIndicator)?.indicator
      || handoffIndicator
    : ''

  async function generate() {
    const targets = studentFilter ? [studentFilter]
      : students.filter(student => !subjectFilter || student.subjectIds.includes(subjectFilter)).map(student => student.id)
    if (!targets.length) {
      setFeedback({ title: 'Pilih cakupan terlebih dahulu', messages: ['Tidak ada siswa yang cocok dengan filter yang dipilih.'], insufficient: [], tone: 'warn' })
      return
    }
    setBusy(true)
    try {
      const messages: string[] = []
      const insufficient: GenerateResult['insufficient'] = []
      let created = 0
      for (const id of targets) {
        const result = await generateRemedialPlans(id, {
          subjectId: subjectFilter || undefined,
          indicatorKey: indicatorFilter || undefined
        })
        created += result.plans.length
        messages.push(...result.warnings.map(text => `${nameOf(id)}: ${text}`))
        insufficient.push(...result.insufficient)
      }
      const hasWarnings = messages.length > 0
      setFeedback({
        title: `Rekomendasi dibuat: ${created} rencana`,
        messages: hasWarnings ? messages : ['Pemeriksaan selesai. Tidak ada peringatan; indikator lemah sudah memiliki rencana aktif atau datanya mencukupi.'],
        insufficient,
        tone: insufficient.length || hasWarnings ? 'warn' : 'ok'
      })
    } catch (error) {
      setFeedback({ title: 'Gagal membuat rekomendasi', messages: [error instanceof Error ? error.message : String(error)], insufficient: [], tone: 'warn' })
    } finally {
      setBusy(false)
    }
  }

  async function saveAssign() {
    if (!assignTarget) return
    setBusy(true)
    try {
      const teacherId = teacher?.id || user?.id || 'sistem'
      await assignPlan(assignTarget.id, teacherId, dueDate ? new Date(`${dueDate}T23:59:59`).getTime() : undefined)
      if (assignNote.trim()) await updatePlan(assignTarget.id, { teacherNote: assignNote.trim() })
      setFeedback({ title: 'Rencana ditugaskan', messages: [`${nameOf(assignTarget.studentId)} telah menerima tugas remedial.`], insufficient: [], tone: 'ok' })
      setAssignTarget(null)
    } catch (error) {
      setFeedback({ title: 'Gagal menugaskan', messages: [error instanceof Error ? error.message : String(error)], insufficient: [], tone: 'warn' })
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit() {
    if (!editTarget) return
    setBusy(true)
    try {
      await updatePlan(editTarget.id, {
        level: Number(editLevel) as RemedialLevel,
        materials: editMaterials.split('\n'),
        questionIds: editQuestionIds
      })
      setFeedback({ title: 'Rencana diperbarui', messages: [['Level', 'Materi', 'Soal'].join(' dan ') + ' berhasil disimpan.'], insufficient: [], tone: 'ok' })
      setEditTarget(null)
    } catch (error) {
      setFeedback({ title: 'Gagal menyimpan perubahan', messages: [error instanceof Error ? error.message : String(error)], insufficient: [], tone: 'warn' })
    } finally {
      setBusy(false)
    }
  }

  async function startEnrichment(plan: RemedialPlan) {
    setBusy(true)
    try {
      const created = await createEnrichmentPlan(plan.id)
      setFeedback({ title: 'Rencana pengayaan dibuat', messages: [`Rencana pengayaan untuk ${nameOf(plan.studentId)} tersimpan (${created.questionIds.length} soal).`], insufficient: [], tone: 'ok' })
    } catch (error) {
      setFeedback({ title: 'Pengayaan belum dapat dibuat', messages: [error instanceof Error ? error.message : String(error)], insufficient: [], tone: 'warn' })
    } finally {
      setBusy(false)
    }
  }

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-extrabold">Dashboard Remedial Adaptif</h1>
      <p className="text-sm text-slate-500">Rekomendasi berbasis bukti respons siswa. Setiap rencana memerlukan persetujuan dan penugasan guru.</p></div>

    {handoffIndicator && <Card className="border-teal-200 bg-teal-50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-teal-900">Dari Learning Heatmap</div>
          <div className="mt-1 text-sm text-slate-700">
            {handoffStudent ? `${nameOf(handoffStudent)} • ` : ''}{handoffLabel}
          </div>
          <p className="mt-1 text-xs text-slate-600">Daftar dan pemeriksaan rekomendasi dibatasi pada siswa dan indikator ini. Rencana tetap memerlukan persetujuan guru.</p>
        </div>
        <Button variant="secondary" onClick={clearHandoff}>Hapus konteks</Button>
      </div>
    </Card>}

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard label="Perlu remedial" value={stats.needing} sub="Disarankan / disetujui" icon={<AlertTriangle size={20} />} tone="amber" />
      <StatCard label="Sedang berjalan" value={stats.running} sub="Ditugaskan / berjalan" icon={<Play size={20} />} tone="blue" />
      <StatCard label="Tuntas" value={stats.completed} icon={<CheckCircle2 size={20} />} tone="teal" />
      <StatCard label="Pengayaan" value={stats.enrichment} icon={<Sparkles size={20} />} tone="blue" />
      <StatCard label="Peringatan" value={stats.warnings} sub="Dari pemeriksaan terakhir" icon={<AlertTriangle size={20} />} tone="rose" />
    </div>

    <Card><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <Field label="Siswa"><select className="input" value={studentFilter} onChange={event => setStudentFilter(event.target.value)}><option value="">Semua siswa</option>{students.map(student => <option key={student.id} value={student.id}>{student.name} ({student.className})</option>)}</select></Field>
      <Field label="Mata pelajaran"><select className="input" value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)}><option value="">Semua mapel</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></Field>
      <Field label="Status"><select className="input" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">Semua status</option>{(['disarankan', 'disetujui', 'ditugaskan', 'berjalan', 'tuntas', 'dihentikan', 'pengayaan'] as RemedialStatus[]).map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></Field>
      <Field label="Level"><select className="input" value={levelFilter} onChange={event => setLevelFilter(event.target.value)}><option value="">Semua level</option>{([1, 2, 3] as RemedialLevel[]).map(level => <option key={level} value={level}>{levelLabel(level)}</option>)}</select></Field>
      <Field label="Dibuat dari"><input type="date" className="input" value={fromDate} onChange={event => setFromDate(event.target.value)} /></Field>
      <Field label="Dibuat sampai"><input type="date" className="input" value={toDate} onChange={event => setToDate(event.target.value)} /></Field>
      <div className="flex items-end gap-2 lg:col-span-2">
        <Button onClick={generate} disabled={busy}><Sparkles size={16} /> {busy ? 'Memeriksa…' : 'Buat rekomendasi'}</Button>
        <Button variant="secondary" onClick={() => { setStudentFilter(''); setIndicatorFilter(''); setSubjectFilter(''); setStatusFilter(''); setLevelFilter(''); setFromDate(''); setToDate(''); setSearchParams({}, { replace: true }) }}>Reset filter</Button>
      </div>
    </div></Card>

    {feedback && <Card className={feedback.tone === 'warn' ? 'border-amber-300 bg-amber-50' : 'border-teal-200 bg-teal-50'}>
      <div className={`font-bold ${feedback.tone === 'warn' ? 'text-amber-900' : 'text-teal-900'}`}>{feedback.title}</div>
      {feedback.messages.length > 0 && <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">{feedback.messages.map((text, index) => <li key={index}>{text}</li>)}</ul>}
      {feedback.insufficient.length > 0 && <div className="mt-3 overflow-x-auto">
        <table className="table text-xs"><thead><tr><th>Indikator</th><th>Kunci indikator</th><th>Soal dibutuhkan</th><th>Tersedia</th></tr></thead>
          <tbody>{feedback.insufficient.map(item => <tr key={item.indicatorKey}><td>{item.indicator}</td><td>{item.indicatorKey}</td><td>{item.need}</td><td className="font-bold text-rose-700">{item.available}</td></tr>)}</tbody></table>
      </div>}
    </Card>}

    {!filtered.length ? <EmptyState title="Belum ada rencana remedial" description="Gunakan tombol “Buat rekomendasi” setelah bukti respons siswa tersedia." /> :
      <Card><div className="mb-3 flex items-center gap-2"><ClipboardList size={18} className="text-teal-700" /><h2 className="font-bold">Daftar rencana remedial</h2><Badge>{filtered.length}</Badge></div>
        <div className="overflow-x-auto"><table className="table">
          <thead><tr><th>Siswa</th><th>Indikator</th><th>Level</th><th>Status</th><th>Progres</th><th>Jatuh tempo</th><th>Nilai</th><th>Aksi</th></tr></thead>
          <tbody>{filtered.map(plan => {
            const attempt = runningAttempt(plan.id)
            return <tr key={plan.id}>
              <td><div className="font-semibold">{nameOf(plan.studentId)}</div><div className="text-xs text-slate-500">{subjectOf(plan.subjectId)}</div></td>
              <td className="max-w-xs"><div className="text-sm">{plan.indicator}</div><div className="text-xs text-slate-400">{plan.history.length} evaluasi • {plan.questionIds.length} soal</div></td>
              <td><Badge className="bg-slate-100 text-slate-700">{levelLabel(plan.level)}</Badge></td>
              <td><Badge className={statusClass(plan.status)}>{statusLabel(plan.status)}</Badge></td>
              <td className="w-32"><ProgressBar value={progressOf(plan)} label={attempt ? 'Pengerjaan' : plan.status === 'tuntas' ? 'Selesai' : 'Belum dimulai'} /></td>
              <td className="text-xs">{plan.dueAt ? new Date(plan.dueAt).toLocaleDateString('id-ID') : '-'}</td>
              <td className="text-xs"><div>Sebelum: <b>{plan.scoreBefore}%</b></div><div>Sesudah: <b>{plan.scoreAfter ?? '-'}{plan.scoreAfter !== undefined ? '%' : ''}</b></div></td>
              <td><div className="flex min-w-[240px] flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-teal-700">
                <button className="hover:underline disabled:opacity-40" disabled={busy} onClick={() => { setAssignTarget(plan); setDueDate(plan.dueAt ? dateInput(plan.dueAt) : ''); setAssignNote(plan.teacherNote || '') }}>Setujui / tugaskan</button>
                <button className="hover:underline" onClick={() => { setEditTarget(plan); setEditLevel(String(plan.level)); setEditMaterials(plan.materials.join('\n')); setEditQuestionIds([...plan.questionIds]) }}>Ubah rencana</button>
                <button className="hover:underline disabled:opacity-40" disabled={busy} onClick={() => startEnrichment(plan)}>Pengayaan</button>
                <button className="hover:underline" onClick={() => navigate(`/laporan-remedial/${plan.id}`)}>Laporan</button>
                <button className="hover:underline" onClick={() => setEvidenceTarget(plan)}>Bukti</button>
                <button className="text-rose-600 hover:underline" onClick={() => setStopTarget(plan)}>Hentikan</button>
              </div></td>
            </tr>
          })}</tbody>
        </table></div>
      </Card>}

    <Modal open={!!assignTarget} onClose={() => setAssignTarget(null)} title="Setujui dan tugaskan remedial">
      {assignTarget && <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3 text-sm"><div className="font-semibold">{nameOf(assignTarget.studentId)} — {assignTarget.indicator}</div><div className="text-xs text-slate-500">{levelLabel(assignTarget.level)} • {assignTarget.questionIds.length} soal</div></div>
        <Field label="Batas pengumpulan"><input type="date" className="input" value={dueDate} onChange={event => setDueDate(event.target.value)} /></Field>
        <Field label="Catatan guru" hint="Opsional; akan ditampilkan pada laporan."><textarea className="input min-h-24" value={assignNote} onChange={event => setAssignNote(event.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setAssignTarget(null)}>Batal</Button><Button onClick={saveAssign} disabled={busy}>Simpan & tugaskan</Button></div>
      </div>}
    </Modal>

    <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Ubah materi, level, dan soal" wide>
      {editTarget && <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3 text-sm"><div className="font-semibold">{nameOf(editTarget.studentId)} — {editTarget.indicator}</div><div className="text-xs text-slate-500">{editTarget.reason}</div></div>
        <Field label="Level remedial"><select className="input" value={editLevel} onChange={event => setEditLevel(event.target.value)}>{([1, 2, 3] as RemedialLevel[]).map(level => <option key={level} value={level}>{levelLabel(level)}</option>)}</select></Field>
        <Field label="Materi (satu instruksi per baris)"><textarea className="input min-h-40" value={editMaterials} onChange={event => setEditMaterials(event.target.value)} /></Field>
        <div><span className="label">Pilih soal</span>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border p-2">{editCandidates.map(question => <label key={question.id} className="flex items-start gap-2 rounded-lg p-2 text-sm hover:bg-slate-50">
            <input type="checkbox" checked={editQuestionIds.includes(question.id)} onChange={() => setEditQuestionIds(current => current.includes(question.id) ? current.filter(id => id !== question.id) : [...current, question.id])} />
            <span><b>{question.code}</b> — {question.indicator} <span className="text-xs text-slate-500">({question.cognitive}, {question.difficulty}, {question.subTopic})</span></span>
          </label>)}</div>
          <div className="mt-1 text-xs text-slate-500">{editQuestionIds.length} soal dipilih. Gunakan soal yang sudah ada; sistem tidak membuat soal otomatis.</div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditTarget(null)}>Batal</Button><Button onClick={saveEdit} disabled={busy}>Simpan perubahan</Button></div>
      </div>}
    </Modal>

    <Modal open={!!evidenceTarget} onClose={() => setEvidenceTarget(null)} title="Bukti respons indikator" wide>
      {evidenceTarget && <div className="space-y-3">
        <div className="text-sm text-slate-600">{nameOf(evidenceTarget.studentId)} • {evidenceTarget.indicator}</div>
        {!visibleEvidence.length ? <p className="text-sm text-slate-500">Belum ada bukti respons untuk indikator ini.</p> : <div className="overflow-x-auto"><table className="table text-xs">
          <thead><tr><th>Waktu</th><th>Soal</th><th>Benar</th><th>Pola kesalahan</th><th>Miskonsepsi</th><th>Nilai</th></tr></thead>
          <tbody>{visibleEvidence.map(row => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString('id-ID')}</td><td>{row.questionId.slice(-8)}<div className="text-slate-500">{row.subTopic} • {row.cognitive}</div></td>
            <td><Badge className={row.correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}>{row.correct ? 'Benar' : 'Salah'}</Badge></td>
            <td>{row.errorType || '-'}</td><td>{row.misconception || '-'}</td><td>{row.points}/{row.maxPoints}</td></tr>)}</tbody>
        </table></div>}
      </div>}
    </Modal>

    <Confirm open={!!stopTarget} onClose={() => setStopTarget(null)} onConfirm={() => { if (stopTarget) stopPlan(stopTarget.id) }} message={`Hentikan rencana remedial "${stopTarget?.indicator || ''}"? Rencana tidak dapat dilanjutkan kembali.`} />
  </div>
}
