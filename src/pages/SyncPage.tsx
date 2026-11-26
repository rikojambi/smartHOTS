import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { FileJson, RefreshCw, Upload } from 'lucide-react'
import { db } from '../db/db'
import { Badge, Button, Card, EmptyState, Field } from '../components/ui'
import { importResultSyncPackage, parseResultSyncPackage, type ImportSummary, type ResultSyncPackage } from '../lib/sync'

export default function SyncPage() {
  const [file, setFile] = useState<File | null>(null)
  const [pkg, setPkg] = useState<ResultSyncPackage | null>(null)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || []
  const attempts = useLiveQuery(() => db.studentAttempts.toArray(), []) || []
  const syncedCount = attempts.filter(a => a.status === 'selesai').length

  async function readFile() {
    if (!file) { setError('Pilih file JSON terlebih dahulu.'); return }
    setBusy(true); setError(''); setSummary(null); setPkg(null)
    try {
      setPkg(parseResultSyncPackage(await file.text()))
    } catch (e) { setError(String(e instanceof Error ? e.message : e)) }
    finally { setBusy(false) }
  }

  async function doImport() {
    if (!pkg) return
    setBusy(true); setError('')
    try {
      setSummary(await importResultSyncPackage(pkg))
      setPkg(null); setFile(null)
    } catch (e) { setError(String(e instanceof Error ? e.message : e)) }
    finally { setBusy(false) }
  }

  return <div className="space-y-5">
    <div>
      <h1 className="text-2xl font-extrabold">Sinkronisasi Hasil Latihan</h1>
      <p className="mt-1 text-sm text-slate-500">Terima hasil latihan dari perangkat siswa melalui file paket JSON. Data yang sudah ada tidak akan ditimpa.</p>
    </div>

    {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    {summary && <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">
      Impor selesai: <b>{summary.attempts}</b> hasil latihan baru, <b>{summary.analytics}</b> analitik, <b>{summary.recommendations}</b> rekomendasi, <b>{summary.questions}</b> soal, <b>{summary.exercises}</b> paket latihan, <b>{summary.skillEvidence}</b> bukti kompetensi, <b>{summary.remedialPlans}</b> rencana remedial, dan <b>{summary.media}</b> media soal ditambahkan.
      {summary.skippedAttempts > 0 && ` ${summary.skippedAttempts} hasil sudah ada dan dilewati.`}
    </div>}

    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-teal-50 p-2 text-teal-700"><Upload size={20} /></div><div><h2 className="font-bold">Impor paket hasil siswa</h2><p className="text-xs text-slate-500">Pilih file .json yang diunduh siswa dari menu Mulai Latihan.</p></div></div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="File paket hasil"><input type="file" accept=".json,application/json" className="input max-w-md" onChange={e => { setFile(e.target.files?.[0] || null); setPkg(null); setError('') }} /></Field>
          <Button disabled={!file || busy} onClick={readFile}><FileJson size={16} /> {busy && !pkg ? 'Membaca…' : 'Baca file'}</Button>
        </div>

        {pkg && <div className="mt-5 space-y-4 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3">
            <div><b>{pkg.student.name}</b> <span className="text-slate-500">• {pkg.student.className} • {pkg.student.school}</span><div className="text-xs text-slate-500">Diekspor {new Date(pkg.exportedAt).toLocaleString('id-ID')}</div></div>
            <div className="flex flex-wrap gap-2"><Badge className="bg-blue-100 text-blue-700">{pkg.attempts.length} hasil</Badge><Badge className="bg-violet-100 text-violet-700">{pkg.analytics.length} analitik</Badge><Badge className="bg-amber-100 text-amber-700">{pkg.recommendations.length} rekomendasi</Badge><Badge className="bg-emerald-100 text-emerald-700">{pkg.skillEvidence?.length || 0} bukti</Badge><Badge className="bg-rose-100 text-rose-700">{pkg.remedialPlans?.length || 0} remedial</Badge><Badge className="bg-slate-100 text-slate-700">v{pkg.version}</Badge></div>
          </div>
          {pkg.attempts.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Paket latihan</th><th>Nilai</th><th>Selesai</th><th>Status</th></tr></thead><tbody>{pkg.attempts.map(a => <tr key={a.id}><td>{exercises.find(e => e.id === a.exerciseId)?.title || pkg.exercises.find(e => e.id === a.exerciseId)?.title || a.exerciseId}</td><td><b>{a.score}</b></td><td>{a.finishedAt ? new Date(a.finishedAt).toLocaleString('id-ID') : '-'}</td><td><Badge className="bg-teal-100 text-teal-700">Selesai</Badge></td></tr>)}</tbody></table></div> : <EmptyState title="Tidak ada hasil selesai" description="Paket ini tidak memuat latihan yang sudah selesai." />}
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => { setPkg(null); setFile(null) }}>Batal</Button><Button disabled={busy} onClick={doImport}><RefreshCw size={16} /> {busy ? 'Mengimpor…' : 'Impor ke aplikasi guru'}</Button></div>
        </div>}
      </Card>

      <div className="space-y-5">
        <Card><h2 className="font-bold">Ringkasan lokal</h2><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-500">Hasil latihan selesai</span><b>{syncedCount}</b></div><div className="flex justify-between"><span className="text-slate-500">Paket latihan</span><b>{exercises.length}</b></div></div></Card>
        <Card><h2 className="font-bold">Cara penggunaan</h2><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600"><li>Siswa membuka <b>Mulai Latihan</b> di perangkatnya.</li><li>Siswa mengklik <b>Unduh hasil untuk guru</b> dan mengirim file JSON-nya.</li><li>Guru/admin membuka halaman ini, memilih file, lalu <b>Baca file</b>.</li><li>Periksa pratinjau, lalu klik <b>Impor ke aplikasi guru</b>.</li></ol><p className="mt-3 text-xs text-slate-500">Hasil dengan ID yang sama tidak akan ditimpa, sehingga impor berulang aman.</p></Card>
      </div>
    </div>
  </div>
}
