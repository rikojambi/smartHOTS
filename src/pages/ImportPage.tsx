import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, CheckCircle2, FileUp, ImageIcon, Upload } from 'lucide-react'
import { db, queueSync, uid } from '../db/db'
import { useAuth } from '../lib/auth'
import { Badge, Button, Card, Field } from '../components/ui'
import { downloadTemplate, parseDocx } from '../lib/docx'
import type { CognitiveLevel, Difficulty, ParsedQuestion, QuestionType } from '../types'

function BlobPreview({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState('')
  useEffect(() => { const u = URL.createObjectURL(blob); setUrl(u); return () => URL.revokeObjectURL(u) }, [blob])
  return url ? <img src={url} className="h-20 w-20 rounded-lg border object-contain" alt="Gambar hasil parsing" /> : null
}

type ImportDraft = ReturnType<typeof emptyDraft>

const emptyDraft = (q: ParsedQuestion) => {
  return {
    tempId: q.tempId, number: q.number, type: q.type as QuestionType,
    stimulus: q.stimulus, prompt: q.prompt, options: q.options.map(o => ({ ...o })),
    answer: [...q.answer], explanation: q.explanation, tp: q.tp,
    cognitive: q.cognitive as CognitiveLevel, difficulty: q.difficulty as Difficulty,
    indicator: `Menganalisis kasus pada soal ${q.number}`, images: q.images, warnings: q.warnings
  }
}

export default function ImportPage() {
  const { user } = useAuth()
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray(), []) || []
  const topics = useLiveQuery(() => db.topics.orderBy('order').toArray(), []) || []
  const history = useLiveQuery(() => db.importHistory.reverse().sortBy('createdAt').then(a => a.reverse()), []) || []
  const [subject, setSubject] = useState(subjects[0]?.id || 'MAT')
  const [topic, setTopic] = useState('')
  const [semester, setSemester] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ImportDraft[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  async function doParse() {
    if (!file) { setErrors(['Pilih file DOCX terlebih dahulu.']); return }
    setBusy(true); setErrors([]); setMessage('')
    try {
      const res = await parseDocx(file)
      setParsed(res.questions.map(q => emptyDraft(q)))
      setErrors(res.errors)
      setExpanded(res.questions[0]?.tempId || null)
    } catch (e) { setErrors([String(e)]); setParsed([]) }
    setBusy(false)
  }

  function update(id: string, patch: Partial<ImportDraft>) {
    setParsed(list => list.map(q => q.tempId === id ? { ...q, ...patch } : q))
  }
  function updateOption(id: string, label: string, text: string) {
    setParsed(list => list.map(q => q.tempId === id ? { ...q, options: q.options.map(o => o.label === label ? { ...o, text } : o) } : q))
  }
  function toggleAnswer(id: string, label: string, type: QuestionType) {
    setParsed(list => list.map(q => q.tempId === id ? {
      ...q, answer: type === 'single' ? [label] : q.answer.includes(label) ? q.answer.filter(a => a !== label) : [...q.answer, label]
    } : q))
  }

  async function confirmImport() {
    if (!parsed.length) return
    const problems: string[] = []
    parsed.forEach(q => {
      if (!q.prompt.trim()) problems.push(`Soal ${q.number}: pertanyaan kosong.`)
      if (q.options.filter(o => o.text.trim()).length < 2) problems.push(`Soal ${q.number}: pilihan kurang dari dua.`)
      if (!q.answer.length) problems.push(`Soal ${q.number}: kunci belum ditentukan.`)
      if (q.type === 'multiple' && q.answer.length < 2) problems.push(`Soal ${q.number}: multiple response harus memiliki ≥2 kunci.`)
    })
    if (problems.length) { setErrors([...errors, ...problems]); return }

    setBusy(true)
    const topicRow = topics.find(t => t.id === topic)
    const now = Date.now()
    let imported = 0
    for (const p of parsed) {
      const id = uid('q-')
      const mediaMap = new Map<string, string>()
      for (const img of p.images) {
        const newId = uid('media-')
        mediaMap.set(img.id, newId)
        await db.questionMedia.put({ id: newId, name: img.name, mime: img.blob.type || 'image/png', blob: img.blob, questionId: id, location: img.location, createdAt: now })
      }
      const labels = ['A', 'B', 'C', 'D', 'E']
      await db.questions.put({
        id, code: `IMP-${subject}-${p.number}-${now.toString(36).slice(-4).toUpperCase()}`,
        subjectId: subject, topicId: topic || topics.find(t => t.subjectId === subject)?.id || '',
        subTopic: 'Hasil import', category: topicRow?.category, semester,
        cp: topicRow?.cp || '', tp: p.tp || topicRow?.tp.join('; ') || '', indicator: p.indicator,
        cognitive: p.cognitive, difficulty: p.difficulty, type: p.type, status: 'perlu_diperiksa', active: true,
        stimulus: p.stimulus,
        stimulusMediaId: p.images.find(i => i.location === 'stimulus') ? mediaMap.get(p.images.find(i => i.location === 'stimulus')!.id) : undefined,
        prompt: p.prompt,
        options: labels.map((label, i) => ({
          id: uid('opt-'), label, text: p.options[i]?.text || '',
          isCorrect: p.answer.includes(label),
          reason: p.answer.includes(label) ? 'Sesuai kunci jawaban hasil import.' : 'Pilihan tidak sesuai kunci.',
          mediaId: p.images.find(i => i.location === 'option' && i.optionLabel === label) ? mediaMap.get(p.images.find(i => i.location === 'option' && i.optionLabel === label)!.id) : undefined
        })),
        explanation: p.explanation, competency: 'Kompetensi sesuai indikator',
        misconception: 'Perlu ditelaah guru', recommendation: 'Latihan penguatan pada materi terkait',
        teacherId: user?.id || 'teacher-1', version: 1, createdAt: now, updatedAt: now
      })
      await queueSync('questions', id)
      imported++
    }
    await db.importHistory.put({ id: uid('imp-'), fileName: file?.name || 'docx', teacherId: user?.id || '', subjectId: subject, topicId: topic, detected: parsed.length, imported, errors: [...errors, ...parsed.flatMap(p => p.warnings)], createdAt: now })
    setBusy(false); setMessage(`${imported} soal berhasil ditambahkan ke bank soal dengan status "Perlu diperiksa".`)
    setParsed([]); setFile(null); setErrors([])
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold">Import Soal dari Microsoft Word</h1><p className="text-sm text-slate-500">Parser membaca struktur DOCX, tabel, persamaan, dan gambar yang tertanam.</p></div>
      <Button variant="secondary" onClick={downloadTemplate}><FileUp size={16} /> Unduh template Word</Button>
    </div>

    <Card><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Mata pelajaran"><select className="input" value={subject} onChange={e => { setSubject(e.target.value); setTopic('') }}>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Materi"><select className="input" value={topic} onChange={e => setTopic(e.target.value)}><option value="">Gunakan materi pertama mapel</option>{topics.filter(t => t.subjectId === subject).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
      <Field label="Semester"><select className="input" value={semester} onChange={e => setSemester(Number(e.target.value))}><option value={1}>1</option><option value={2}>2</option></select></Field>
      <Field label="File DOCX"><input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="input" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>
    </div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><Button onClick={doParse} disabled={busy || !file}><Upload size={16} /> {busy ? 'Memproses…' : 'Baca dokumen'}</Button><span className="text-xs text-slate-500">Hasil parsing selalu diperiksa guru sebelum disimpan.</span></div>
    </Card>

    {message && <div className="flex items-center gap-2 rounded-xl bg-teal-50 p-4 text-sm font-semibold text-teal-800"><CheckCircle2 size={18} /> {message}</div>}
    {errors.length > 0 && <Card className="border-rose-200 bg-rose-50"><h3 className="mb-2 flex items-center gap-2 font-bold text-rose-800"><AlertTriangle size={18} /> Laporan kesalahan import</h3><ul className="list-inside list-disc space-y-1 text-sm text-rose-700">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></Card>}

    {parsed.length > 0 && <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Hasil parsing ({parsed.length} soal)</h2><Button onClick={confirmImport} disabled={busy}>Simpan {parsed.length} soal ke bank soal</Button></div>
      {parsed.map(q => <Card key={q.tempId}>
        <button className="flex w-full items-center justify-between text-left" onClick={() => setExpanded(expanded === q.tempId ? null : q.tempId)}>
          <div className="flex items-center gap-3"><Badge className="bg-teal-100 text-teal-700">SOAL {q.number}</Badge><span className="font-semibold">{q.prompt.slice(0, 90) || '(pertanyaan kosong)'}…</span></div>
          <div className="flex items-center gap-2"><Badge className={q.type === 'single' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}>{q.type === 'single' ? 'PG' : 'MR'}</Badge>{q.images.length > 0 && <ImageIcon size={16} className="text-teal-600" />}{q.warnings.length > 0 && <Badge className="bg-amber-100 text-amber-700">{q.warnings.length} peringatan</Badge>}</div>
        </button>
        {expanded === q.tempId && <div className="mt-4 space-y-3 border-t pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Jenis"><select className="input" value={q.type} onChange={e => update(q.tempId, { type: e.target.value as QuestionType })}><option value="single">Pilihan ganda</option><option value="multiple">Multiple response</option></select></Field>
            <Field label="Kognitif"><select className="input" value={q.cognitive} onChange={e => update(q.tempId, { cognitive: e.target.value as CognitiveLevel })}><option>C4</option><option>C5</option><option>C6</option></select></Field>
            <Field label="Kesulitan"><select className="input" value={q.difficulty} onChange={e => update(q.tempId, { difficulty: e.target.value as Difficulty })}><option value="mudah">Mudah</option><option value="sedang">Sedang</option><option value="sulit">Sulit</option></select></Field>
          </div>
          <Field label="Stimulus"><textarea className="input min-h-[80px]" value={q.stimulus} onChange={e => update(q.tempId, { stimulus: e.target.value })} /></Field>
          <Field label="Pertanyaan"><textarea className="input min-h-[80px]" value={q.prompt} onChange={e => update(q.tempId, { prompt: e.target.value })} /></Field>
          <div className="grid gap-2 sm:grid-cols-2">{q.options.map(o => <div key={o.label} className="rounded-xl border p-2"><div className="flex items-center gap-2"><label className="flex items-center gap-1 text-sm font-bold"><input type={q.type === 'single' ? 'radio' : 'checkbox'} name={`k-${q.tempId}`} checked={q.answer.includes(o.label)} onChange={() => toggleAnswer(q.tempId, o.label, q.type)} className="accent-teal-700" />{o.label}</label><input className="input" value={o.text} onChange={e => updateOption(q.tempId, o.label, e.target.value)} /></div></div>)}</div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="TP"><input className="input" value={q.tp} onChange={e => update(q.tempId, { tp: e.target.value })} /></Field><Field label="Indikator"><input className="input" value={q.indicator} onChange={e => update(q.tempId, { indicator: e.target.value })} /></Field></div>
          <Field label="Pembahasan"><textarea className="input min-h-[80px]" value={q.explanation} onChange={e => update(q.tempId, { explanation: e.target.value })} /></Field>
          {q.images.length > 0 && <div><div className="mb-2 text-xs font-semibold uppercase text-slate-400">Gambar terdeteksi ({q.images.length})</div><div className="flex flex-wrap gap-3">{q.images.map(img => <div key={img.id} className="text-center"><BlobPreview blob={img.blob} /><div className="text-[10px] text-slate-500">{img.name} • {img.location}</div></div>)}</div></div>}
          {q.warnings.length > 0 && <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{q.warnings.join(' • ')}</div>}
        </div>}
      </Card>)}
    </div>}

    <Card><h2 className="mb-3 font-bold">Riwayat import</h2>
      {history.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Tanggal</th><th>File</th><th>Mapel</th><th>Terdeteksi</th><th>Disimpan</th><th>Catatan</th></tr></thead><tbody>{history.map(h => <tr key={h.id}><td>{new Date(h.createdAt).toLocaleString('id-ID')}</td><td>{h.fileName}</td><td>{subjects.find(s => s.id === h.subjectId)?.name}</td><td>{h.detected}</td><td>{h.imported}</td><td className="text-xs text-slate-500">{h.errors.slice(0, 2).join('; ')}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">Belum ada dokumen yang diimpor.</p>}
    </Card>
  </div>
}
