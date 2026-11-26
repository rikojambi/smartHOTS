import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Printer } from 'lucide-react'
import { db } from '../db/db'
import { useAuth } from '../lib/auth'
import { Badge, Button, Card, EmptyState, ProgressBar } from '../components/ui'
import { masteryColor } from '../lib/analytics'
import { analyticsLines, downloadPdfReport } from '../lib/export'

export default function ReportPage() {
  const { student } = useAuth()
  const attempts = useLiveQuery(() => db.studentAttempts.where('studentId').equals(student?.id || '').toArray(), [student?.id]) || []
  const analytics = useLiveQuery(() => db.learningAnalytics.where('studentId').equals(student?.id || '').toArray(), [student?.id]) || []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || []
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || []
  const recommendations = useLiveQuery(() => db.remediationRecommendations.where('studentId').equals(student?.id || '').toArray(), [student?.id]) || []
  const finished = attempts.filter(a => a.status === 'selesai')

  const perSubject = subjects.map(s => {
    const exIds = exercises.filter(e => e.subjectId === s.id).map(e => e.id)
    const rows = finished.filter(a => exIds.includes(a.exerciseId))
    const latest = analytics.filter(a => a.subjectId === s.id).sort((a, b) => b.createdAt - a.createdAt)[0]
    return { s, count: rows.length, avg: rows.length ? Math.round(rows.reduce((sum, a) => sum + a.score, 0) / rows.length) : 0, latest }
  }).filter(x => x.count > 0 || x.latest)
  const allFindings = analytics.flatMap(a => a.findings.filter(f => f.type === 'materi'))
  const mastered = allFindings.filter(f => f.percentage >= 70).length
  const weak = allFindings.filter(f => f.percentage < 70).length
  const latest = analytics.sort((a, b) => b.createdAt - a.createdAt)[0]

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3 no-print">
      <div><h1 className="text-2xl font-extrabold">Laporan Perkembangan Belajar</h1><p className="text-sm text-slate-500">{student?.name} • Kelas {student?.className} • {student?.school}</p></div>
      <div className="flex gap-2"><Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Cetak laporan</Button><Button onClick={() => downloadPdfReport(`Laporan Belajar - ${student?.name || 'Siswa'}`, latest ? analyticsLines(latest) : ['Belum ada hasil latihan.'])}><Download size={16} /> Unduh PDF</Button></div>
    </div>

    {!finished.length ? <EmptyState title="Belum ada data laporan" description="Laporan tersedia setelah siswa menyelesaikan latihan." /> : <>
      <Card><div className="grid gap-4 sm:grid-cols-4"><div><div className="text-xs text-slate-500">Total latihan</div><div className="text-2xl font-bold">{finished.length}</div></div><div><div className="text-xs text-slate-500">Rata-rata nilai</div><div className="text-2xl font-bold">{Math.round(finished.reduce((s, a) => s + a.score, 0) / finished.length)}</div></div><div><div className="text-xs text-slate-500">Materi dikuasai</div><div className="text-2xl font-bold text-teal-700">{mastered}</div></div><div><div className="text-xs text-slate-500">Materi perlu penguatan</div><div className="text-2xl font-bold text-amber-600">{weak}</div></div></div></Card>

      <Card><h2 className="mb-4 font-bold">Nilai per mata pelajaran</h2><div className="overflow-x-auto"><table className="table"><thead><tr><th>Mata pelajaran</th><th>Latihan</th><th>Rata-rata</th><th>Penguasaan terakhir</th></tr></thead><tbody>{perSubject.map(x => <tr key={x.s.id}><td className="font-semibold">{x.s.name}</td><td>{x.count}</td><td>{x.avg}</td><td>{x.latest ? `${x.latest.findings.filter(f => f.type === 'materi' && f.percentage >= 70).length}/${x.latest.findings.filter(f => f.type === 'materi').length} materi` : '-'}</td></tr>)}</tbody></table></div></Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card><h2 className="mb-3 font-bold">Materi yang perlu diperkuat</h2><div className="space-y-3">{allFindings.filter(f => f.percentage < 70).slice(0, 10).map((f, i) => <div key={i}><ProgressBar value={f.percentage} label={f.label} /><div className="mt-1"><Badge className={masteryColor(f.category)}>{f.category}</Badge></div></div>)}</div></Card>
        <Card><h2 className="mb-3 font-bold">Rekomendasi & tindak lanjut</h2><ol className="list-inside list-decimal space-y-1 text-sm">{latest?.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ol>
          <div className="mt-4 space-y-2">{recommendations.filter(r => !r.completed).map(r => <div key={r.id} className="rounded-xl bg-slate-50 p-3 text-xs"><b>{r.title}</b><div className="text-slate-500">{r.reason}</div></div>)}</div></Card>
      </div>
      <p className="text-center text-xs text-slate-400">Dicetak dari SMART HOTS • {new Date().toLocaleDateString('id-ID')} • Analisis merupakan dugaan diagnostik berdasarkan pola respons.</p>
    </>}
  </div>
}
