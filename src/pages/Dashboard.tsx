import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart3, BookOpen, ClipboardCheck, Database, TrendingUp, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../db/db'
import { useAuth } from '../lib/auth'
import { Badge, Button, Card, EmptyState, ProgressBar, StatCard } from '../components/ui'
import { masteryColor } from '../lib/analytics'

export default function Dashboard() {
  const { user, student } = useAuth()
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray(), []) || []
  const topics = useLiveQuery(() => db.topics.toArray(), []) || []
  const questions = useLiveQuery(() => db.questions.toArray(), []) || []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || []
  const students = useLiveQuery(() => db.students.toArray(), []) || []
  const attempts = useLiveQuery(() => db.studentAttempts.toArray(), []) || []
  const analytics = useLiveQuery(() => db.learningAnalytics.toArray(), []) || []
  const recommendations = useLiveQuery(() => db.remediationRecommendations.toArray(), []) || []

  if (!user) return null
  const subjectName = (id: string) => subjects.find(s => s.id === id)?.name || id
  const finished = attempts.filter(a => a.status === 'selesai')
  const ownAttempts = student ? finished.filter(a => a.studentId === student.id) : []
  const scoreOf = (a: typeof finished[number]) => a.score

  const subjectStats = subjects.map(s => {
    const exIds = exercises.filter(e => e.subjectId === s.id).map(e => e.id)
    const rows = finished.filter(a => exIds.includes(a.exerciseId))
    return { name: s.shortName, full: s.name, rata: rows.length ? Math.round(rows.reduce((sum, a) => sum + scoreOf(a), 0) / rows.length) : 0, soal: questions.filter(q => q.subjectId === s.id).length, attempts: rows.length }
  }).filter(s => s.soal > 0)

  const topicStats = topics.map(t => {
    const ids = questions.filter(q => q.topicId === t.id).map(q => q.id)
    const rows = finished.flatMap(a => a.answers.filter(ans => ids.includes(ans.questionId)))
    return { name: t.name, subject: subjectName(t.subjectId), pct: rows.length ? Math.round(rows.filter(r => r.correct).length / rows.length * 100) : null, total: rows.length }
  }).filter(t => t.total > 0).sort((a, b) => (a.pct || 0) - (b.pct || 0))

  const distribution = [
    { name: 'Sangat baik', value: finished.filter(a => a.score >= 85).length, color: '#059669' },
    { name: 'Baik', value: finished.filter(a => a.score >= 70 && a.score < 85).length, color: '#0d9488' },
    { name: 'Cukup', value: finished.filter(a => a.score >= 55 && a.score < 70).length, color: '#d97706' },
    { name: 'Perlu penguatan', value: finished.filter(a => a.score >= 40 && a.score < 55).length, color: '#ea580c' },
    { name: 'Perlu remedial', value: finished.filter(a => a.score < 40).length, color: '#e11d48' }
  ].filter(d => d.value > 0)

  const timeline = [...finished].sort((a, b) => (a.finishedAt || 0) - (b.finishedAt || 0)).slice(-8).map(a => ({
    name: new Date(a.finishedAt || a.startedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    nilai: a.score
  }))

  if (user.role === 'student') {
    const latest = [...ownAttempts].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0))
    const avg = ownAttempts.length ? Math.round(ownAttempts.reduce((s, a) => s + a.score, 0) / ownAttempts.length) : 0
    const ownAnalytics = analytics.filter(a => a.studentId === student?.id)
    const latestAnalysis = ownAnalytics.sort((a, b) => b.createdAt - a.createdAt)[0]
    const mastery = latestAnalysis?.findings.filter(f => f.type === 'materi') || []
    const ownRecs = recommendations.filter(r => r.studentId === student?.id && !r.completed).slice(0, 4)
    return <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-teal-800 to-teal-600 p-6 text-white">
        <div className="text-sm text-teal-100">Selamat datang, {student?.name}</div>
        <h1 className="mt-1 text-2xl font-extrabold">Siap meningkatkan kemampuan HOTS-mu?</h1>
        <p className="mt-2 max-w-2xl text-sm text-teal-50/80">Kerjakan latihan, lalu lihat analisis kelemahan berdasarkan materi dan indikator untuk belajar lebih terarah.</p>
        <Link to="/latihan-siswa" className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-teal-800">Mulai latihan →</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Latihan selesai" value={ownAttempts.length} icon={<ClipboardCheck size={22} />} />
        <StatCard label="Rata-rata nilai" value={avg} sub="dari semua latihan" icon={<TrendingUp size={22} />} tone="blue" />
        <StatCard label="Materi dikuasai" value={mastery.filter(m => m.percentage >= 70).length} icon={<BookOpen size={22} />} tone="amber" />
        <StatCard label="Perlu remedial" value={ownRecs.length} icon={<BarChart3 size={22} />} tone="rose" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><h2 className="mb-4 font-bold">Perkembangan nilai</h2>
          {timeline.length ? <ResponsiveContainer width="100%" height={220}><BarChart data={timeline}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="nilai" fill="#0d9488" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState title="Belum ada latihan" description="Selesaikan latihan pertama untuk melihat grafik perkembangan." />}
        </Card>
        <Card><h2 className="mb-4 font-bold">Penguasaan materi terakhir</h2>
          {mastery.length ? <div className="space-y-3">{mastery.slice(0, 6).map(m => <div key={m.key}><ProgressBar value={m.percentage} label={m.label} /><div className="mt-1"><Badge className={masteryColor(m.category)}>{m.category}</Badge></div></div>)}</div> : <EmptyState title="Belum ada analisis" description="Analisis muncul setelah kamu menyelesaikan latihan." />}
        </Card>
      </div>
      <Card>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Rekomendasi belajar</h2><Link to="/laporan" className="text-sm font-semibold text-teal-700">Lihat laporan →</Link></div>
        {ownRecs.length ? <ul className="space-y-2 text-sm">{ownRecs.map(r => <li key={r.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">• {r.title}: {r.reason}</li>)}</ul> : <p className="text-sm text-slate-500">Selesaikan latihan untuk mendapat rekomendasi otomatis.</p>}
      </Card>
      <Card><h2 className="mb-3 font-bold">Riwayat terbaru</h2>
        {latest.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Latihan</th><th>Tanggal</th><th>Nilai</th><th></th></tr></thead><tbody>{latest.slice(0, 5).map(a => <tr key={a.id}><td>{exercises.find(e => e.id === a.exerciseId)?.title || '-'}</td><td>{new Date(a.finishedAt || a.startedAt).toLocaleString('id-ID')}</td><td className="font-semibold">{a.score}</td><td><Link className="text-teal-700 hover:underline" to={`/hasil/${a.id}`}>Detail</Link></td></tr>)}</tbody></table></div> : <EmptyState title="Belum ada riwayat" />}
      </Card>
    </div>
  }

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-extrabold text-slate-800">Dashboard {user.role === 'admin' ? 'Administrator' : 'Guru'}</h1><p className="text-sm text-slate-500">Ringkasan kondisi bank soal, latihan, dan capaian belajar siswa.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Siswa" value={students.length} icon={<Users size={22} />} />
      <StatCard label="Soal tersedia" value={questions.filter(q => q.active).length} sub={`${subjects.length} mata pelajaran`} icon={<Database size={22} />} tone="blue" />
      <StatCard label="Latihan selesai" value={finished.length} icon={<ClipboardCheck size={22} />} tone="amber" />
      <StatCard label="Rata-rata nilai" value={finished.length ? Math.round(finished.reduce((s, a) => s + a.score, 0) / finished.length) : 0} icon={<TrendingUp size={22} />} tone="rose" />
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><h2 className="mb-4 font-bold">Rata-rata nilai per mata pelajaran</h2>
        <ResponsiveContainer width="100%" height={260}><BarChart data={subjectStats}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip formatter={(v) => [`${v}`, 'Nilai']} /><Bar dataKey="rata" radius={[6, 6, 0, 0]}>{subjectStats.map((_, i) => <Cell key={i} fill={['#0d9488', '#2563eb', '#7c3aed', '#dc2626', '#059669', '#d97706', '#0891b2', '#ea580c', '#db2777', '#65a30d'][i % 10]} />)}</Bar></BarChart></ResponsiveContainer>
      </Card>
      <Card><h2 className="mb-4 font-bold">Distribusi penguasaan</h2>
        {distribution.length ? <div className="flex flex-col items-center gap-4 sm:flex-row"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>{distribution.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="space-y-2 text-xs">{distribution.map(d => <div key={d.name} className="flex items-center gap-2"><span className="h-3 w-3 rounded" style={{ background: d.color }} />{d.name}: <b>{d.value}</b></div>)}</div></div> : <EmptyState title="Belum ada hasil latihan" />}
      </Card>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><h2 className="mb-3 font-bold">Materi paling sulit</h2>
        {topicStats.length ? <div className="space-y-3">{topicStats.slice(0, 5).map(t => <div key={t.name}><div className="mb-1 flex justify-between text-xs"><span>{t.name} <span className="text-slate-400">({t.subject})</span></span><b>{t.pct}%</b></div><ProgressBar value={t.pct || 0} /></div>)}</div> : <EmptyState title="Belum ada data" description="Materi paling sulit muncul setelah siswa mengerjakan latihan." />}
      </Card>
      <Card><h2 className="mb-3 font-bold">Siswa perlu penguatan</h2>
        {finished.length ? <div className="space-y-2">{students.slice(0, 5).map(s => {
          const rows = finished.filter(a => a.studentId === s.id)
          const avg = rows.length ? Math.round(rows.reduce((x, a) => x + a.score, 0) / rows.length) : 0
          return <div key={s.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"><span>{s.name} <span className="text-slate-400">{s.className}</span></span><Badge className={avg < 55 ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700'}>{rows.length ? avg : '-'}</Badge></div>
        })}</div> : <EmptyState title="Belum ada data siswa" />}
      </Card>
    </div>
    {(user.role === 'admin' || user.role === 'teacher') && <Card className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Akses latihan siswa</h2><p className="text-sm text-slate-500">Tentukan mapel aktif yang boleh dikerjakan setiap siswa.</p></div><div className="flex gap-2"><Link to="/akses-siswa"><Button variant="secondary">Atur mapel siswa</Button></Link><Link to="/sinkronisasi"><Button>Sinkronisasi hasil</Button></Link></div></Card>}
    {user.role === 'admin' && <Card className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Pengelolaan aplikasi</h2><p className="text-sm text-slate-500">Kelola pengguna, struktur materi, dan cadangan data.</p></div><div className="flex gap-2"><Link to="/pengguna"><Button variant="secondary">Kelola pengguna</Button></Link><Link to="/pengaturan"><Button>Pengaturan & backup</Button></Link></div></Card>}
  </div>
}
