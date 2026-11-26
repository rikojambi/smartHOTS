import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, Ban, CheckCircle2, Download,
  FileText, FileUp, History, ImageIcon, Plus, RotateCcw, Sigma, Table2, Trash2, Upload, X
} from 'lucide-react'
import { db, uid } from '../db/db'
import { useAuth } from '../lib/auth'
import { Badge, Button, Card, EmptyState, Field, ProgressBar, StatCard } from '../components/ui'
import { MediaView, RichText } from '../components/RichText'
import { parseDocx, type DocxParseResult } from '../lib/docx'
import { downloadQuestionTemplate } from '../lib/docxTemplate'
import {
  detectDuplicates, draftFromParsed, saveImport, sanitizeHtml, validateDraft,
  type DraftImage, type ImportDraft, type SaveImportResult
} from '../lib/docxImport'
import type { CognitiveLevel, Difficulty, ImportHistory, QuestionType } from '../types'

const STEPS = ['Unggah', 'Analisis', 'Ekstraksi', 'Preview & Edit', 'Simpan']

interface Meta {
  subjectId: string
  topicId: string
  semester: number
  className: string
}

const fileCache = new Map<string, File>()
const fileKey = (file: File) => `${file.name}|${file.size}|${file.lastModified}`

function cachedFileFor(fileName: string) {
  for (const [key, file] of fileCache) {
    if (key.startsWith(`${fileName}|`)) return file
  }
  return undefined
}

function BlobPreview({ blob, className = 'h-16 w-16 rounded-lg border object-contain' }: { blob: Blob; className?: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])
  return url ? <img src={url} className={className} alt="Pratinjau gambar" /> : null
}

