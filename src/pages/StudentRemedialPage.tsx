import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CheckCircle2, ClipboardList, Play, Sparkles } from 'lucide-react'
import { db } from '../db/db'
import { useAuth } from '../lib/auth'
import { levelLabel, startRemedialAttempt, statusLabel } from '../lib/remedial'
import { Badge, Button, Card, EmptyState, ProgressBar } from '../components/ui'
import type { RemedialPlan, RemedialStatus } from '../types'

const ACTIVE: RemedialStatus[] = ['disetujui', 'ditugaskan', 'berjalan', 'pengayaan']

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

export default function StudentRemedialPage() {
  const navigate = useNavigate()
  const { student, ready } = useAuth()
  const plans = useLiveQuery(() => db.remedialPlans.where('studentId').equals(student?.id || '').toArray(), [student?.id]) || []
  const attempts = useLiveQuery(() => db.studentAttempts.where('studentId').equals(student?.id || '').toArray(), [student?.id]) || []
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || []
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  if (!ready) return <Card>Memuat data remedial…</Card>
  if (!student) return <EmptyState title="Data siswa belum tersedia" description="Hubungi guru atau administrator agar akun siswa terhubung dengan data siswa." />

  const active = plans.filter(plan => ACTIVE.includes(plan.status)).sort((a, b) => (b.dueAt || b.createdAt) - (a.dueAt || a.createdAt))
  const completed = plans.filter(plan => plan.status === 'tuntas' || plan.status === 'dihentikan').sort((a, b) => b.updatedAt - a.updatedAt)
  const subjectName = (id: string) => subjects.find(subject => subject.id === id)?.name || '-'
  const runningFor = (planId: string) => attempts.filter(attempt => attempt.remedialPlanId === planId && attempt.status === 'berjalan').sort((a, b) => b.startedAt - a.startedAt)[0]
  const progressOf = (plan: RemedialPlan) => {
    if (plan.status === 'tuntas') return 100
    const attempt = runningFor(plan.id)
    if (!attempt || !attempt.answers.length) return 0
    return Math.round(attempt.answers.filter(answer => answer.selected.length).length / attempt.answers.length * 100)
  }
  const nextOf = (plan: RemedialPlan) => plans
    .filter(item => item.indicatorKey === plan.indicatorKey && item.createdAt > plan.createdAt && item.status !== 'dihentikan')
    .sort((a, b) => a.createdAt - b.createdAt)[0]

  async function work(plan: RemedialPlan) {
    setBusyId(plan.id)
    setError('')
    try {
      const { attemptId } = await startRemedialAttempt(plan.id, student!.id)
      navigate(`/practice/${attemptId}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusyId(null)
    }
  }

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-extrabold">Remedial Saya</h1>
      <p className="text-sm text-slate-500">Tugas remedial dan pengayaan yang telah disetujui guru. Kerjakan sebelum batas waktu yang ditentukan.</p></div>

    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

    <h2 className="flex items-center gap-2 font-bold"><ClipboardList size={18} className="text-teal-700" /> Rencana aktif ({active.length})</h2>
    {!active.length ? <EmptyState title="Belum ada remedial aktif" description="Rencana akan muncul setelah guru menyetujui atau menugaskan remedial untukmu." /> :
      <div className="grid gap-4 lg:grid-cols-2">{active.map(plan => {
        const attempt = runningFor(plan.id)
        return <Card key={plan.id} className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><div className="flex flex-wrap gap-2"><Badge className="bg-slate-100 text-slate-700">{levelLabel(plan.level)}</Badge><Badge className={statusClass(plan.status)}>{statusLabel(plan.status)}</Badge></div>
              <h3 className="mt-2 font-bold">{plan.indicator}</h3><div className="text-xs text-slate-500">{subjectName(plan.subjectId)} • {plan.questionIds.length} soal</div></div>
            {plan.dueAt && <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800"><CalendarDays size={14} /> {new Date(plan.dueAt).toLocaleDateString('id-ID')}</div>}
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm"><b className="text-slate-700">Alasan:</b> <span className="text-slate-600">{plan.reason}</span></div>
          <div><div className="mb-1 text-sm font-bold">Materi dan langkah belajar</div><ol className="list-inside list-decimal space-y-1 text-sm text-slate-600">{plan.materials.map((text, index) => <li key={index}>{text}</li>)}</ol></div>
          {plan.teacherNote && <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"><b>Catatan guru:</b> {plan.teacherNote}</div>}
          {attempt && <ProgressBar value={progressOf(plan)} label={`Progres jawaban (${attempt.answers.filter(answer => answer.selected.length).length}/${attempt.answers.length})`} />}
          {plan.history.length > 0 && <div className="rounded-xl border p-3 text-xs text-slate-600"><b>Riwayat penilaian terakhir:</b> nilai {plan.history[plan.history.length - 1].score} • {new Date(plan.history[plan.history.length - 1].at).toLocaleDateString('id-ID')}
            <div className="mt-1">{plan.history[plan.history.length - 1].note}</div></div>}
          <Button className="w-full" disabled={busyId === plan.id} onClick={() => work(plan)}>
            {plan.status === 'pengayaan' ? <Sparkles size={16} /> : <Play size={16} />}
            {busyId === plan.id ? 'Membuka latihan…' : attempt ? 'Lanjutkan' : plan.status === 'pengayaan' ? 'Kerjakan pengayaan' : 'Kerjakan remedial'}
          </Button>
        </Card>
      })}</div>}

    <h2 className="flex items-center gap-2 font-bold"><CheckCircle2 size={18} className="text-emerald-700" /> Riwayat selesai ({completed.length})</h2>
    {!completed.length ? <EmptyState title="Belum ada remedial selesai" description="Nilai dan rekomendasi lanjutan akan ditampilkan di sini setelah remedial dinilai." /> :
      <div className="space-y-3">{completed.map(plan => {
        const next = nextOf(plan)
        return <Card key={plan.id} className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-bold">{plan.indicator}</div><Badge className={statusClass(plan.status)}>{statusLabel(plan.status)}</Badge></div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600"><span>{levelLabel(plan.level)}</span><span>Nilai awal: <b>{plan.scoreBefore}%</b></span><span>Nilai akhir: <b>{plan.scoreAfter ?? '-'}{plan.scoreAfter !== undefined ? '%' : ''}</b></span><span>Selesai: {new Date(plan.updatedAt).toLocaleDateString('id-ID')}</span></div>
          {plan.history.map((entry, index) => <div key={`${entry.attemptId}-${index}`} className="rounded-lg bg-slate-50 p-3 text-xs"><b>Evaluasi {index + 1} — {entry.score}</b><div>Tuntas: {entry.mastered.join(', ') || '-'}</div><div>Belum tuntas: {entry.remaining.join(', ') || '-'}</div><div className="mt-1 text-slate-600">{entry.note}</div></div>)}
          <div className="text-xs font-semibold text-teal-800">Rekomendasi lanjutan: {next ? `${levelLabel(next.level)} (${statusLabel(next.status)}) — ${next.indicator}` : 'Belum ada; guru akan menyiapkan jika diperlukan.'}</div>
        </Card>
      })}</div>}
  </div>
}
