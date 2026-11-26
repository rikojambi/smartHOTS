import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Database, Download, Palette, RefreshCw, Sparkles, Target, Upload } from 'lucide-react'
import { db, exportBackup, getSetting, importBackup, putSetting } from '../db/db'
import { seedDatabase } from '../data/seed'
import { Button, Card, Confirm, Field } from '../components/ui'
import { AI_SCOPES } from '../lib/aiAdapter'
import { DEFAULT_AI_CONFIG, DEFAULT_HEATMAP_COLORS, DEFAULT_REMEDIAL_SETTINGS } from '../lib/competency'

interface Thresholds { sangatBaik: number; baik: number; cukup: number; penguatan: number }
interface SyncConfig { provider: 'none' | 'firebase' | 'sheets'; endpoint: string }
interface HeatmapColors { sangatBaik: string; baik: string; cukup: string; penguatan: string; remedial: string; insufficient: string }
interface RemedialSettings { masteryThreshold: number; level1Count: number; level2Count: number; level3Count: number; enrichmentCount: number; avoidRecentDays: number }
interface AiConfigState { enabled: boolean; endpoint: string; scopes: string[] }

const COLOR_LABELS: [keyof HeatmapColors, string][] = [
  ['sangatBaik', 'Sangat baik'], ['baik', 'Baik'], ['cukup', 'Cukup'],
  ['penguatan', 'Perlu penguatan'], ['remedial', 'Perlu remedial'], ['insufficient', 'Belum cukup bukti']
]