/** RichText for normal prose; allow-listed HTML for Word tables. */
function SafeRichText({ text, className = '' }: { text: string; className?: string }) {
  if (/<\s*(table|tr|td|th)\b/i.test(text)) {
    return <div className={`leading-relaxed ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />
  }
  return <RichText text={text} className={className} />
}

export default function ImportPage() {
  const { user } = useAuth()
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray(), []) || []
  const topics = useLiveQuery(() => db.topics.orderBy('order').toArray(), []) || []
  const questions = useLiveQuery(() => db.questions.toArray(), []) || []
  const history = useLiveQuery(() => db.importHistory.orderBy('createdAt').reverse().toArray(), []) || []

  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [meta, setMeta] = useState<Meta>({ subjectId: '', topicId: '', semester: 1, className: '' })
  const [parseResult, setParseResult] = useState<DocxParseResult | null>(null)
  const [drafts, setDrafts] = useState<ImportDraft[]>([])
  const [fatalError, setFatalError] = useState('')
  const [progress, setProgress] = useState({ percent: 0, label: '' })
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<SaveImportResult | null>(null)
  const [reimportOf, setReimportOf] = useState<string | undefined>()
  const [reimportMessage, setReimportMessage] = useState('')

  useEffect(() => {
    if (!meta.subjectId && subjects.length) setMeta(current => ({ ...current, subjectId: subjects[0].id }))
  }, [subjects, meta.subjectId])

  const subjectRows = subjects.filter(subject => subject.id === meta.subjectId)
  const topicRows = topics.filter(topic => topic.subjectId === meta.subjectId)
  const selectedSubject = subjects.find(subject => subject.id === meta.subjectId)
  const acceptedDrafts = drafts.filter(draft => draft.accepted)
  const validationProblems = acceptedDrafts.flatMap(draft => draft.validation.map(problem => `Soal ${draft.number}: ${problem}`))
  const parseErrors = fatalError ? [fatalError, ...(parseResult?.errors || [])] : (parseResult?.errors || [])
  const parseWarnings = [
    ...(parseResult?.warnings || []),
    ...drafts.flatMap(draft => draft.warnings.map(warning => `Soal ${draft.number}: ${warning}`))
  ]
  const duplicateCount = drafts.filter(draft => draft.duplicate).length
  const activeImageCount = drafts.reduce((total, draft) => total + draft.images.filter(image => !image.removed).length, 0)

  const stepValid = [
    Boolean(file && meta.subjectId),
    Boolean(parseResult && parseErrors.length === 0),
    acceptedDrafts.length > 0,
    acceptedDrafts.length > 0 && validationProblems.length === 0,
    acceptedDrafts.length > 0 && validationProblems.length === 0 && !saveResult
  ][step - 1]

  function pickFile(selected?: File) {
    if (!selected) return
    fileCache.set(fileKey(selected), selected)
    setFile(selected)
    setParseResult(null)
    setDrafts([])
    setFatalError('')
    setSaveResult(null)
    setReimportMessage('')
    setReimportOf(undefined)
    setProgress({ percent: 0, label: '' })
    setStep(1)
  }

  async function runParse(inputFile: File, override?: Partial<Meta>) {
    setBusy(true)
    setFatalError('')
    setProgress({ percent: 0, label: 'Menyiapkan…' })
    try {
      const result = await parseDocx(inputFile, (percent, label) => setProgress({ percent, label }))
      setParseResult(result)
      const effective: Meta = { ...meta, ...override }
      const nextDrafts = result.questions.map(draftFromParsed)
      const topicName = topics.find(topic => topic.id === effective.topicId)?.name || result.metadata.topic
      const duplicates = detectDuplicates(nextDrafts, questions, effective.topicId, topicName)
      setDrafts(nextDrafts.map(draft => ({
        ...draft,
        duplicate: duplicates[draft.tempId],
        accepted: true,
        validation: validateDraft(draft)
      })))
      const detectedSubject = subjects.find(subject => result.metadata.subject && (
        subject.name.toLowerCase() === result.metadata.subject.toLowerCase() ||
        subject.shortName.toLowerCase() === result.metadata.subject.toLowerCase()
      ))
      const detectedTopic = topics.find(topic =>
        topic.name.toLowerCase() === (result.metadata.topic || '').toLowerCase() &&
        topic.subjectId === (detectedSubject?.id || effective.subjectId))
      setMeta(current => ({
        ...current,
        subjectId: override?.subjectId || detectedSubject?.id || current.subjectId,
        topicId: override?.topicId || detectedTopic?.id || current.topicId,
        semester: override?.semester || Number(result.metadata.semester) || current.semester,
        className: override?.className ?? (result.metadata.className || current.className)
      }))
      setExpanded(nextDrafts[0]?.tempId || null)
      setStep(2)
    } catch (error) {
      setParseResult(null)
      setDrafts([])
      setFatalError(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  function mutateDraft(id: string, update: (draft: ImportDraft) => ImportDraft) {
    setDrafts(list => list.map(draft => {
      if (draft.tempId !== id) return draft
      const next = update(draft)
      return { ...next, validation: validateDraft(next) }
    }))
  }

  function patchDraft(id: string, patch: Partial<ImportDraft>) {
    mutateDraft(id, draft => ({ ...draft, ...patch }))
  }

  function patchOption(id: string, label: string, text: string) {
    mutateDraft(id, draft => ({
      ...draft,
      options: draft.options.map(option => option.label === label ? { ...option, text } : option)
    }))
  }

  function toggleAnswer(draft: ImportDraft, label: string) {
    const answer = draft.type === 'single' ? [label]
      : draft.answer.includes(label) ? draft.answer.filter(item => item !== label) : [...draft.answer, label]
    patchDraft(draft.tempId, { answer })
  }

  function addOption(draft: ImportDraft) {
    const label = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find(item => !draft.options.some(option => option.label === item))
      || `O${draft.options.length + 1}`
    mutateDraft(draft.tempId, current => ({ ...current, options: [...current.options, { label, text: '' }] }))
  }

  function removeOption(draft: ImportDraft, label: string) {
    mutateDraft(draft.tempId, current => ({
      ...current,
      options: current.options.filter(option => option.label !== label),
      answer: current.answer.filter(item => item !== label),
      images: current.images.map(image => image.optionLabel === label ? { ...image, removed: true } : image)
    }))
  }

  function addImage(tempId: string, location: DraftImage['location'], optionLabel: string | undefined, selected?: File) {
    if (!selected || !selected.type.startsWith('image/')) return
    const image: DraftImage = {
      id: uid('img-'), name: selected.name, blob: selected, location, optionLabel
    }
    mutateDraft(tempId, draft => ({ ...draft, images: [...draft.images, image] }))
  }

  function removeImage(tempId: string, imageId: string) {
    mutateDraft(tempId, draft => ({
      ...draft,
      images: draft.images.map(image => image.id === imageId ? { ...image, removed: true } : image)
    }))
  }

  function replaceImage(tempId: string, imageId: string, selected?: File) {
    if (!selected || !selected.type.startsWith('image/')) return
    mutateDraft(tempId, draft => {
      const old = draft.images.find(image => image.id === imageId)
      if (!old) return draft
      return {
        ...draft,
        images: [
          ...draft.images.map(image => image.id === imageId ? { ...image, removed: true } : image),
          { id: uid('img-'), name: selected.name, blob: selected, location: old.location, optionLabel: old.optionLabel }
        ]
      }
    })
  }

  function decideDuplicate(draft: ImportDraft, action: 'skip' | 'reimport') {
    mutateDraft(draft.tempId, current => ({
      ...current,
      accepted: action === 'reimport',
      duplicate: current.duplicate ? { ...current.duplicate, reimport: action === 'reimport' } : undefined
    }))
  }

  function skipAllDuplicates() {
    setDrafts(list => list.map(draft => draft.duplicate ? { ...draft, accepted: false } : draft))
  }

  async function confirmSave() {
    if (!file || !parseResult || !stepValid) return
    setBusy(true)
    try {
      const result = await saveImport({
        drafts,
        file,
        subjectId: meta.subjectId,
        subjectCode: selectedSubject?.shortName || selectedSubject?.id || 'MAPEL',
        topicId: meta.topicId,
        semester: meta.semester,
        teacherId: user?.id || 'teacher-1',
        analysis: parseResult.analysis,
        errors: parseErrors,
        warnings: parseWarnings,
        reimportOf,
        onProgress: (percent, label) => setProgress({ percent, label })
      })
      setSaveResult(result)
      setProgress({ percent: 100, label: 'Impor selesai.' })
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleNext() {
    if (!stepValid || busy) return
    if (step === 1 && file) {
      await runParse(file)
      return
    }
    setStep(current => Math.min(5, current + 1))
  }

  async function reimport(entry: ImportHistory) {
    const cached = cachedFileFor(entry.fileName)
    if (!cached) {
      setReimportMessage(`Berkas "${entry.fileName}" sudah tidak tersedia di sesi ini. Silakan pilih ulang berkas DOCX yang sama.`)
      setStep(1)
      return
    }
    const override: Partial<Meta> = {
      subjectId: entry.subjectId || meta.subjectId,
      topicId: entry.topicId || meta.topicId
    }
    setReimportOf(entry.id)
    setReimportMessage(`Berkas "${entry.fileName}" dimuat ulang dari sesi ini.`)
    await runParse(cached, override)
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold">Import Soal dari Microsoft Word</h1>
        <p className="text-sm text-slate-500">Lima langkah: unggah, analisis, ekstraksi, tinjau, dan simpan ke bank soal.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => downloadQuestionTemplate(false)}><Download size={16} /> Template kosong</Button>
        <Button variant="secondary" onClick={() => downloadQuestionTemplate(true)}><Download size={16} /> Contoh terisi</Button>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      {STEPS.map((label, index) => {
        const number = index + 1
        const done = number < step
        const active = number === step
        const clickable = number <= step
        return <div key={label} className="flex items-center gap-2">
          <button
            type="button"
            disabled={!clickable || busy}
            onClick={() => setStep(number)}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${active ? 'bg-teal-700 text-white' : done ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-400'}`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25">{done ? <CheckCircle2 size={14} /> : number}</span>
            {label}
          </button>
          {index < STEPS.length - 1 && <span className="h-px w-5 bg-slate-200" />}
        </div>
      })}
    </div>

    {(progress.percent > 0 && progress.percent < 100) && <Card><ProgressBar value={progress.percent} label={progress.label || 'Memproses…'} /></Card>}

    {step === 1 && <Card>
      <h2 className="mb-4 text-lg font-bold">1. Unggah dokumen dan tentukan metadata</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field label="File DOCX" hint="Format .docx dengan penanda SOAL 1, JENIS, PERTANYAAN, KUNCI, dan sebagainya.">
          <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="input"
            onChange={event => pickFile(event.target.files?.[0])} />
        </Field>
        <Field label="Mata pelajaran">
          <select className="input" value={meta.subjectId} onChange={event => setMeta(current => ({ ...current, subjectId: event.target.value, topicId: '' }))}>
            <option value="">Pilih mata pelajaran</option>
            {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </Field>
        <Field label="Materi/topik">
          <select className="input" value={meta.topicId} onChange={event => setMeta(current => ({ ...current, topicId: event.target.value }))}>
            <option value="">Gunakan materi pertama mata pelajaran</option>
            {topicRows.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
          </select>
        </Field>
        <Field label="Semester">
          <select className="input" value={meta.semester} onChange={event => setMeta(current => ({ ...current, semester: Number(event.target.value) }))}>
            <option value={1}>1</option><option value={2}>2</option>
          </select>
        </Field>
        <Field label="Kelas (terdeteksi dari dokumen, opsional)">
          <input className="input" value={meta.className} onChange={event => setMeta(current => ({ ...current, className: event.target.value }))} placeholder="X-1" />
        </Field>
      </div>
      {file && <div className="mt-4 flex items-center gap-2 rounded-xl bg-teal-50 p-3 text-sm text-teal-800"><FileUp size={16} /> {file.name} · {(file.size / 1024).toFixed(1)} KB</div>}
      {reimportMessage && <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{reimportMessage}</div>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => document.getElementById('import-history')?.scrollIntoView({ behavior: 'smooth' })}>
          <History size={16} /> Lihat riwayat ({history.length})
        </Button>
        <span className="text-xs text-slate-500">Hasil ekstraksi selalu diperiksa guru sebelum disimpan.</span>
      </div>
    </Card>}

    {step === 2 && <div className="space-y-4">
      <Card>
        <h2 className="mb-3 text-lg font-bold">2. Analisis struktur dokumen</h2>
        <ProgressBar value={progress.percent} label={progress.label || 'Analisis selesai'} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Paragraf" value={parseResult?.analysis.paragraphs || 0} icon={<FileText size={18} />} tone="blue" />
          <StatCard label="Tabel" value={parseResult?.analysis.tables || 0} icon={<Table2 size={18} />} tone="teal" />
          <StatCard label="Gambar" value={parseResult?.analysis.images || 0} icon={<ImageIcon size={18} />} tone="amber" />
          <StatCard label="Persamaan" value={parseResult?.analysis.equations || 0} icon={<Sigma size={18} />} tone="rose" />
        </div>
        <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <div>Mapel terdeteksi: <b>{parseResult?.metadata.subject || '—'}</b></div>
          <div>Materi terdeteksi: <b>{parseResult?.metadata.topic || '—'}</b></div>
          <div>Semester terdeteksi: <b>{parseResult?.metadata.semester || '—'}</b></div>
          <div>Kelas terdeteksi: <b>{parseResult?.metadata.className || '—'}</b></div>
        </div>
      </Card>
      {parseErrors.length > 0 && <Card className="border-rose-200 bg-rose-50">
        <h3 className="mb-2 flex items-center gap-2 font-bold text-rose-800"><AlertTriangle size={18} /> Kesalahan (harus diperbaiki)</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-rose-700">{parseErrors.map((error, index) => <li key={index}>{error}</li>)}</ul>
      </Card>}
      {parseWarnings.length > 0 && <Card className="border-amber-200 bg-amber-50">
        <h3 className="mb-2 flex items-center gap-2 font-bold text-amber-800"><AlertCircle size={18} /> Peringatan parser ({parseWarnings.length})</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-amber-800">{parseWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
      </Card>}
    </div>}

    {step === 3 && <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">3. Ekstraksi soal dan gambar</h2>
        <Button variant="secondary" onClick={skipAllDuplicates} disabled={!duplicateCount}><Ban size={16} /> Lewati semua duplikat</Button>
      </div>
      <Card>
        <div className="flex flex-wrap gap-4 text-sm">
          <Badge className="bg-teal-100 text-teal-700">{drafts.length} soal terdeteksi</Badge>
          <Badge className="bg-blue-100 text-blue-700">{activeImageCount} gambar aktif</Badge>
          <Badge className="bg-amber-100 text-amber-700">{duplicateCount} kemungkinan duplikat</Badge>
          <Badge className="bg-slate-100 text-slate-700">{acceptedDrafts.length} akan disertakan</Badge>
        </div>
      </Card>
      {drafts.length === 0 && <EmptyState title="Belum ada soal" description="Kembali ke langkah unggah dan pilih dokumen DOCX." />}
      {drafts.map(draft => <Card key={draft.tempId} className={draft.accepted ? '' : 'opacity-60'}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <label className="flex items-start gap-3 text-left">
            <input type="checkbox" className="mt-1 accent-teal-700" checked={draft.accepted}
              onChange={event => patchDraft(draft.tempId, { accepted: event.target.checked })} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-teal-100 text-teal-700">SOAL {draft.number}</Badge>
                <Badge className={draft.type === 'single' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}>
                  {draft.type === 'single' ? 'PG' : 'MR'}
                </Badge>
                {draft.duplicate && <Badge className="bg-amber-100 text-amber-700">
                  Duplikat {draft.duplicate.kind === 'file' ? 'dalam file' : 'di bank'} · {(draft.duplicate.score * 100).toFixed(0)}%
                </Badge>}
                {draft.images.length > 0 && <Badge className="bg-slate-100 text-slate-700"><ImageIcon size={12} className="mr-1 inline" />{draft.images.filter(image => !image.removed).length} gambar</Badge>}
              </div>
              <p className="mt-2 text-sm font-medium text-slate-700">{draft.prompt.slice(0, 120) || '(pertanyaan kosong)'}</p>
              <p className="text-xs text-slate-500">{draft.options.length} pilihan · kunci: {draft.answer.join(', ') || '—'} · {draft.warnings.length} peringatan</p>
            </div>
          </label>
          {draft.duplicate && <div className="flex gap-2">
            <Button variant="secondary" onClick={() => decideDuplicate(draft, 'skip')}><Ban size={14} /> Lewati</Button>
            <Button variant="secondary" onClick={() => decideDuplicate(draft, 'reimport')}><RotateCcw size={14} /> Impor ulang</Button>
          </div>}
        </div>
        {draft.validation.length > 0 && <div className="mt-3 rounded-xl bg-rose-50 p-2 text-xs text-rose-700">{draft.validation.join(' • ')}</div>}
        {draft.warnings.length > 0 && <div className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">{draft.warnings.join(' • ')}</div>}
      </Card>)}
    </div>}

    {step === 4 && <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">4. Preview dan editor soal</h2>
        <span className="text-xs text-slate-500">{acceptedDrafts.length} soal disertakan · {validationProblems.length} masalah validasi</span>
      </div>
      {drafts.map(draft => {
        const open = expanded === draft.tempId
        const matched = draft.duplicate?.kind === 'database' ? questions.find(question => question.id === draft.duplicate?.id) : undefined
        return <Card key={draft.tempId}>
          <div role="button" tabIndex={0} className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 text-left"
            onClick={() => setExpanded(open ? null : draft.tempId)}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setExpanded(open ? null : draft.tempId) }}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-teal-100 text-teal-700">SOAL {draft.number}</Badge>
              <span className="font-semibold">{draft.prompt.slice(0, 80) || '(pertanyaan kosong)'}</span>
              {draft.duplicate && <Badge className="bg-amber-100 text-amber-700">Duplikat</Badge>}
              {draft.validation.length > 0 && <Badge className="bg-rose-100 text-rose-700">{draft.validation.length} masalah</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs font-semibold" onClick={event => event.stopPropagation()}>
                <input type="checkbox" className="accent-teal-700" checked={draft.accepted}
                  onChange={event => patchDraft(draft.tempId, { accepted: event.target.checked })} /> Sertakan
              </label>
              {open ? <X size={16} /> : <FileText size={16} />}
            </div>
          </div>
          {open && <div className="mt-4 grid gap-5 border-t pt-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-slate-50 p-3">
              <div className="mb-2 text-xs font-semibold uppercase text-slate-400">Tampilan siswa</div>
              {draft.stimulus && <SafeRichText text={draft.stimulus} className="text-sm" />}
              <SafeRichText text={draft.prompt} className="mt-2 font-semibold" />
              <div className="mt-3 space-y-1 text-sm">
                {draft.options.map(option => <div key={option.label} className="flex gap-2">
                  <span className="font-bold">{option.label}.</span><SafeRichText text={option.text} />
                </div>)}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {draft.images.filter(image => !image.removed).map(image => <div key={image.id}>
                  <BlobPreview blob={image.blob} />
                </div>)}
              </div>
              {matched?.stimulusMediaId && <div className="mt-3"><div className="text-xs text-slate-500">Gambar soal bank yang cocok:</div><MediaView mediaId={matched.stimulusMediaId} /></div>}
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Jenis">
                  <select className="input" value={draft.type} onChange={event => {
                    const type = event.target.value as QuestionType
                    patchDraft(draft.tempId, { type, answer: type === 'single' ? draft.answer.slice(0, 1) : draft.answer })
                  }}>
                    <option value="single">Pilihan ganda</option><option value="multiple">Multiple response</option>
                  </select>
                </Field>
                <Field label="Level kognitif">
                  <select className="input" value={draft.cognitive} onChange={event => patchDraft(draft.tempId, { cognitive: event.target.value as CognitiveLevel })}>
                    <option value="C4">C4</option><option value="C5">C5</option><option value="C6">C6</option>
                  </select>
                </Field>
                <Field label="Tingkat kesulitan">
                  <select className="input" value={draft.difficulty} onChange={event => patchDraft(draft.tempId, { difficulty: event.target.value as Difficulty })}>
                    <option value="mudah">Mudah</option><option value="sedang">Sedang</option><option value="sulit">Sulit</option>
                  </select>
                </Field>
                <Field label="Semantik">
                  <select className="input" value={draft.semantic || ''} onChange={event => patchDraft(draft.tempId, { semantic: (event.target.value || undefined) as ImportDraft['semantic'] })}>
                    <option value="">Tidak ditentukan</option><option value="konsep">Konsep</option>
                    <option value="penerapan">Penerapan</option><option value="analisis">Analisis</option>
                  </select>
                </Field>
              </div>
              <Field label="Stimulus"><textarea className="input min-h-[70px]" value={draft.stimulus} onChange={event => patchDraft(draft.tempId, { stimulus: event.target.value })} /></Field>
              <Field label="Pertanyaan"><textarea className="input min-h-[70px]" value={draft.prompt} onChange={event => patchDraft(draft.tempId, { prompt: event.target.value })} /></Field>
              <div>
                <div className="label">Pilihan jawaban</div>
                <div className="space-y-2">
                  {draft.options.map(option => <div key={option.label} className="rounded-xl border p-2">
                    <div className="flex items-center gap-2">
                      <Badge>{option.label}</Badge>
                      <input className="input" value={option.text} placeholder={`Teks pilihan ${option.label}`}
                        onChange={event => patchOption(draft.tempId, option.label, event.target.value)} />
                      <Button variant="secondary" onClick={() => removeOption(draft, option.label)} aria-label={`Hapus pilihan ${option.label}`}><X size={14} /></Button>
                    </div>
                    <label className="mt-1 block text-xs font-semibold text-teal-700">
                      Tambah/ganti gambar pilihan
                      <input type="file" accept="image/*" className="input mt-1 text-xs" onChange={event => {
                        addImage(draft.tempId, 'option', option.label, event.target.files?.[0])
                        event.target.value = ''
                      }} />
                    </label>
                  </div>)}
                </div>
                <Button variant="secondary" className="mt-2" onClick={() => addOption(draft)}><Plus size={14} /> Tambah pilihan</Button>
              </div>
              <Field label="Kunci jawaban" hint={draft.type === 'single' ? 'Pilih satu kunci.' : 'Pilih dua atau lebih kunci.'}>
                <div className="flex flex-wrap gap-3">
                  {draft.options.map(option => <label key={option.label} className="flex items-center gap-1 text-sm font-bold">
                    <input type={draft.type === 'single' ? 'radio' : 'checkbox'} name={`key-${draft.tempId}`}
                      checked={draft.answer.includes(option.label)} onChange={() => toggleAnswer(draft, option.label)} className="accent-teal-700" />
                    {option.label}
                  </label>)}
                </div>
              </Field>
              <Field label="Pembahasan"><textarea className="input min-h-[70px]" value={draft.explanation} onChange={event => patchDraft(draft.tempId, { explanation: event.target.value })} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tujuan pembelajaran (TP)"><input className="input" value={draft.tp} onChange={event => patchDraft(draft.tempId, { tp: event.target.value })} /></Field>
                <Field label="Indikator"><input className="input" value={draft.indicator || ''} onChange={event => patchDraft(draft.tempId, { indicator: event.target.value })} /></Field>
                <Field label="Kompetensi"><input className="input" value={draft.competency || ''} onChange={event => patchDraft(draft.tempId, { competency: event.target.value })} /></Field>
                <Field label="Miskonsepsi"><input className="input" value={draft.misconception || ''} onChange={event => patchDraft(draft.tempId, { misconception: event.target.value })} /></Field>
                <Field label="Rekomendasi"><input className="input" value={draft.recommendation || ''} onChange={event => patchDraft(draft.tempId, { recommendation: event.target.value })} /></Field>
              </div>
              <div>
                <div className="label">Gambar</div>
                <div className="space-y-2">
                  {draft.images.map(image => <div key={image.id} className={`flex flex-wrap items-center gap-2 rounded-xl border p-2 ${image.removed ? 'opacity-40' : ''}`}>
                    <BlobPreview blob={image.blob} className="h-12 w-12 rounded border object-contain" />
                    <span className="text-xs text-slate-600">{image.name} · {image.location}{image.optionLabel ? ` (${image.optionLabel})` : ''}{image.removed ? ' · dihapus' : ''}</span>
                    {!image.removed && <Button variant="secondary" onClick={() => removeImage(draft.tempId, image.id)}><Trash2 size={14} /></Button>}
                    <label className="cursor-pointer text-xs font-semibold text-teal-700">
                      Ganti
                      <input type="file" accept="image/*" className="hidden" onChange={event => {
                        replaceImage(draft.tempId, image.id, event.target.files?.[0])
                        event.target.value = ''
                      }} />
                    </label>
                  </div>)}
                </div>
                <label className="mt-2 block text-xs font-semibold text-teal-700">
                  Tambah gambar stimulus
                  <input type="file" accept="image/*" className="input mt-1 text-xs" onChange={event => {
                    addImage(draft.tempId, 'stimulus', undefined, event.target.files?.[0])
                    event.target.value = ''
                  }} />
                </label>
              </div>
              {draft.duplicate && <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => decideDuplicate(draft, 'skip')}><Ban size={14} /> Lewati duplikat</Button>
                <Button variant="secondary" onClick={() => decideDuplicate(draft, 'reimport')}><RotateCcw size={14} /> Tetap impor ulang</Button>
              </div>}
              {draft.validation.length > 0 && <div className="rounded-xl bg-rose-50 p-2 text-xs text-rose-700">{draft.validation.join(' • ')}</div>}
            </div>
          </div>}
        </Card>
      })}
    </div>}

    {step === 5 && <div className="space-y-4">
      <Card>
        <h2 className="mb-3 text-lg font-bold">5. Konfirmasi penyimpanan</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Terdeteksi" value={drafts.length} icon={<FileText size={18} />} tone="blue" />
          <StatCard label="Disimpan" value={acceptedDrafts.length} icon={<CheckCircle2 size={18} />} tone="teal" />
          <StatCard label="Dilewati" value={drafts.length - acceptedDrafts.length} icon={<Ban size={18} />} tone="amber" />
          <StatCard label="Gambar" value={activeImageCount} icon={<ImageIcon size={18} />} tone="rose" />
        </div>
        <div className="mt-4"><ProgressBar value={progress.percent} label={progress.label || 'Siap menyimpan'} /></div>
        <div className="mt-4 text-sm text-slate-600">
          Soal disimpan dengan status <b>Perlu diperiksa</b> dan tidak menimpa soal yang sudah ada. Penyimpanan dilakukan per 25 soal.
        </div>
        {saveResult ? <div className="mt-4 rounded-xl bg-teal-50 p-4 text-sm font-semibold text-teal-800">
          <CheckCircle2 size={18} className="mr-2 inline" />
          {saveResult.imported} soal dan {saveResult.imageCount} gambar berhasil disimpan. {saveResult.failed} gagal, {saveResult.skipped} dilewati.
        </div> : <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={confirmSave} disabled={busy || !stepValid}><Upload size={16} /> {busy ? 'Menyimpan…' : `Simpan ${acceptedDrafts.length} soal`}</Button>
          <Button variant="secondary" onClick={() => pickFile(file || undefined)} disabled={busy}>Ganti dokumen</Button>
        </div>}
      </Card>
      <Card>
        <h3 className="mb-2 font-bold">Daftar validasi</h3>
        <div className="space-y-3 text-sm">
          {parseErrors.length > 0 && <div className="rounded-xl bg-rose-50 p-3 text-rose-800">
            <b>Kesalahan parser:</b><ul className="list-inside list-disc">{parseErrors.map((error, index) => <li key={index}>{error}</li>)}</ul>
          </div>}
          {validationProblems.length > 0 && <div className="rounded-xl bg-rose-50 p-3 text-rose-800">
            <b>Soal belum valid:</b><ul className="list-inside list-disc">{validationProblems.map((problem, index) => <li key={index}>{problem}</li>)}</ul>
          </div>}
          {parseWarnings.length > 0 && <div className="rounded-xl bg-amber-50 p-3 text-amber-800">
            <b>Peringatan ({parseWarnings.length}):</b><ul className="list-inside list-disc">{parseWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
          </div>}
          {!parseErrors.length && !validationProblems.length && !parseWarnings.length && <p className="text-slate-500">Tidak ada masalah yang ditemukan.</p>}
        </div>
      </Card>
    </div>}

    <div className="flex items-center justify-between">
      <Button variant="secondary" onClick={() => setStep(current => Math.max(1, current - 1))} disabled={step === 1 || busy}>
        <ArrowLeft size={16} /> Kembali
      </Button>
      {step < 5 && <Button onClick={handleNext} disabled={!stepValid || busy}>
        {step === 1 ? 'Baca dokumen' : 'Lanjut'} <ArrowRight size={16} />
      </Button>}
    </div>

    <div id="import-history">
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Riwayat import</h2>
          <span className="text-xs text-slate-500">{history.length} dokumen</span>
        </div>
        {history.length === 0 ? <EmptyState title="Belum ada riwayat" description="Dokumen yang diimpor akan muncul di sini." /> :
          <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Tanggal</th><th>File</th><th>Mapel</th><th>Terdeteksi</th><th>Disimpan</th><th>Catatan</th><th>Aksi</th></tr></thead>
            <tbody>{history.map(entry => <tr key={entry.id}>
              <td>{new Date(entry.createdAt).toLocaleString('id-ID')}</td>
              <td>{entry.fileName}</td>
              <td>{subjects.find(subject => subject.id === entry.subjectId)?.name || '—'}</td>
              <td>{entry.detected}</td>
              <td>{entry.imported}{entry.failedCount ? <span className="ml-1 text-xs text-rose-600">({entry.failedCount} gagal)</span> : null}</td>
              <td className="max-w-xs text-xs text-slate-500">{(entry.errors || []).slice(0, 2).join('; ') || '—'}</td>
              <td><Button variant="secondary" onClick={() => reimport(entry)}><RotateCcw size={14} /> Impor ulang</Button></td>
            </tr>)}</tbody>
          </table></div>}
      </Card>
    </div>
  </div>
}
