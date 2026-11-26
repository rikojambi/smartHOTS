import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Flag, Send } from 'lucide-react'
import { db, queueSync } from '../db/db'
import { analyzeAttempt } from '../lib/analytics'
import { gradeAnswer } from '../lib/grading'
import { Badge, Button, Card, Confirm, ProgressBar } from '../components/ui'
import { MediaView, RichText } from '../components/RichText'
import type { StudentAnswer } from '../types'

function hash(s: string) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
function shuffledIndexes(seed: string, n: number) {
  const arr = [...Array(n).keys()]; let x = hash(seed)
  for (let i = n - 1; i > 0; i--) { x = (x * 1664525 + 1013904223) >>> 0; const j = x % (i + 1); [arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function Practice() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const attempt = useLiveQuery(() => db.studentAttempts.get(attemptId || ''), [attemptId])
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || []
  const questions = useLiveQuery(() => db.questions.toArray(), []) || []
  const [index, setIndex] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submitted = useRef(false)

  const exercise = exercises.find(e => e.id === attempt?.exerciseId)
  const ordered = useMemo(() => questions.filter(q => attempt?.questionIds.includes(q.id))
    .sort((a, b) => (attempt?.questionIds.indexOf(a.id) ?? 0) - (attempt?.questionIds.indexOf(b.id) ?? 0)), [questions, attempt?.questionIds])
  const current = ordered[index]
  const answer = attempt?.answers.find(a => a.questionId === current?.id)
  const answeredCount = attempt?.answers.filter(a => a.selected.length).length || 0

  const submit = useCallback(async () => {
    if (!attempt || !exercise || submitted.current || attempt.status === 'selesai') return
    submitted.current = true; setSubmitting(true)
    const fresh = await db.studentAttempts.get(attempt.id)
    if (!fresh) return
    const graded = fresh.answers.map(a => {
      const q = questions.find(x => x.id === a.questionId)
      if (!q || !a.selected.length) return { ...a, correct: false, points: 0, correctIds: q?.options.filter(o => o.isCorrect).map(o => o.label) || [] }
      const g = gradeAnswer(q, a.selected, exercise.settings)
      return { ...a, correct: g.correct, points: g.points, correctIds: q.options.filter(o => o.isCorrect).map(o => o.label) }
    })
    const score = Math.round(graded.reduce((s, a) => s + a.points, 0) / Math.max(1, graded.length) * 100)
    const finished: typeof fresh = { ...fresh, answers: graded, score, status: 'selesai', finishedAt: Date.now() }
    await db.studentAttempts.put(finished)
    const analytic = await analyzeAttempt(finished, exercise, questions, finished.id)
    await db.learningAnalytics.put(analytic)
    await queueSync('studentAttempts', finished.id)
    navigate(`/hasil/${finished.id}`)
  }, [attempt, exercise, questions, navigate])

  useEffect(() => {
    if (!attempt || attempt.status === 'selesai') return
    const tick = () => {
      const left = Math.max(0, Math.ceil((attempt.startedAt + (exercise?.settings.durationMinutes || 20) * 60000 - Date.now()) / 1000))
      setSeconds(left)
      if (left <= 0) submit()
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [attempt?.id, attempt?.status, exercise?.settings.durationMinutes, submit])

  async function select(label: string) {
    if (!attempt || !current || attempt.status === 'selesai') return
    const selected = current.type === 'single' ? [label]
      : answer?.selected.includes(label) ? answer.selected.filter(x => x !== label) : [...(answer?.selected || []), label]
    const g = gradeAnswer(current, selected, exercise?.settings || {})
    // Selalu baca jawaban terbaru dari IndexedDB agar aksi cepat (flag + jawab)
    // tidak saling menimpa karena state React belum sempat diperbarui.
    await db.studentAttempts.where('id').equals(attempt.id).modify(a => {
      const answers: StudentAnswer[] = a.answers.map(ans => ans.questionId === current.id
        ? { ...ans, selected, correctIds: current.options.filter(o => o.isCorrect).map(o => o.label), correct: g.correct, points: g.points, answeredAt: Date.now() }
        : ans)
      a.answers = answers
    })
  }
  async function toggleFlag() {
    if (!attempt || !current) return
    await db.studentAttempts.where('id').equals(attempt.id).modify(a => {
      a.answers = a.answers.map(ans => ans.questionId === current.id ? { ...ans, flagged: !ans.flagged } : ans)
    })
  }
  async function jump(i: number) { setIndex(i) }

  if (!attempt || !current) return <Card>Memuat latihan…</Card>
  if (attempt.status === 'selesai') return <Navigate to={`/hasil/${attempt.id}`} replace />

  const optionOrder = exercise?.settings.shuffleOptions && attempt ? shuffledIndexes(attempt.id + current.id, current.options.length) : current.options.map((_, i) => i)
  const showFeedback = exercise?.settings.showExplanation === 'langsung' && !!answer?.selected.length
  const closeToEnd = seconds < 60

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-extrabold">{exercise?.title}</h1><div className="text-sm text-slate-500">Soal {index + 1} dari {ordered.length}</div></div>
      <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${closeToEnd ? 'bg-rose-100 text-rose-700' : 'bg-white text-slate-700'}`}><Clock size={17} />{fmt(seconds)}</div>
    </div>
    <ProgressBar value={Math.round(answeredCount / ordered.length * 100)} label={`Sudah dijawab ${answeredCount}/${ordered.length}`} />

    <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
      <Card>
        <div className="mb-3 flex items-center gap-2"><Badge className="bg-blue-100 text-blue-700">{current.cognitive}</Badge><Badge className="bg-amber-100 text-amber-700">{current.difficulty}</Badge><Badge className="bg-teal-100 text-teal-700">{current.type === 'single' ? 'Pilihan ganda' : 'Multiple response'}</Badge><span className="text-xs text-slate-400">{current.code}</span></div>
        {current.stimulus && <div className="mb-4 rounded-xl border bg-slate-50 p-4"><RichText text={current.stimulus} className="text-sm" /><MediaView mediaId={current.stimulusMediaId} /></div>}
        <h2 className="mb-4 text-base font-bold leading-relaxed"><RichText text={current.prompt} /></h2>
        <div className="space-y-2">{optionOrder.map(i => {
          const o = current.options[i]
          if (!o) return null
          const chosen = !!answer?.selected.includes(o.label)
          const isCorrectOption = showFeedback && o.isCorrect
          const isWrongChoice = showFeedback && chosen && !o.isCorrect
          return <button key={o.id} onClick={() => select(o.label)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition ${chosen ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-300'} ${isCorrectOption ? 'border-emerald-500 bg-emerald-50' : ''} ${isWrongChoice ? 'border-rose-400 bg-rose-50' : ''}`}>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${chosen ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{o.label}</span>
            <div className="flex-1"><RichText text={o.text} /><MediaView mediaId={o.mediaId} className="mt-2 max-h-52" /></div>
            {isCorrectOption && <CheckCircle2 size={18} className="text-emerald-600" />}
          </button>
        })}</div>
        {showFeedback && <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm"><b className="text-teal-800">{answer?.correct ? 'Jawaban benar' : 'Belum tepat'}</b><div className="mt-1 text-slate-700"><RichText text={current.explanation} /></div></div>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <Button variant="secondary" disabled={index === 0} onClick={() => jump(index - 1)}><ChevronLeft size={16} /> Sebelumnya</Button>
          <Button variant="secondary" onClick={toggleFlag}><Flag size={16} className={answer?.flagged ? 'fill-amber-400 text-amber-500' : ''} /> {answer?.flagged ? 'Ditandai' : 'Tandai tinjau'}</Button>
          {index < ordered.length - 1 ? <Button onClick={() => jump(index + 1)}>Berikutnya <ChevronRight size={16} /></Button> : <Button onClick={() => setConfirmSubmit(true)}><Send size={16} /> Kumpulkan jawaban</Button>}
        </div>
      </Card>

      <div className="space-y-4"><Card><h3 className="mb-3 text-sm font-bold">Navigasi soal</h3><div className="grid grid-cols-5 gap-2">{ordered.map((q, i) => {
        const a = attempt.answers.find(x => x.questionId === q.id)
        return <button key={q.id} onClick={() => jump(i)} className={`relative flex h-9 items-center justify-center rounded-lg text-xs font-bold ${i === index ? 'bg-teal-700 text-white' : a?.selected.length ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>{i + 1}{a?.flagged && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400" />}</button>
      })}</div><div className="mt-3 text-xs text-slate-500"><div>■ Hijau = dijawab</div><div>Titik kuning = ditandai</div></div>
        <Button className="mt-4 w-full" onClick={() => setConfirmSubmit(true)}><Send size={16} /> Selesaikan latihan</Button>
      </Card>
        <Card className="text-xs text-slate-500">Progres jawaban disimpan otomatis di perangkat. Jika koneksi terputus, latihan tetap dapat dilanjutkan.</Card>
      </div>
    </div>
    <Confirm open={confirmSubmit} onClose={() => setConfirmSubmit(false)} onConfirm={() => submit()} message={`Kumpulkan jawaban? Sudah ${answeredCount} dari ${ordered.length} soal dijawab. Jawaban yang kosong akan dinilai salah.`} />
    {submitting && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 text-sm font-semibold text-white">Menghitung hasil dan menyusun analisis…</div>}
  </div>
}
