import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../lib/auth'
import { Badge, Button, Card, EmptyState } from '../components/ui'

export default function HistoryPage() {
  const { student } = useAuth()
  const attempts = useLiveQuery(() => dbAttempts(student?.id || ''), [student?.id]) || []
  const exercises = useLiveQuery(() => dbExercises(), []) || []
  const [compare, setCompare] = useState<string[]>([])
  const rows = [...attempts].filter(a => a.status === 'selesai').sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0))

  const chart = [...rows].reverse().map(a => ({ name: new Date(a.finishedAt || a.startedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), nilai: a.score }))
  const compared = compare.map(id => rows.find(a => a.id === id)).filter(Boolean)

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-extrabold">Riwayat Latihan</h1><p className="text-sm text-slate-500">Lihat perkembangan dan bandingkan dua hasil latihan.</p></div>
    {!rows.length ? <EmptyState title="Belum ada riwayat" description="Selesaikan satu latihan untuk melihat riwayat." action={<Link to="/latihan-siswa"><Button>Mulai latihan</Button></Link>} /> : <>
      <Card><h2 className="mb-3 font-bold">Grafik perkembangan</h2><ResponsiveContainer width="100%" height={220}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="nilai" fill="#0d9488" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
      {compared.length > 0 && <Card><h2 className="mb-3 font-bold">Perbandingan hasil</h2><div className="grid gap-3 sm:grid-cols-2">{compared.map((a: any) => <div key={a.id} className="rounded-xl border p-4"><div className="font-semibold">{exercises.find(e => e.id === a.exerciseId)?.title}</div><div className="text-xs text-slate-500">{new Date(a.finishedAt).toLocaleString('id-ID')}</div><div className="mt-2 text-3xl font-bold text-teal-700">{a.score}</div><div className="text-xs text-slate-500">Benar {a.answers.filter((x: any) => x.correct).length}/{a.answers.length}</div></div>)}</div></Card>}
      <Card className="overflow-x-auto"><table className="table"><thead><tr><th>Pilih</th><th>Latihan</th><th>Tanggal</th><th>Benar</th><th>Nilai</th><th></th></tr></thead><tbody>{rows.map(a => <tr key={a.id}><td><input type="checkbox" checked={compare.includes(a.id)} onChange={() => setCompare(c => c.includes(a.id) ? c.filter(x => x !== a.id) : [...c.slice(-1), a.id])} className="accent-teal-700" /></td><td>{exercises.find(e => e.id === a.exerciseId)?.title}</td><td>{new Date(a.finishedAt || a.startedAt).toLocaleString('id-ID')}</td><td>{a.answers.filter(x => x.correct).length}/{a.answers.length}</td><td><Badge className={a.score >= 70 ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}>{a.score}</Badge></td><td><Link className="text-sm font-semibold text-teal-700" to={`/hasil/${a.id}`}>Lihat detail</Link></td></tr>)}</tbody></table></Card>
    </>}
  </div>
}

import { db } from '../db/db'
const dbAttempts = (studentId: string) => db.studentAttempts.where('studentId').equals(studentId).toArray()
const dbExercises = () => db.exercises.toArray()
