import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Check, FileQuestion, Sparkles, X } from 'lucide-react'
import { db } from '../db/db'
import { useAuth } from '../lib/auth'
import { AI_SCOPES, approveAiDraft, getAiAdapter, getAiStatus, rejectAiDraft, saveAiDrafts, type AiResponse, type AiScope } from '../lib/aiAdapter'
import { Badge, Button, Card, EmptyState, Field } from '../components/ui'
import type { CognitiveLevel, Difficulty, QuestionType } from '../types'

const SCOPE_LABELS: Record<AiScope, string> = {
  penjelasan: 'Penjelasan analisis',
  ringkasan: 'Ringkasan belajar',
  rekomendasi: 'Rekomendasi belajar',
  'draft-soal': 'Draft soal HOTS',
  'kualitas-soal': 'Pemeriksaan kualitas soal'
}

export default function AiAssistantPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState({ enabled: false, endpoint: '', scopes: [] as string[] })
  const [scope, setScope] = useState<AiScope>('ringkasan')
  const [form, setForm] = useState({
    analyticId: '', studentId: '', questionId: '', subjectId: '', topicId: '',
    indicator: '', cognitive: 'C4' as CognitiveLevel, difficulty: 'sedang' as Difficulty,
    type: 'single' as QuestionType, count: 3
  })
  const [response, setResponse] = useState<AiResponse | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const students = useLiveQuery(() => db.students.toArray(), []) || []
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray(), []) || []
  const topics = useLiveQuery(() => db.topics.toArray(), []) || []
  const questions = useLiveQuery(() => db.questions.toArray(), []) || []
  const analytics = useLiveQuery(() => db.learningAnalytics.toArray(), []) || []
  const evidence = useLiveQuery(() => db.skillEvidence.toArray(), []) || []

  useEffect(() => { getAiStatus().then(setStatus) }, [])

  const drafts = useMemo(() => questions.filter(q => q.generatedBy === 'ai' && q.status === 'draft'), [questions])
  const filteredTopics = topics.filter(t => !form.subjectId || t.subjectId === form.subjectId)

  function payloadFor(): Record<string, unknown> | null {
    if (scope === 'penjelasan') {
      const a = analytics.find(x => x.id === form.analyticId) || analytics[0]
      if (!a) { setMessage('Belum ada analitik latihan untuk dijelaskan.'); return null }
      return { score: a.score, findings: a.findings.slice(0, 8), errorPatterns: a.errorPatterns, misconceptions: a.misconceptions, recommendations: a.recommendations }
    }
    if (scope === 'ringkasan' || scope === 'rekomendasi') {
      const student = students.find(s => s.id === form.studentId) || students[0]
      if (!student) { setMessage('Belum ada data siswa.'); return null }
      const rows = analytics.filter(a => a.studentId === student.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
      const weak = evidence.filter(e => e.studentId === student.id && !e.correct).slice(0, 30)
      return {
        student: { id: student.id, name: student.name, className: student.className },
        recentScores: rows.map(a => ({ at: a.createdAt, score: a.score })),
        weakIndicators: Array.from(new Set(weak.map(e => `${e.indicatorKey}::${e.indicator}`))).slice(0, 12),
        errorPatterns: Array.from(new Set(weak.map(e => e.errorType).filter(Boolean))).slice(0, 8),
        request: scope === 'ringkasan' ? 'ringkasan perkembangan belajar' : 'rekomendasi tindak lanjut'
      }
    }
    if (scope === 'kualitas-soal') {
      const q = questions.find(x => x.id === form.questionId) || questions[0]
      if (!q) { setMessage('Belum ada soal untuk diperiksa.'); return null }
      return { code: q.code, subjectId: q.subjectId, topicId: q.topicId, cognitive: q.cognitive, difficulty: q.difficulty, prompt: q.prompt, stimulus: q.stimulus, options: q.options.map(o => ({ label: o.label, text: o.text, isCorrect: o.isCorrect })), explanation: q.explanation, indicator: q.indicator }
    }
    const topic = topics.find(t => t.id === form.topicId)
    if (!topic) { setMessage('Pilih mata pelajaran dan materi terlebih dahulu.'); return null }
    return {
      subjectId: topic.subjectId,
      topicId: topic.id,
      subTopic: topic.subTopics[0] || '',
      indicator: form.indicator || topic.tp.join('; '),
      tp: topic.tp.join('; '),
      cognitive: form.cognitive,
      difficulty: form.difficulty,
      type: form.type,
      count: Math.min(Math.max(Number(form.count) || 1, 1), 10)
    }
  }

  async function run() {
    setMessage(''); setResponse(null); setSelected([])
    const payload = payloadFor()
    if (!payload) return
    setBusy(true)
    try {
      const adapter = await getAiAdapter()
      const result = await adapter.request({ scope, payload })
      setResponse(result)
      if (!result.ok && result.error) setMessage(result.error)
      if (result.ok) setSelected(result.drafts.map((_, i) => i))
    } catch (e) { setMessage(`Asisten AI gagal: ${String(e)}`) }
    finally { setBusy(false) }
  }

  async function saveDrafts() {
    if (!response?.drafts.length || !user) return
    const chosen = response.drafts.filter((_, i) => selected.includes(i))
    if (!chosen.length) { setMessage('Pilih minimal satu draft untuk disimpan.'); return }
    setBusy(true)
    try {
      const result = await saveAiDrafts(chosen, user.id)
      setMessage(`${result.saved.length} draft disimpan. ${result.errors.length ? `Gagal: ${result.errors.join(' ')}` : ''} Draft belum aktif sampai disetujui guru.`)
    } catch (e) { setMessage(`Gagal menyimpan draft: ${String(e)}`) }
    finally { setBusy(false) }
  }

  async function approve(id: string) {
    if (!user) return
    await approveAiDraft(id, user.id)
    setMessage('Draft disetujui dan siap dipakai dalam bank soal.')
  }

  async function reject(id: string) {
    if (!user) return
    await rejectAiDraft(id, user.id)
    setMessage('Draft ditolak dan diarsipkan.')
  }

  const canRun = status.enabled && !!status.endpoint && status.scopes.includes(scope)

  return <div className="space-y-5">
    <div>
      <h1 className="text-2xl font-extrabold">Asisten AI (Opsional)</h1>
      <p className="mt-1 text-sm text-slate-500">Bantuan analisis dan draft soal melalui endpoint proxy milik sekolah. Aplikasi tetap berfungsi penuh tanpa AI.</p>
    </div>

    <Card className="border-amber-200 bg-amber-50/60">
      <div className="flex items-start gap-3"><Sparkles size={20} className="mt-0.5 shrink-0 text-amber-600" />
        <div className="text-sm text-amber-900">
          <b>Batas keamanan:</b> API key tidak pernah disimpan di browser. Asisten AI <u>tidak</u> mengubah nilai, ketuntasan, atau status penguasaan siswa. Semua soal hasil AI masuk sebagai <b>Draft</b> dan baru aktif setelah guru menyetujuinya.
          <div className="mt-2 text-xs">Status: {status.enabled && status.endpoint ? <Badge className="bg-emerald-100 text-emerald-700">Aktif • {status.endpoint}</Badge> : <Badge className="bg-slate-200 text-slate-600">Belum dikonfigurasi admin</Badge>}</div>
        </div>
      </div>
    </Card>

    {message && <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{message}</div>}

    <Card>
      <h2 className="mb-4 font-bold">Jalankan layanan</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Layanan" hint="Izin layanan ditentukan admin di Pengaturan">
          <select className="input" value={scope} onChange={e => { setScope(e.target.value as AiScope); setResponse(null) }}>
            {AI_SCOPES.map(s => <option key={s} value={s}>{SCOPE_LABELS[s]}</option>)}
          </select>
        </Field>

        {(scope === 'penjelasan') && <Field label="Analitik latihan"><select className="input" value={form.analyticId} onChange={e => setForm({ ...form, analyticId: e.target.value })}><option value="">Paling baru</option>{analytics.map(a => <option key={a.id} value={a.id}>{new Date(a.createdAt).toLocaleString('id-ID')} • {a.score}</option>)}</select></Field>}

        {(scope === 'ringkasan' || scope === 'rekomendasi') && <Field label="Siswa"><select className="input" value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}><option value="">Pilih siswa</option>{students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.className}</option>)}</select></Field>}

        {scope === 'kualitas-soal' && <Field label="Soal"><select className="input" value={form.questionId} onChange={e => setForm({ ...form, questionId: e.target.value })}><option value="">Pilih soal</option>{questions.filter(q => q.status !== 'diarsipkan').map(q => <option key={q.id} value={q.id}>{q.code} — {q.prompt.slice(0, 60)}</option>)}</select></Field>}

        {scope === 'draft-soal' && <>
          <Field label="Mata pelajaran"><select className="input" value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value, topicId: '' })}><option value="">Pilih mapel</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Materi"><select className="input" value={form.topicId} onChange={e => setForm({ ...form, topicId: e.target.value })}><option value="">Pilih materi</option>{filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          <Field label="Indikator"><input className="input" value={form.indicator} onChange={e => setForm({ ...form, indicator: e.target.value })} placeholder="Kosongkan untuk memakai TP materi" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Kognitif"><select className="input" value={form.cognitive} onChange={e => setForm({ ...form, cognitive: e.target.value as CognitiveLevel })}><option>C4</option><option>C5</option><option>C6</option></select></Field>
            <Field label="Kesulitan"><select className="input" value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value as Difficulty })}><option value="mudah">Mudah</option><option value="sedang">Sedang</option><option value="sulit">Sulit</option></select></Field>
            <Field label="Jumlah"><input type="number" min={1} max={10} className="input" value={form.count} onChange={e => setForm({ ...form, count: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Jenis soal"><select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as QuestionType })}><option value="single">Pilihan ganda</option><option value="multiple">Jawaban lebih dari satu</option></select></Field>
        </>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button disabled={!canRun || busy} onClick={run}><Sparkles size={16} /> {busy ? 'Memproses…' : 'Jalankan asisten'}</Button>
        {!canRun && <span className="text-xs text-slate-500">Aktifkan layanan ini dan isi endpoint di menu <Link className="font-semibold text-teal-700" to="/pengaturan">Pengaturan</Link>.</span>}
      </div>
    </Card>

    {response && <Card>
      <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Hasil asisten</h2>{response.model && <Badge className="bg-slate-100 text-slate-600">{response.model}</Badge>}</div>
      {response.text && <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{response.text}</div>}
      {response.drafts.length > 0 && <div className="mt-4 space-y-3">
        <p className="text-sm font-semibold">Draft soal ({response.drafts.length}) — centang yang akan disimpan</p>
        {response.drafts.map((d, i) => <div key={i} className="rounded-xl border border-slate-200 p-3">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={selected.includes(i)} onChange={() => setSelected(selected.includes(i) ? selected.filter(x => x !== i) : [...selected, i])} className="mt-1" />
            <span><b>{i + 1}. {d.prompt}</b><span className="mt-1 block text-xs text-slate-500">{d.indicator || '-'} • {d.cognitive} • {d.difficulty}</span>
              <span className="mt-1 block text-xs">{d.options.map(o => <span key={o.label} className={o.isCorrect ? 'mr-2 font-bold text-teal-700' : 'mr-2'}>{o.label}. {o.text}</span>)}</span>
            </span>
          </label>
        </div>)}
        <Button disabled={busy || !selected.length} onClick={saveDrafts}><FileQuestion size={16} /> Simpan {selected.length} draft</Button>
      </div>}
      {!response.text && !response.drafts.length && <EmptyState title="Tidak ada keluaran" description="Endpoint tidak mengembalikan teks atau draft soal." />}
    </Card>}

    <Card>
      <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Draft menunggu persetujuan guru</h2><Badge className="bg-amber-100 text-amber-700">{drafts.length} draft</Badge></div>
      {drafts.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Kode</th><th>Pertanyaan</th><th>Indikator</th><th>Aksi</th></tr></thead><tbody>{drafts.map(q => <tr key={q.id}>
        <td className="font-mono text-xs">{q.code}</td>
        <td className="max-w-md">{q.prompt}</td>
        <td className="text-xs">{q.indicator}</td>
        <td><div className="flex gap-2"><button title="Setujui" className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-50" onClick={() => approve(q.id)}><Check size={17} /></button><button title="Tolak" className="rounded-lg p-1 text-rose-600 hover:bg-rose-50" onClick={() => reject(q.id)}><X size={17} /></button><Link className="text-xs font-semibold text-teal-700 hover:underline" to="/bank-soal">Edit</Link></div></td>
      </tr>)}</tbody></table></div> : <EmptyState title="Tidak ada draft" description="Draft soal dari asisten AI akan muncul di sini untuk diperiksa guru." />}
    </Card>
  </div>
}
