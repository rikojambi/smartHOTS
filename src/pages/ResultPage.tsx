import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Download, Printer, XCircle } from 'lucide-react'
import { db } from '../db/db'
import { useAuth } from '../lib/auth'
import { Badge, Button, Card, EmptyState, ProgressBar } from '../components/ui'
import { MediaView, RichText } from '../components/RichText'
import { masteryColor } from '../lib/analytics'
import { analyticsLines, downloadPdfReport } from '../lib/export'

export default function ResultPage() {
  const { attemptId } = useParams()
  const { student: authStudent, user } = useAuth()
  const attempt = useLiveQuery(() => db.studentAttempts.get(attemptId || ''), [attemptId])
  const analytic = useLiveQuery(() => db.learningAnalytics.where('attemptId').equals(attemptId || '').first(), [attemptId])
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || []
  const questions = useLiveQuery(() => db.questions.toArray(), []) || []
  const students = useLiveQuery(() => db.students.toArray(), []) || []
  const [open, setOpen] = useState<string | null>(null)

  if (!attempt) return <Card>Memuat hasil…</Card>
  if (user?.role === 'student' && attempt.studentId !== authStudent?.id) return <Card><p className="font-bold text-rose-600">Akses ditolak</p><p className="mt-1 text-sm text-slate-500">Hasil latihan ini bukan milik akun Anda.</p></Card>
  if (attempt.status !== 'selesai') return <EmptyState title="Latihan belum selesai" description="Selesaikan latihan terlebih dahulu untuk melihat hasil." action={user?.role === 'student' && attempt.studentId === authStudent?.id ? <Link to={`/practice/${attempt.id}`}><Button>Lanjutkan latihan</Button></Link> : undefined} />
  const exercise = exercises.find(e => e.id === attempt.exerciseId)
  const student = students.find(s => s.id === attempt.studentId)
  const material = (analytic?.findings || []).filter(f => f.type === 'materi')
  const scoreColor = attempt.score >= 70 ? 'bg-emerald-100 text-emerald-800' : attempt.score >= 55 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold">Hasil Latihan</h1><div className="text-sm text-slate-500">{exercise?.title} • {student?.name} • {new Date(attempt.finishedAt || attempt.startedAt).toLocaleString('id-ID')}</div></div>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Cetak</Button><Button onClick={() => analytic && downloadPdfReport('Laporan Hasil SMART HOTS', analyticsLines(analytic))}><Download size={16} /> Unduh PDF</Button></div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card><div className="text-xs text-slate-500">Nilai akhir</div><div className={`mt-2 text-4xl font-extrabold ${scoreColor} inline-block rounded-xl px-3 py-1`}>{attempt.score}</div></Card>
      <Card><div className="text-xs text-slate-500">Jawaban benar</div><div className="mt-2 text-3xl font-bold text-teal-700">{attempt.answers.filter(a => a.correct).length}<span className="text-base text-slate-400"> / {attempt.answers.length}</span></div></Card>
      <Card><div className="text-xs text-slate-500">Materi perlu penguatan</div><div className="mt-2 text-3xl font-bold text-amber-600">{material.filter(m => m.percentage < 70).length}</div></Card>
      <Card><div className="text-xs text-slate-500">Pola kesalahan utama</div><div className="mt-2 text-sm font-semibold">{analytic?.errorPatterns[0] || 'Tidak ada'}</div></Card>
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <Card><h2 className="mb-3 font-bold">Penguasaan per materi</h2>{material.length ? <div className="space-y-3">{material.map(m => <div key={m.key}><ProgressBar value={m.percentage} label={`${m.label} (${m.correct}/${m.total})`} /><div className="mt-1"><Badge className={masteryColor(m.category)}>{m.category}</Badge></div></div>)}</div> : <p className="text-sm text-slate-500">Semua materi berada pada kategori baik ke atas.</p>}</Card>
      <Card><h2 className="mb-3 font-bold">Analisis kelemahan & rekomendasi</h2>
        {analytic ? <><div className="space-y-2 text-sm"><div><b>Miskonsepsi teridentifikasi:</b> {analytic.misconceptions.length ? analytic.misconceptions.join('; ') : 'Tidak terdeteksi'}</div><div><b>Pola kesalahan (dugaan diagnostik):</b><ul className="list-inside list-disc text-slate-600">{analytic.errorPatterns.map((e, i) => <li key={i}>{e}</li>)}</ul></div></div>
          <div className="mt-4 rounded-xl bg-teal-50 p-3"><div className="mb-1 text-xs font-bold uppercase text-teal-800">Urutan prioritas belajar</div><ol className="list-inside list-decimal text-sm text-teal-900">{analytic.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ol></div></> : <p className="text-sm text-slate-500">Analisis belum tersedia.</p>}
      </Card>
    </div>

    <Card><h2 className="mb-4 font-bold">Pembahasan per soal</h2><div className="space-y-3">{attempt.answers.map((a, i) => {
      const q = questions.find(x => x.id === a.questionId)
      if (!q) return null
      const correct = q.options.filter(o => o.isCorrect).map(o => o.label)
      return <div key={a.questionId} className="rounded-xl border">
        <button className="flex w-full items-center justify-between gap-3 p-4 text-left" onClick={() => setOpen(open === a.questionId ? null : a.questionId)}>
          <div className="flex items-start gap-3"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${a.correct ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{a.correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}</span>
            <div><div className="text-sm font-bold">Soal {i + 1} — {q.code}</div><div className="text-xs text-slate-500">{q.subTopic} • {q.indicator}</div></div></div>
          <div className="text-right text-xs"><div className="font-bold">{Math.round(a.points * 100)}/100</div><div className="text-slate-500">Pilihan: {a.selected.join(', ') || '-'}</div></div>
        </button>
        {open === a.questionId && <div className="space-y-3 border-t bg-slate-50 p-4 text-sm">
          <RichText text={q.stimulus} /><RichText text={q.prompt} className="font-semibold" /><MediaView mediaId={q.stimulusMediaId} />
          <div className="space-y-1">{q.options.map(o => <div key={o.id} className={`rounded-lg border p-2 ${o.isCorrect ? 'border-emerald-300 bg-emerald-50' : a.selected.includes(o.label) ? 'border-rose-300 bg-rose-50' : 'bg-white'}`}><b>{o.label}.</b> <RichText text={o.text} className="inline" /><div className="text-xs text-slate-500">{o.reason}</div><MediaView mediaId={o.mediaId} className="mt-1 max-h-32" /></div>)}</div>
          <div><b>Kunci:</b> {correct.join(', ')}</div>
          <div><b>Pembahasan:</b> <RichText text={q.explanation} className="inline" /></div>
          <div className="text-xs text-slate-500"><b>Kompetensi:</b> {q.competency} • <b>Miskonsepsi:</b> {q.misconception}</div>
        </div>}
      </div>
    })}</div></Card>
  </div>
}
