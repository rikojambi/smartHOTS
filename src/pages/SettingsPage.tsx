import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Database, Download, RefreshCw, Upload } from 'lucide-react'
import { db, exportBackup, getSetting, importBackup, putSetting } from '../db/db'
import { seedDatabase } from '../data/seed'
import { Button, Card, Confirm, Field } from '../components/ui'

interface Thresholds { sangatBaik: number; baik: number; cukup: number; penguatan: number }
interface SyncConfig { provider: 'none' | 'firebase' | 'sheets'; endpoint: string }

export default function SettingsPage() {
  const [thresholds, setThresholds] = useState<Thresholds>({ sangatBaik: 85, baik: 70, cukup: 55, penguatan: 40 })
  const [sync, setSync] = useState<SyncConfig>({ provider: 'none', endpoint: '' })
  const [message, setMessage] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const queue = useLiveQuery(() => db.syncQueue.count(), []) || 0
  const counts = useLiveQuery(async () => ({
    soal: await db.questions.count(), siswa: await db.students.count(), latihan: await db.exercises.count(),
    hasil: await db.studentAttempts.count(), media: await db.questionMedia.count()
  }), []) || { soal: 0, siswa: 0, latihan: 0, hasil: 0, media: 0 }

  useEffect(() => {
    getSetting<Thresholds>('masteryThresholds', thresholds).then(setThresholds)
    getSetting<SyncConfig>('syncConfig', { provider: 'none', endpoint: '' }).then(setSync)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveSettings() {
    await putSetting('masteryThresholds', thresholds)
    await putSetting('syncConfig', sync)
    setMessage('Pengaturan berhasil disimpan.')
  }
  async function backup() {
    const json = await exportBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `smart-hots-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage('Backup lengkap berhasil diunduh.')
  }
  async function restore() {
    if (!restoreFile) { setMessage('Pilih file backup JSON terlebih dahulu.'); return }
    try {
      await importBackup(await restoreFile.text())
      setMessage('Backup berhasil dipulihkan. Muat ulang halaman untuk mulai menggunakan data.')
    } catch (e) { setMessage(`Gagal memulihkan: ${String(e)}`) }
  }
  async function syncNow() {
    const tasks = await db.syncQueue.toArray()
    if (!tasks.length) { setMessage('Tidak ada perubahan yang menunggu sinkronisasi.'); return }
    if (sync.provider === 'none') { setMessage(`${tasks.length} perubahan tetap tersimpan lokal. Aktifkan provider sinkronisasi untuk mengirim ke server.`); return }
    if (!sync.endpoint) { setMessage('URL endpoint sinkronisasi belum diisi.'); return }
    try {
      const res = await fetch(sync.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tasks }) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await db.syncQueue.clear()
      setMessage(`${tasks.length} perubahan berhasil disinkronkan.`)
    } catch (e) { setMessage(`Sinkronisasi gagal: ${String(e)}. Tugas tetap tersimpan untuk dicoba lagi.`) }
  }
  async function reset() {
    await seedDatabase(true)
    setConfirmReset(false); setMessage('Data awal berhasil dikembalikan.')
  }

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-extrabold">Pengaturan & Backup</h1><p className="text-sm text-slate-500">Ambang penguasaan, penilaian, sinkronisasi, dan pemulihan data.</p></div>
    {message && <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{message}</div>}
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><h2 className="mb-4 font-bold">Batas kategori penguasaan (%)</h2><div className="grid grid-cols-2 gap-3">{([
        ['sangatBaik', 'Sangat baik'], ['baik', 'Baik'], ['cukup', 'Cukup'], ['penguatan', 'Perlu penguatan']
      ] as [keyof Thresholds, string][]).map(([key, label]) => <Field key={key} label={label}><input type="number" min={0} max={100} className="input" value={thresholds[key]} onChange={e => setThresholds({ ...thresholds, [key]: Number(e.target.value) })} /></Field>)}</div>
        <p className="mt-3 text-xs text-slate-500">Di bawah batas "Perlu penguatan" ditandai sebagai "Perlu remedial".</p>
        <div className="mt-4 flex justify-end"><Button onClick={saveSettings}>Simpan pengaturan</Button></div>
      </Card>

      <Card><h2 className="mb-4 font-bold">Sinkronisasi</h2><Field label="Provider"><select className="input" value={sync.provider} onChange={e => setSync({ ...sync, provider: e.target.value as SyncConfig['provider'] })}><option value="none">Lokal saja (IndexedDB)</option><option value="firebase">Firebase / Cloud Function</option><option value="sheets">Google Sheets API</option></select></Field>
        <div className="mt-3"><Field label="URL endpoint" hint="Endpoint menerima POST JSON { tasks: [...] }"><input className="input" value={sync.endpoint} onChange={e => setSync({ ...sync, endpoint: e.target.value })} placeholder="https://…" /></Field></div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span>{queue} perubahan menunggu</span><Button variant="secondary" onClick={syncNow}><RefreshCw size={15} /> Sinkronkan</Button></div>
        <p className="mt-2 text-xs text-slate-500">Aplikasi tetap berfungsi penuh tanpa cloud. Antrean sinkronisasi dibuat otomatis setiap perubahan soal/latihan.</p>
      </Card>

      <Card><h2 className="mb-4 flex items-center gap-2 font-bold"><Database size={18} /> Cadangan data</h2>
        <div className="grid grid-cols-5 gap-2 text-center text-xs">{Object.entries(counts).map(([k, v]) => <div key={k} className="rounded-xl bg-slate-50 p-2"><div className="text-lg font-bold text-teal-700">{v}</div><div className="text-slate-500">{k}</div></div>)}</div>
        <div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" onClick={backup}><Download size={16} /> Unduh backup JSON</Button><input type="file" accept=".json" className="input max-w-xs" onChange={e => setRestoreFile(e.target.files?.[0] || null)} /><Button onClick={restore}><Upload size={16} /> Pulihkan</Button></div>
      </Card>

      <Card><h2 className="mb-4 font-bold">Data awal</h2><p className="text-sm text-slate-600">Mengembalikan 10 mata pelajaran, 100 soal HOTS, akun demo, dan latihan contoh. Tindakan ini menghapus perubahan saat ini.</p>
        <div className="mt-4"><Button variant="danger" onClick={() => setConfirmReset(true)}>Reset ke data awal</Button></div>
      </Card>
    </div>
    <Confirm open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={reset} message="Yakin menghapus semua data saat ini dan mengembalikan data awal? Pastikan Anda sudah mengunduh backup." />
  </div>
}
