import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Sparkles } from 'lucide-react'
import { db, uid } from '../db/db'
import { Badge, Button, Card, EmptyState, Field } from '../components/ui'
import { masteryColor } from '../lib/analytics'
import { downloadPdfReport, analyticsLines } from '../lib/export'

export default function AnalyticsPage() {
  const analytics = useLiveQuery(() => db.learningAnalytics.toArray(), []) || []
  const attempts = useLiveQuery(() => db.studentAttempts.toArray(), []) || []
  const students = useLiveQuery(() => db.students.toArray(), []) || []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || []
  const questions = useLiveQuery(() => db.questions.toArray(), []) || []
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || []
  const recommendations = useLiveQuery(() => db.remediationRecommendations.toArray(), []) || []
  const [studentFilter, setStudentFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const filtered = analytics.filter(a => (!studentFilter || a.studentId === studentFilter) && (!subjectFilter || a.subjectId === subjectFilter))
    .sort((a, b) => b.createdAt - a.createdAt)
  const selected = filtered.find(a => a.id === selectedId) || filtered[0]
  const attempt = attempts.find(a => a.id === selected?.attemptId)
  const exercise = exercises.find(e => e.id === attempt?.exerciseId)

  const weakTopics = selected?.findings.filter(f => f.type === 'materi') || []
  const chart = weakTopics.map(f => ({ name: f.label.length > 18 ? `${f.label.slice(0, 17)}…` : f.label, nilai: f.percentage }))

  const questionQuality = questions.map(q => {
    const rows = attempts.flatMap(a => a.answers.filter(ans => ans.questionId === q.id))
    const wrong = rows.filter(r => !r.correct).length
    return { q, total: rows.length, wrong, pct: rows.length ? Math.round(wrong / rows.length * 100) : 0 }
  }).filter(x => x.total >= 2).sort((a, b) => b.pct - a.pct).slice(0, 10)

  async function createRemediation() {
    if (!selected || !attempt) return
    const now = Date.now()
    const weak = selected.findings.filter(f => f.type === 'materi' && f.percentage < 70)
    if (!weak.length) { setMessage('Tidak ada materi yang perlu remedial pada hasil ini.'); return }
    for (const [i, f] of weak.entries()) {
      const sub = f.label.toLowerCase()
      const match = questions.filter(q => q.subjectId === selected.subjectId && q.topicId.split('|')[0] && `${q.subTopic} ${q.indicator}`.toLowerCase().includes(sub.split(' ')[0]))
      await db.remediationRecommendations.put({
        id: uid('rec-'), studentId: selected.studentId, subjectId: selected.subjectId,
        topicId: f.key.split('|')[0] || '', title: `Remedial: ${f.label}`,
        reason: `Penguasaan ${f.percentage}% (${f.category}) pada latihan ${exercise?.title || ''}.`,
        materials: selected.recommendations.filter(r => r.includes(f.label)).join(' ') || `Pelajari kembali ${f.label} dan kerjakan contoh soal terkait.`,
        questionIds: match.slice(0, 5).map(q => q.id), priority: i + 1, completed: false, createdAt: now
      })
    }
    setMessage(`${weak.length} rekomendasi remedial berhasil dibuat.`)
  }

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-extrabold">Analisis Kelemahan Siswa</h1><p className="text-sm text-slate-500">Analisis berdasarkan respons per indikator—bukan sekadar nilai akhir. Kesalahan merupakan dugaan diagnostik.</p></div>
    <Card><div className="grid gap-3 sm:grid-cols-3">
      <Field label="Siswa"><select className="input" value={studentFilter} onChange={e => setStudentFilter(e.target.value)}><option value="">Semua siswa</option>{students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}</select></Field>
      <Field label="Mata pelajaran"><select className="input" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}><option value="">Semua mapel</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <div className="flex items-end"><Button variant="secondary" onClick={() => { if (selected) downloadPdfReport('Laporan Analisis SMART HOTS', analyticsLines(selected), `analisis-${selected.studentId}.pdf`) }}>Unduh PDF</Button></div>
    </div></Card>
    {message && <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{message}</div>}

    {!filtered.length ? <EmptyState title="Belum ada hasil latihan" description="Analisis otomatis dibuat setelah siswa menyelesaikan latihan." /> : <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-1"><h2 className="mb-3 font-bold">Daftar hasil</h2><div className="max-h-[560px] space-y-2 overflow-y-auto">{filtered.map(a => <button key={a.id} onClick={() => setSelectedId(a.id)}
        className={`w-full rounded-xl border p-3 text-left text-sm ${selected?.id === a.id ? 'border-teal-500 bg-teal-50' : 'hover:bg-slate-50'}`}>
        <div className="font-semibold">{students.find(s => s.id === a.studentId)?.name}</div>
        <div className="text-xs text-slate-500">{exercises.find(e => e.id === attempts.find(x => x.id === a.attemptId)?.exerciseId)?.title}</div>
        <div className="mt-1 flex justify-between text-xs"><span>{new Date(a.createdAt).toLocaleDateString('id-ID')}</span><Badge className={a.score >= 70 ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'}>{a.score}</Badge></div>
      </button>)}</div></Card>

      <div className="space-y-5 lg:col-span-2">
        {selected && <>
          <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Detail analisis</h2><div className="text-sm text-slate-500">{students.find(s => s.id === selected.studentId)?.name} • Nilai {selected.score} • {new Date(selected.createdAt).toLocaleString('id-ID')}</div></div><Button onClick={createRemediation}><Sparkles size={16} /> Buat remedial</Button></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Pola kesalahan dominan</div><div className="mt-1 text-sm font-semibold">{selected.errorPatterns[0] || 'Tidak ada'}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Miskonsepsi terdeteksi</div><div className="mt-1 text-sm font-semibold">{selected.misconceptions.length}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Butir bukti respons</div><div className="mt-1 text-sm font-semibold">{selected.evidence.length}</div></div></div>
          </Card>
          <Card><h3 className="mb-3 font-bold">Penguasaan materi</h3>
            {chart.length ? <ResponsiveContainer width="100%" height={220}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="nilai" fill="#0d9488" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="text-sm text-slate-500">Semua materi berada di atas batas penguatan.</p>}
            <div className="mt-3 overflow-x-auto"><table className="table"><thead><tr><th>Materi</th><th>Benar</th><th>Penguasaan</th><th>Status</th></tr></thead><tbody>{weakTopics.map(f => <tr key={f.key}><td>{f.label}</td><td>{f.correct}/{f.total}</td><td>{f.percentage}%</td><td><Badge className={masteryColor(f.category)}>{f.category}</Badge></td></tr>)}</tbody></table></div>
          </Card>
          <div className="grid gap-5 md:grid-cols-2">
            <Card><h3 className="mb-3 font-bold">Indikator & TP</h3><div className="max-h-72 space-y-2 overflow-y-auto">{selected.findings.filter(f => f.type !== 'materi').map((f, i) => <div key={i} className="rounded-lg border p-2 text-xs"><div className="flex justify-between"><span className="font-semibold">{f.type === 'tp' ? 'TP' : 'Indikator'}</span><b>{f.percentage}%</b></div><div className="mt-1 text-slate-600">{f.label}</div></div>)}</div></Card>
            <Card><h3 className="mb-3 font-bold">Pola kesalahan & bukti</h3><ul className="list-inside list-disc space-y-1 text-sm text-slate-600">{selected.errorPatterns.map((e, i) => <li key={i}>{e}</li>)}</ul>
              <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">{selected.evidence.map((e, i) => <div key={i} className="rounded-lg bg-rose-50 p-2 text-xs"><b>{e.questionCode}</b>: pilih {e.selected.join(', ') || '-'} • kunci {e.correct.join(', ')}<div className="text-slate-500">{e.indicator}</div></div>)}</div>
            </Card>
          </div>
          <Card><h3 className="mb-3 font-bold">Rekomendasi otomatis & urutan prioritas</h3><ol className="list-inside list-decimal space-y-1 text-sm">{selected.recommendations.map((r, i) => <li key={i} className="text-slate-700">{r}</li>)}</ol>{selected.priorityOrder.length > 0 && <div className="mt-3 text-xs text-slate-500">Prioritas: {selected.priorityOrder.join(' → ')}</div>}</Card>
        </>}
      </div>
    </div>}

    <div className="grid gap-5 lg:grid-cols-2">
      <Card><h2 className="mb-3 font-bold">Soal sulit / indikasi kualitas</h2>{questionQuality.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Kode</th><th>Dijawab</th><th>Salah</th><th>Indikasi</th></tr></thead><tbody>{questionQuality.map(x => <tr key={x.q.id}><td>{x.q.code}</td><td>{x.total}</td><td>{x.pct}%</td><td className="text-xs">{x.pct >= 70 ? (x.q.difficulty === 'mudah' ? 'Periksa kejelasan/ambiguitas' : 'Sulit sesuai desain') : 'Masih dalam batas'}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">Minimal dua siswa perlu mengerjakan soal untuk menilai kualitas.</p>}</Card>
      <Card><h2 className="mb-3 font-bold">Rekomendasi remedial tersimpan</h2>{recommendations.length ? <div className="space-y-2">{recommendations.slice(0, 10).map(r => <div key={r.id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between"><b>{r.title}</b><Badge className={r.completed ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}>{r.completed ? 'Selesai' : 'Menunggu'}</Badge></div><div className="text-xs text-slate-500">{students.find(s => s.id === r.studentId)?.name} • prioritas {r.priority}</div><div className="mt-1 text-xs">{r.reason}</div><button className="mt-2 text-xs font-semibold text-teal-700" onClick={async () => { await db.remediationRecommendations.update(r.id, { completed: !r.completed }); }}>Tandai {r.completed ? 'belum selesai' : 'selesai'}</button></div>)}</div> : <p className="text-sm text-slate-500">Belum ada rekomendasi yang dibuat.</p>}</Card>
    </div>
  </div>
}
