import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Clock, Play, RotateCcw } from 'lucide-react'
import { db, uid } from '../db/db'
import { useAuth } from '../lib/auth'
import { Badge, Button, Card, EmptyState } from '../components/ui'

export default function StudentExercises() {
  const { student } = useAuth()
  const navigate = useNavigate()
  const exercises = useLiveQuery(() => db.exercises.filter(e => e.active).toArray(), []) || []
  const questions = useLiveQuery(() => db.questions.toArray(), []) || []
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || []
  const attempts = useLiveQuery(() => db.studentAttempts.where('studentId').equals(student?.id || '').toArray(), [student?.id]) || []

  async function start(exerciseId: string) {
    if (!student) return
    const ex = exercises.find(e => e.id === exerciseId)
    if (!ex) return
    const running = attempts.find(a => a.exerciseId === exerciseId && a.status === 'berjalan')
    if (running) { navigate(`/practice/${running.id}`); return }
    const finished = attempts.filter(a => a.exerciseId === exerciseId && a.status === 'selesai').length
    if (finished >= ex.settings.allowRetry) { alert('Kesempatan latihan sudah habis. Hubungi guru untuk menambah kesempatan.'); return }
    const available = ex.questionIds.filter(id => questions.some(q => q.id === id && q.active && q.status === 'siap'))
    if (!available.length) { alert('Belum ada soal siap pakai pada latihan ini.'); return }
    const ids = ex.settings.shuffleQuestions ? [...available].sort(() => Math.random() - 0.5) : available
    const attempt = {
      id: uid('att-'), exerciseId, studentId: student.id, startedAt: Date.now(), status: 'berjalan' as const,
      questionIds: ids,
      answers: ids.map(qid => ({ questionId: qid, selected: [] as string[], correctIds: [], points: 0, maxPoints: 1, correct: false, flagged: false })),
      score: 0,
      snapshotVersion: Object.fromEntries(ids.map(id => [id, questions.find(q => q.id === id)?.version || 1]))
    }
    await db.studentAttempts.put(attempt)
    navigate(`/practice/${attempt.id}`)
  }

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-extrabold">Mulai Latihan</h1><p className="text-sm text-slate-500">Pilih paket latihan. Progres tersimpan otomatis dan dapat dilanjutkan kapan saja.</p></div>
    {exercises.length === 0 ? <EmptyState title="Belum ada latihan aktif" description="Guru belum menerbitkan latihan. Cek kembali nanti." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{exercises.map(e => {
      const available = e.questionIds.filter(id => questions.some(q => q.id === id && q.active && q.status === 'siap')).length
      const finished = attempts.filter(a => a.exerciseId === e.id && a.status === 'selesai').length
      const running = attempts.find(a => a.exerciseId === e.id && a.status === 'berjalan')
      const exhausted = finished >= e.settings.allowRetry
      return <Card key={e.id} className="flex flex-col">
        <div className="flex items-start justify-between gap-2"><div><Badge className="bg-teal-100 text-teal-700">{subjects.find(s => s.id === e.subjectId)?.name}</Badge><h3 className="mt-2 text-lg font-bold">{e.title}</h3></div><Clock size={18} className="text-slate-400" /></div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600"><Badge className="bg-blue-50 text-blue-700">{available} soal</Badge><Badge className="bg-amber-50 text-amber-700">{e.settings.durationMinutes} menit</Badge><Badge className="bg-violet-50 text-violet-700">{e.settings.types.join(' + ')}</Badge></div>
        <div className="mt-3 text-xs text-slate-500">Kesempatan: {e.settings.allowRetry - finished} tersisa • {e.settings.showExplanation === 'langsung' ? 'Pembahasan langsung' : 'Pembahasan setelah selesai'}</div>
        <div className="mt-auto pt-4"><Button className="w-full" disabled={!available || exhausted} onClick={() => start(e.id)}>{running ? <><Play size={16} /> Lanjutkan</> : exhausted ? 'Kesempatan habis' : <><RotateCcw size={16} /> Mulai latihan</>}</Button></div>
      </Card>
    })}</div>}
  </div>
}