export default function SettingsPage() {
  const [thresholds, setThresholds] = useState<Thresholds>({ sangatBaik: 85, baik: 70, cukup: 55, penguatan: 40 })
  const [sync, setSync] = useState<SyncConfig>({ provider: 'none', endpoint: '' })
  const [colors, setColors] = useState<HeatmapColors>({ ...DEFAULT_HEATMAP_COLORS })
  const [minEvidence, setMinEvidence] = useState(3)
  const [remedial, setRemedial] = useState<RemedialSettings>({ ...DEFAULT_REMEDIAL_SETTINGS })
  const [ai, setAi] = useState<AiConfigState>({ enabled: false, endpoint: '', scopes: [...DEFAULT_AI_CONFIG.scopes] })
  const [message, setMessage] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const queue = useLiveQuery(() => db.syncQueue.count(), []) || 0
  const counts = useLiveQuery(async () => ({
    soal: await db.questions.count(), siswa: await db.students.count(), latihan: await db.exercises.count(),
    hasil: await db.studentAttempts.count(), media: await db.questionMedia.count(),
    bukti: await db.skillEvidence.count(), remedial: await db.remedialPlans.count()
  }), []) || { soal: 0, siswa: 0, latihan: 0, hasil: 0, media: 0, bukti: 0, remedial: 0 }

  useEffect(() => {
    Promise.all([
      getSetting<Thresholds>('masteryThresholds', thresholds),
      getSetting<SyncConfig>('syncConfig', { provider: 'none', endpoint: '' }),
      getSetting<Partial<HeatmapColors>>('heatmapColors', {}),
      getSetting<number>('heatmapMinEvidence', 3),
      getSetting<Partial<RemedialSettings>>('remedialSettings', {}),
      getSetting<Partial<AiConfigState>>('aiConfig', {})
    ]).then(([t, s, c, min, r, a]) => {
      setThresholds({ ...t })
      setSync(s)
      setColors({ ...DEFAULT_HEATMAP_COLORS, ...c })
      setMinEvidence(Math.max(1, Number(min) || 3))
      setRemedial({ ...DEFAULT_REMEDIAL_SETTINGS, ...r })
      setAi({ enabled: a?.enabled === true, endpoint: a?.endpoint || '', scopes: Array.isArray(a?.scopes) && a.scopes.length ? a.scopes : [...DEFAULT_AI_CONFIG.scopes] })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveSettings() {
    await Promise.all([
      putSetting('masteryThresholds', thresholds),
      putSetting('syncConfig', sync),
      putSetting('heatmapColors', colors),
      putSetting('heatmapMinEvidence', minEvidence),
      putSetting('remedialSettings', remedial),
      putSetting('aiConfig', ai)
    ])
    setMessage('Pengaturan berhasil disimpan. Heatmap dan rekomendasi akan memakai nilai terbaru.')
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

  function toggleScope(scope: string) {
    setAi({ ...ai, scopes: ai.scopes.includes(scope) ? ai.scopes.filter(s => s !== scope) : [...ai.scopes, scope] })
  }

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-extrabold">Pengaturan & Backup</h1><p className="text-sm text-slate-500">Ambang penguasaan, warna heatmap, remedial, asisten AI, sinkronisasi, dan pemulihan data.</p></div>
    {message && <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{message}</div>}
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><h2 className="mb-4 font-bold">Batas kategori penguasaan (%)</h2><div className="grid grid-cols-2 gap-3">{([
        ['sangatBaik', 'Sangat baik'], ['baik', 'Baik'], ['cukup', 'Cukup'], ['penguatan', 'Perlu penguatan']
      ] as [keyof Thresholds, string][]).map(([key, label]) => <Field key={key} label={label}><input type="number" min={0} max={100} className="input" value={thresholds[key]} onChange={e => setThresholds({ ...thresholds, [key]: Number(e.target.value) })} /></Field>)}</div>
        <p className="mt-3 text-xs text-slate-500">Di bawah batas "Perlu penguatan" ditandai sebagai "Perlu remedial".</p>
      </Card>

      <Card><h2 className="mb-4 flex items-center gap-2 font-bold"><Palette size={18} /> Warna learning heatmap</h2>
        <div className="grid grid-cols-2 gap-3">{COLOR_LABELS.map(([key, label]) => <Field key={key} label={label}><div className="flex items-center gap-2"><input type="color" className="h-10 w-12 rounded border border-slate-200 bg-white p-1" value={colors[key]} onChange={e => setColors({ ...colors, [key]: e.target.value })} /><input className="input flex-1 font-mono text-xs" value={colors[key]} onChange={e => setColors({ ...colors, [key]: e.target.value })} /></div></Field>)}</div>
        <div className="mt-3"><Field label="Minimal bukti per indikator" hint="Di bawah jumlah ini sel ditandai 'belum cukup bukti', bukan 'perlu remedial'"><input type="number" min={1} max={20} className="input" value={minEvidence} onChange={e => setMinEvidence(Math.max(1, Number(e.target.value) || 1))} /></Field></div>
      </Card>

      <Card><h2 className="mb-4 flex items-center gap-2 font-bold"><Target size={18} /> Remedial adaptif</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ambang tuntas (%)"><input type="number" min={0} max={100} className="input" value={remedial.masteryThreshold} onChange={e => setRemedial({ ...remedial, masteryThreshold: Number(e.target.value) })} /></Field>
          <Field label="Jumlah soal level 1"><input type="number" min={1} max={20} className="input" value={remedial.level1Count} onChange={e => setRemedial({ ...remedial, level1Count: Number(e.target.value) })} /></Field>
          <Field label="Jumlah soal level 2"><input type="number" min={1} max={20} className="input" value={remedial.level2Count} onChange={e => setRemedial({ ...remedial, level2Count: Number(e.target.value) })} /></Field>
          <Field label="Jumlah soal level 3"><input type="number" min={1} max={20} className="input" value={remedial.level3Count} onChange={e => setRemedial({ ...remedial, level3Count: Number(e.target.value) })} /></Field>
          <Field label="Jumlah soal pengayaan"><input type="number" min={1} max={20} className="input" value={remedial.enrichmentCount} onChange={e => setRemedial({ ...remedial, enrichmentCount: Number(e.target.value) })} /></Field>
          <Field label="Hindari soal terpakai (hari)"><input type="number" min={0} max={365} className="input" value={remedial.avoidRecentDays} onChange={e => setRemedial({ ...remedial, avoidRecentDays: Number(e.target.value) })} /></Field>
        </div>
        <p className="mt-3 text-xs text-slate-500">Mesin remedial tidak membuat soal atau kunci jawaban baru. Jika bank soal tidak cukup, guru akan mendapat peringatan.</p>
      </Card>

      <Card><h2 className="mb-4 flex items-center gap-2 font-bold"><Sparkles size={18} /> Asisten AI (opsional)</h2>
        <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={ai.enabled} onChange={e => setAi({ ...ai, enabled: e.target.checked })} /> Aktifkan asisten AI</label>
        <Field label="URL endpoint proxy" hint="Endpoint server yang menyimpan API key. Tidak ada field API key di aplikasi ini.">
          <input className="input" value={ai.endpoint} onChange={e => setAi({ ...ai, endpoint: e.target.value })} placeholder="https://server-sekolah/ai/hots" />
        </Field>
        <div className="mt-3"><p className="label">Layanan yang diizinkan</p><div className="mt-2 flex flex-wrap gap-3">{AI_SCOPES.map(s => <label key={s} className="flex items-center gap-1 text-xs text-slate-600"><input type="checkbox" checked={ai.scopes.includes(s)} onChange={() => toggleScope(s)} /> {s}</label>)}</div></div>
        <p className="mt-3 text-xs text-slate-500">Asisten AI hanya menghasilkan teks bantuan dan draft soal. Nilai dan ketuntasan siswa tidak pernah diubah oleh AI.</p>
      </Card>

      <Card><h2 className="mb-4 font-bold">Sinkronisasi</h2><Field label="Provider"><select className="input" value={sync.provider} onChange={e => setSync({ ...sync, provider: e.target.value as SyncConfig['provider'] })}><option value="none">Lokal saja (IndexedDB)</option><option value="firebase">Firebase / Cloud Function</option><option value="sheets">Google Sheets API</option></select></Field>
        <div className="mt-3"><Field label="URL endpoint" hint="Endpoint menerima POST JSON { tasks: [...] }"><input className="input" value={sync.endpoint} onChange={e => setSync({ ...sync, endpoint: e.target.value })} placeholder="https://…" /></Field></div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span>{queue} perubahan menunggu</span><Button variant="secondary" onClick={syncNow}><RefreshCw size={15} /> Sinkronkan</Button></div>
        <p className="mt-2 text-xs text-slate-500">Aplikasi tetap berfungsi penuh tanpa cloud. Antrean sinkronisasi dibuat otomatis setiap perubahan soal/latihan.</p>
      </Card>

      <Card><h2 className="mb-4 flex items-center gap-2 font-bold"><Database size={18} /> Cadangan data</h2>
        <div className="grid grid-cols-4 gap-2 text-center text-xs sm:grid-cols-7">{Object.entries(counts).map(([k, v]) => <div key={k} className="rounded-xl bg-slate-50 p-2"><div className="text-lg font-bold text-teal-700">{v}</div><div className="text-slate-500">{k}</div></div>)}</div>
        <div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" onClick={backup}><Download size={16} /> Unduh backup JSON</Button><input type="file" accept=".json" className="input max-w-xs" onChange={e => setRestoreFile(e.target.files?.[0] || null)} /><Button onClick={restore}><Upload size={16} /> Pulihkan</Button></div>
      </Card>
    </div>
    <div className="flex justify-end"><Button onClick={saveSettings}>Simpan semua pengaturan</Button></div>
    <Card><h2 className="mb-4 font-bold">Data awal</h2><p className="text-sm text-slate-600">Mengembalikan 10 mata pelajaran, 100 soal HOTS, akun demo, dan latihan contoh. Tindakan ini menghapus perubahan saat ini.</p>
      <div className="mt-4"><Button variant="danger" onClick={() => setConfirmReset(true)}>Reset ke data awal</Button></div>
    </Card>
    <Confirm open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={reset} message="Yakin menghapus semua data saat ini dan mengembalikan data awal? Pastikan Anda sudah mengunduh backup." />
  </div>
}
