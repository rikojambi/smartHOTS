import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, FileJson, Printer, RotateCcw } from 'lucide-react'
import { db, getSetting } from '../db/db'
import { Badge, Button, Card, EmptyState, Field, Modal, StatCard } from '../components/ui'
import { RichText } from '../components/RichText'
import { hasRole, useAuth } from '../lib/auth'
import {
  categorize, colorForCategory, DEFAULT_HEATMAP_COLORS, DEFAULT_HEATMAP_SETTINGS, DEFAULT_THRESHOLDS,
  indicatorKeyOf, loadHeatmapSettings, type Thresholds
} from '../lib/competency'
import {
  buildHeatmap, buildStudentDetail, filterHeatmapEvidence,
  type HeatmapCell, type HeatmapFilters, type HeatmapInput
} from '../lib/heatmap'
import type { HeatmapColors, MasteryCategory, SkillEvidence } from '../types'

const MASTERED = new Set<MasteryCategory>(['Sangat baik', 'Baik'])
const TREND_COLORS = ['#0d9488', '#0284c7', '#f59e0b', '#7c3aed', '#e11d48']
const escapeHtml = (value: string | number | undefined) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function textOn(color: string) {
  const value = color.length === 4 ? `#${color.slice(1).split('').map(c => c + c).join('')}` : color
  const r = parseInt(value.slice(1, 3), 16) || 0
  const g = parseInt(value.slice(3, 5), 16) || 0
  const b = parseInt(value.slice(5, 7), 16) || 0
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#0f172a' : '#ffffff'
}

function dayValue(value: string, endOfDay: boolean) {
  const time = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`).getTime()
  return Number.isFinite(time) ? time : undefined
}

function shortText(value: string, length = 24) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value
}

function downloadFile(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function csvField(value: string | number | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export default function HeatmapPage() {
  const navigate = useNavigate()
  const { user, ready } = useAuth()

  const students = useLiveQuery(() => db.students.toArray(), []) || []
  const classes = useLiveQuery(() => db.classes.toArray(), []) || []
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || []
  const topics = useLiveQuery(() => db.topics.toArray(), []) || []
  const questions = useLiveQuery(() => db.questions.toArray(), []) || []
  const evidence = useLiveQuery(() => db.skillEvidence.toArray(), []) || []
  const attempts = useLiveQuery(() => db.studentAttempts.toArray(), []) || []

  const [colors, setColors] = useState<HeatmapColors>({ ...DEFAULT_HEATMAP_COLORS })
  const [minEvidence, setMinEvidence] = useState<number>(DEFAULT_HEATMAP_SETTINGS.minEvidence)
  const [thresholds, setThresholds] = useState<Thresholds>({ ...DEFAULT_THRESHOLDS })
  const [classFilter, setClassFilter] = useState('')
  const [studentFilter, setStudentFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [tpFilter, setTpFilter] = useState('')
  const [cognitiveFilter, setCognitiveFilter] = useState('')
  const [indicatorFilter, setIndicatorFilter] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [targetIndicator, setTargetIndicator] = useState('')
  const [evidenceMode, setEvidenceMode] = useState<'answers' | 'wrong' | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([
      loadHeatmapSettings(),
      getSetting<Thresholds>('masteryThresholds', DEFAULT_THRESHOLDS)
    ]).then(([stored, storedThresholds]) => {
      if (!alive) return
      setColors(stored.colors)
      setMinEvidence(stored.minEvidence)
      setThresholds({ ...DEFAULT_THRESHOLDS, ...storedThresholds })
    }).catch(() => { /* tetap gunakan nilai bawaan */ })
    return () => { alive = false }
  }, [])

  const questionMap = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions])
  const classOptions = useMemo(() => [...new Set([
    ...classes.map(c => c.name),
    ...students.map(s => s.className)
  ])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'id')), [classes, students])
  const studentOptions = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name, 'id')), [students])
  const topicOptions = useMemo(() => topics
    .filter(t => !subjectFilter || t.subjectId === subjectFilter)
    .sort((a, b) => a.name.localeCompare(b.name, 'id')), [topics, subjectFilter])
  const tpOptions = useMemo(() => {
    const values = new Set<string>()
    for (const q of questions) {
      if (subjectFilter && q.subjectId !== subjectFilter) continue
      if (topicFilter && q.topicId !== topicFilter) continue
      if (q.tp) values.add(q.tp)
    }
    for (const t of topicOptions) for (const tp of t.tp || []) if (tp) values.add(tp)
    return [...values].sort((a, b) => a.localeCompare(b, 'id'))
  }, [questions, topicOptions, subjectFilter, topicFilter])
  const indicatorOptions = useMemo(() => {
    const values = new Map<string, string>()
    for (const item of evidence) {
      const q = questionMap.get(item.questionId)
      const key = item.indicatorKey || (q ? indicatorKeyOf(q) : item.indicator)
      if (!key) continue
      const label = item.indicator || q?.indicator || key
      if (!values.has(key) || label.length < values.get(key)!.length) values.set(key, label)
    }
    return [...values.entries()].map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'id'))
  }, [evidence, questionMap])

  const filters = useMemo<HeatmapFilters>(() => ({
    classId: classFilter || undefined,
    studentId: studentFilter || undefined,
    subjectId: subjectFilter || undefined,
    topicId: topicFilter || undefined,
    from: fromDate ? dayValue(fromDate, false) : undefined,
    to: toDate ? dayValue(toDate, true) : undefined,
    tp: tpFilter || undefined,
    cognitive: cognitiveFilter || undefined,
    indicatorKey: indicatorFilter || undefined
  }), [classFilter, studentFilter, subjectFilter, topicFilter, fromDate, toDate, tpFilter, cognitiveFilter, indicatorFilter])

  const input = useMemo<HeatmapInput>(() => ({
    evidence, students, questions, topics, subjects, attempts,
    settings: { minEvidence, thresholds }
  }), [evidence, students, questions, topics, subjects, attempts, minEvidence, thresholds])

  const heatmap = useMemo(() => buildHeatmap(input, filters), [input, filters])
  const detail = useMemo(() => selectedStudentId ? buildStudentDetail(input, selectedStudentId, filters) : null, [input, filters, selectedStudentId])
  const detailEvidence = useMemo(() => {
    if (!selectedStudentId || !evidenceMode) return []
    const rows = filterHeatmapEvidence(input, filters).filter(e => e.studentId === selectedStudentId)
    return evidenceMode === 'wrong' ? rows.filter(e => !e.correct) : rows
  }, [input, filters, selectedStudentId, evidenceMode])

  const cellsByIndicator = useMemo(() => {
    const map = new Map<string, HeatmapCell[]>()
    for (const row of heatmap.rows) {
      for (const cell of row.cells) {
        const list = map.get(cell.indicatorKey) || []
        list.push(cell)
        map.set(cell.indicatorKey, list)
      }
    }
    return map
  }, [heatmap.rows])

  const distributionData = heatmap.insights.distribution
    .filter(item => item.count > 0)
    .map(item => ({ name: item.category, value: item.count, color: colorForCategory(item.category as MasteryCategory, colors) }))

  const detailCells = detail ? [...detail.mastered, ...detail.weak, ...detail.insufficient] : []
  const chosenIndicator = detailCells.find(c => c.indicatorKey === targetIndicator)?.indicatorKey
    || detail?.weak[0]?.indicatorKey || detailCells[0]?.indicatorKey || ''
  const trendLabels = useMemo(() => [...new Set((detail?.trend || []).map(p => p.label))].slice(0, 5), [detail])
  const trendData = useMemo(() => {
    const map = new Map<number, Record<string, string | number>>()
    for (const point of detail?.trend || []) {
      if (!trendLabels.includes(point.label)) continue
      const row: Record<string, string | number> = map.get(point.at) || {
        at: point.at,
        tanggal: new Date(point.at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      }
      row[point.label] = point.percentage
      map.set(point.at, row)
    }
    return [...map.values()].sort((a, b) => Number(a.at) - Number(b.at))
  }, [detail, trendLabels])

  function resetFilters() {
    setClassFilter(''); setStudentFilter(''); setSubjectFilter(''); setTopicFilter('')
    setFromDate(''); setToDate(''); setTpFilter(''); setCognitiveFilter(''); setIndicatorFilter('')
    setNotice('')
  }

  function openStudent(studentId: string) {
    setSelectedStudentId(studentId)
    setTargetIndicator('')
    setEvidenceMode(null)
  }

  function cellStyle(cell: HeatmapCell): CSSProperties {
    const background = cell.sufficient ? colorForCategory(cell.category, colors) : colors.insufficient
    return {
      backgroundColor: background,
      color: textOn(background),
      ...(cell.sufficient ? {} : {
        backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 6px, transparent 6px, transparent 12px)'
      })
    }
  }

  function cellHint(cell: HeatmapCell) {
    return [
      cell.indicator,
      `Benar ${cell.correct}/${cell.total} • ${cell.percentage}%`,
      `Attempt: ${cell.attempts}`,
      cell.note || '',
      cell.errorTypes.length ? `Kesalahan: ${cell.errorTypes.join(', ')}` : '',
      cell.misconceptions.length ? `Miskonsepsi: ${cell.misconceptions.join(', ')}` : ''
    ].filter(Boolean).join('\n')
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      title: 'Learning Heatmap – Peta Kelemahan Kompetensi',
      filters,
      settings: { minEvidence, thresholds, colors },
      rows: heatmap.rows,
      columns: heatmap.columns,
      insights: heatmap.insights
    }
    downloadFile(`heatmap-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json')
  }

  function exportCsv() {
    const lines: Array<Array<string | number>> = []
    lines.push(['MATRIKS PEMBELAJARAN'])
    lines.push(['Siswa', 'Kelas', 'Indikator', 'Materi', 'Mapel', 'Benar', 'Total', 'Poin', 'Maks Poin', 'Persentase', 'Status', 'Cukup Bukti', 'Attempt', 'Jenis Kesalahan', 'Miskonsepsi', 'Catatan'])
    for (const row of heatmap.rows) {
      for (const cell of row.cells) {
        lines.push([
          cell.studentName, cell.className, cell.indicator, cell.topicName,
          '', cell.correct, cell.total, cell.points, cell.maxPoints, cell.percentage,
          cell.sufficient ? cell.category : 'belum cukup bukti', cell.sufficient ? 'ya' : 'tidak',
          cell.attempts, cell.errorTypes.join('; '), cell.misconceptions.join('; '), cell.note || ''
        ])
      }
    }
    lines.push([])
    lines.push(['AGREGAT KELAS'])
    lines.push(['Kompetensi', 'Materi', 'Mapel', 'Rata-rata', 'Siswa Belum Menguasai', 'Total Bukti', 'Butir Tidak Cukup', 'Status'])
    for (const column of heatmap.columns) {
      const cells = cellsByIndicator.get(column.indicatorKey) || []
      const notMastered = cells.filter(c => !c.sufficient || !MASTERED.has(c.category)).length
      lines.push([
        column.indicator, column.topicName, column.subjectName, column.average, notMastered,
        column.totalEvidence, column.insufficientCount,
        cells.some(c => c.sufficient) ? categorize(column.average, thresholds) : 'belum cukup bukti'
      ])
    }
    lines.push([])
    lines.push(['INSIGHT'])
    lines.push(['Jenis', 'Label', 'Nilai', 'Keterangan'])
    for (const item of heatmap.insights.weakest) lines.push(['Indikator terlemah', item.indicator, item.average, `${item.totalEvidence} bukti`])
    for (const item of heatmap.insights.strongest) lines.push(['Indikator terkuat', item.indicator, item.average, `${item.totalEvidence} bukti`])
    for (const item of heatmap.insights.highestErrorRate) lines.push(['Tingkat kesalahan', item.label, item.rate, `${item.errors}/${item.total} salah`])
    lines.push(['Siswa perlu remedial', 'Jumlah siswa', heatmap.insights.studentsNeedingRemedial, 'Bukti cukup dengan kategori Perlu remedial'])
    for (const item of heatmap.insights.distribution) lines.push(['Distribusi', item.category, item.count, 'Jumlah sel siswa-indikator'])
    downloadFile(`heatmap-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${lines.map(line => line.map(csvField).join(',')).join('\r\n')}`, 'text/csv;charset=utf-8')
  }

  function printReport() {
    if (!detail || !selectedStudentId) return
    const student = students.find(s => s.id === selectedStudentId)
    const table = (title: string, cells: HeatmapCell[]) => `<h2>${escapeHtml(title)} (${cells.length})</h2>` + (cells.length
      ? `<table><tr><th>Indikator</th><th>Materi</th><th>Penguasaan</th><th>Benar/Total</th><th>Status</th><th>Catatan</th></tr>${cells.map(c => `<tr><td>${escapeHtml(c.indicator)}</td><td>${escapeHtml(c.topicName)}</td><td>${c.percentage}%</td><td>${c.correct}/${c.total}</td><td>${escapeHtml(c.category)}</td><td>${escapeHtml(c.note || '')}</td></tr>`).join('')}</table>`
      : '<p>Tidak ada data.</p>')
    const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${escapeHtml(`Laporan individu ${student?.name || selectedStudentId}`)}</title>
<style>body{font-family:Arial,sans-serif;color:#0f172a;margin:32px}h1{font-size:20px}h2{font-size:14px;margin-top:24px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left}th{background:#f1f5f9}li{margin-bottom:4px}.meta{color:#475569;font-size:12px}</style></head><body>
<h1>Laporan Penguasaan Individu – ${escapeHtml(student?.name || selectedStudentId)}</h1>
<div class="meta">Kelas: ${escapeHtml(student?.className || '-')} • Dicetak: ${escapeHtml(new Date().toLocaleString('id-ID'))} • Minimal bukti: ${minEvidence} butir / ${minEvidence} soal</div>
${table('Indikator dikuasai', detail.mastered)}
${table('Indikator perlu penguatan', detail.weak)}
${table('Bukti belum cukup', detail.insufficient)}
<h2>Pola kesalahan</h2><p>${escapeHtml(detail.frequentErrors.map(e => `${e.label} (${e.count}x)`).join(', ') || 'Tidak ada data kesalahan.')}</p>
<h2>Miskonsepsi</h2><p>${escapeHtml(detail.misconceptions.map(m => `${m.label} (${m.count})`).join(', ') || 'Tidak ada miskonsepsi yang memenuhi ambang bukti.')}</p>
<h2>Rekomendasi</h2><ol>${detail.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ol>
</body></html>`
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) { setNotice('Pop-up diblokir browser. Izinkan pop-up untuk mencetak laporan.'); return }
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { try { win.print() } catch { setNotice('Gagal memanggil dialog cetak pada jendela laporan.') } }, 400)
  }

  if (!ready) return <div className="flex h-64 items-center justify-center text-sm text-slate-500">Memuat data heatmap…</div>
  if (!user || !hasRole(['teacher', 'admin'], user)) {
    return <EmptyState title="Akses terbatas" description="Learning Heatmap hanya tersedia untuk guru dan administrator." />
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold">Learning Heatmap – Peta Kelemahan Kompetensi</h1>
        <p className="text-sm text-slate-500">Penguasaan dihitung per indikator dari bukti respons siswa, bukan dari nilai akhir latihan. Status hanya ditetapkan jika bukti mencukupi.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={exportCsv}><Download size={16} /> Ekspor CSV</Button>
        <Button variant="secondary" onClick={exportJson}><FileJson size={16} /> Ekspor JSON</Button>
      </div>
    </div>

    {notice && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{notice}</div>}

    <Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Kelas"><select className="input" value={classFilter} onChange={e => { setClassFilter(e.target.value); setStudentFilter('') }}><option value="">Semua kelas</option>{classOptions.map(name => <option key={name} value={name}>{name}</option>)}</select></Field>
        <Field label="Siswa"><select className="input" value={studentFilter} onChange={e => setStudentFilter(e.target.value)}><option value="">Semua siswa</option>{studentOptions.filter(s => !classFilter || s.className === classFilter).map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}</select></Field>
        <Field label="Mata pelajaran"><select className="input" value={subjectFilter} onChange={e => { setSubjectFilter(e.target.value); setTopicFilter(''); setTpFilter('') }}><option value="">Semua mapel</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Materi"><select className="input" value={topicFilter} onChange={e => { setTopicFilter(e.target.value); setTpFilter('') }}><option value="">Semua materi</option>{topicOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <Field label="Dari tanggal"><input type="date" className="input" value={fromDate} max={toDate || undefined} onChange={e => setFromDate(e.target.value)} /></Field>
        <Field label="Sampai tanggal"><input type="date" className="input" value={toDate} min={fromDate || undefined} onChange={e => setToDate(e.target.value)} /></Field>
        <Field label="Tujuan pembelajaran (TP)"><select className="input" value={tpFilter} onChange={e => setTpFilter(e.target.value)}><option value="">Semua TP</option>{tpOptions.map(tp => <option key={tp} value={tp}>{shortText(tp, 40)}</option>)}</select></Field>
        <Field label="Tingkat kognitif"><select className="input" value={cognitiveFilter} onChange={e => setCognitiveFilter(e.target.value)}><option value="">Semua tingkat</option>{['C4', 'C5', 'C6'].map(level => <option key={level} value={level}>{level}</option>)}</select></Field>
        <div className="sm:col-span-2 lg:col-span-3"><Field label="Indikator"><select className="input" value={indicatorFilter} onChange={e => setIndicatorFilter(e.target.value)}><option value="">Semua indikator</option>{indicatorOptions.map(item => <option key={item.key} value={item.key}>{shortText(item.label, 70)}</option>)}</select></Field></div>
        <div className="flex items-end"><Button variant="secondary" className="w-full" onClick={resetFilters}><RotateCcw size={16} /> Reset filter</Button></div>
      </div>
      <div className="mt-3 text-xs text-slate-500">
        {evidence.length} butir bukti tersedia • {heatmap.rows.length} siswa dan {heatmap.columns.length} indikator tampil • minimal {minEvidence} bukti dan {minEvidence} soal berbeda per sel
      </div>
    </Card>

    {!evidence.length ? (
      <EmptyState title="Belum ada bukti penguasaan" description="Belum ada respons siswa yang terekam sebagai bukti keterampilan. Bukti dibuat otomatis ketika siswa menyelesaikan latihan; tidak ada data contoh yang ditampilkan." />
    ) : !heatmap.rows.length || !heatmap.columns.length ? (
      <EmptyState title="Tidak ada bukti yang cocok dengan filter" description="Ubah atau reset filter untuk melihat data yang tersedia." action={<Button onClick={resetFilters}>Reset filter</Button>} />
    ) : <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Indikator terlemah" value={heatmap.insights.weakest[0] ? `${heatmap.insights.weakest[0].average}%` : '—'} sub={heatmap.insights.weakest[0] ? shortText(heatmap.insights.weakest[0].indicator, 34) : 'Belum cukup bukti'} tone="rose" />
        <StatCard label="Indikator terkuat" value={heatmap.insights.strongest[0] ? `${heatmap.insights.strongest[0].average}%` : '—'} sub={heatmap.insights.strongest[0] ? shortText(heatmap.insights.strongest[0].indicator, 34) : 'Belum cukup bukti'} tone="teal" />
        <StatCard label="Kesalahan tertinggi" value={heatmap.insights.highestErrorRate[0] ? `${heatmap.insights.highestErrorRate[0].rate}%` : '—'} sub={heatmap.insights.highestErrorRate[0] ? shortText(heatmap.insights.highestErrorRate[0].label, 34) : 'Tidak ada respons salah'} tone="amber" />
        <StatCard label="Siswa perlu remedial" value={heatmap.insights.studentsNeedingRemedial} sub="Memiliki bukti cukup dengan kategori Perlu remedial" tone="blue" />
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="font-bold">Matriks penguasaan siswa × indikator</h2><p className="text-xs text-slate-500">Klik sel atau nama siswa untuk melihat detail. Sel bergaris menandakan bukti belum cukup.</p></div>
          <Button variant="secondary" onClick={() => setIndicatorFilter('')}>Tampilkan semua indikator</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="table min-w-[900px]">
            <thead><tr>
              <th className="sticky left-0 z-10 min-w-[170px] bg-slate-50">Siswa</th>
              {heatmap.columns.map(column => (
                <th key={column.indicatorKey} className="min-w-[110px] text-center">
                  <button className="font-semibold text-teal-800 hover:underline" title={`${column.indicator}\n${column.topicName} • ${column.subjectName}`} onClick={() => setIndicatorFilter(column.indicatorKey)}>
                    {shortText(column.indicator, 22)}
                  </button>
                  <div className="text-[10px] font-normal text-slate-500">{shortText(column.topicName, 20)}</div>
                </th>
              ))}
            </tr></thead>
            <tbody>
              {heatmap.rows.map(row => (
                <tr key={row.studentId}>
                  <th className="sticky left-0 z-10 bg-white text-left font-medium">
                    <button className="text-left hover:text-teal-700 hover:underline" onClick={() => openStudent(row.studentId)}>
                      {row.studentName}<div className="text-[11px] font-normal text-slate-500">{row.className}</div>
                    </button>
                  </th>
                  {heatmap.columns.map(column => {
                    const cell = row.cells.find(c => c.indicatorKey === column.indicatorKey)
                    if (!cell) return <td key={column.indicatorKey} className="text-center text-slate-400">–</td>
                    return (
                      <td key={column.indicatorKey} className="p-1 text-center">
                        <button className="w-full rounded-lg px-2 py-2 text-center transition hover:brightness-95" style={cellStyle(cell)} title={cellHint(cell)} onClick={() => openStudent(cell.studentId)}>
                          <div className="text-sm font-bold">{cell.percentage}%</div>
                          <div className="text-[11px]">{cell.correct}/{cell.total} benar</div>
                          <div className="mt-0.5 text-[10px] font-semibold">{cell.sufficient ? cell.category : 'belum cukup bukti'}</div>
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-bold">Ringkasan per kompetensi</h2>
          <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Kompetensi</th><th>Rata-rata</th><th>Siswa Belum Menguasai</th><th>Bukti</th><th>Status</th></tr></thead>
            <tbody>{heatmap.columns.map(column => {
              const cells = cellsByIndicator.get(column.indicatorKey) || []
              const notMastered = cells.filter(c => !c.sufficient || !MASTERED.has(c.category)).length
              const status = cells.some(c => c.sufficient) ? categorize(column.average, thresholds) : 'Cukup'
              const statusColor = colorForCategory(status, colors)
              return <tr key={column.indicatorKey}>
                <td><div className="font-semibold">{column.indicator}</div><div className="text-xs text-slate-500">{column.topicName} • {column.subjectName}</div>{column.insufficientCount > 0 && <div className="text-[11px] text-slate-400">{column.insufficientCount} sel belum cukup bukti</div>}</td>
                <td className="font-semibold">{column.average}%</td>
                <td>{notMastered} dari {cells.length} siswa</td>
                <td className="text-xs">{column.totalEvidence} butir • {cells.filter(c => c.sufficient).length} sel cukup<br />Dominan: {column.topError}</td>
                <td><span className="badge" style={{ backgroundColor: statusColor, color: textOn(statusColor) }}>{cells.some(c => c.sufficient) ? status : 'belum cukup bukti'}</span></td>
              </tr>
            })}</tbody>
          </table></div>
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">Distribusi status</h2>
          {distributionData.length ? <ResponsiveContainer width="100%" height={230}>
            <PieChart><Pie data={distributionData} dataKey="value" nameKey="name" outerRadius={80} label>{distributionData.map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /><Legend /></PieChart>
          </ResponsiveContainer> : <p className="text-sm text-slate-500">Tidak ada data.</p>}
          <div className="mt-3 space-y-2">
            <div className="rounded-xl bg-rose-50 p-3 text-sm"><b>Indikator terlemah:</b> {heatmap.insights.weakest.slice(0, 3).map(c => `${shortText(c.indicator, 28)} (${c.average}%)`).join(', ') || '—'}</div>
            <div className="rounded-xl bg-teal-50 p-3 text-sm"><b>Indikator terkuat:</b> {heatmap.insights.strongest.slice(0, 3).map(c => `${shortText(c.indicator, 28)} (${c.average}%)`).join(', ') || '—'}</div>
            <div className="rounded-xl bg-amber-50 p-3 text-sm"><b>Kesalahan tertinggi:</b> {heatmap.insights.highestErrorRate.slice(0, 3).map(c => `${shortText(c.label, 26)} (${c.rate}%)`).join(', ') || '—'}</div>
          </div>
        </Card>
      </div>
    </>}

    <Modal open={!!detail && !!selectedStudentId} onClose={() => { setSelectedStudentId(null); setEvidenceMode(null) }} title={`Detail penguasaan – ${detail ? (students.find(s => s.id === selectedStudentId)?.name || detail.mastered[0]?.studentName || 'Siswa') : 'Siswa'}`} wide>
      {detail && <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-teal-50 p-3 text-sm"><b>{detail.mastered.length}</b> indikator dikuasai</div>
          <div className="rounded-xl bg-amber-50 p-3 text-sm"><b>{detail.weak.length}</b> indikator perlu penguatan (bukti cukup)</div>
          <div className="rounded-xl bg-slate-100 p-3 text-sm"><b>{detail.insufficient.length}</b> indikator belum cukup bukti</div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
          <select className="input max-w-xs" value={chosenIndicator} onChange={e => setTargetIndicator(e.target.value)} aria-label="Pilih indikator untuk remedial">
            <option value="">Pilih indikator remedial</option>
            {detailCells.map(cell => <option key={`${cell.indicatorKey}-${cell.topicId}`} value={cell.indicatorKey}>{shortText(cell.indicator, 50)} ({cell.percentage}%)</option>)}
          </select>
          <Button variant="secondary" onClick={() => setEvidenceMode('answers')}>Lihat jawaban siswa</Button>
          <Button variant="secondary" onClick={() => setEvidenceMode('wrong')}>Lihat soal yang salah</Button>
          <Button disabled={!chosenIndicator} onClick={() => navigate(`/remedial?student=${encodeURIComponent(selectedStudentId || '')}&indicator=${encodeURIComponent(chosenIndicator)}`)}>Tugaskan remedial</Button>
          <Button variant="secondary" onClick={printReport}><Printer size={16} /> Cetak laporan individu</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div><h3 className="mb-2 font-bold">Indikator dikuasai</h3>{detail.mastered.length ? <div className="space-y-2">{detail.mastered.map(c => <div key={c.indicatorKey} className="rounded-lg border p-2 text-xs"><b>{c.indicator}</b> • {c.percentage}% ({c.correct}/{c.total}) • {c.topicName}</div>)}</div> : <p className="text-sm text-slate-500">Belum ada indikator dengan bukti cukup yang dikuasai.</p>}</div>
          <div><h3 className="mb-2 font-bold">Indikator perlu penguatan</h3>{detail.weak.length ? <div className="space-y-2">{detail.weak.map(c => <div key={c.indicatorKey} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs"><b>{c.indicator}</b> • {c.percentage}% • {c.category} • {c.topicName}</div>)}</div> : <p className="text-sm text-slate-500">Tidak ada indikator lemah dengan bukti cukup.</p>}</div>
          <div><h3 className="mb-2 font-bold">Belum cukup bukti</h3>{detail.insufficient.length ? <div className="space-y-2">{detail.insufficient.map(c => <div key={c.indicatorKey} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"><b>{c.indicator}</b> • {c.percentage}% ({c.correct}/{c.total})<div className="text-slate-500">{c.note || 'Belum memenuhi minimal bukti.'}</div></div>)}</div> : <p className="text-sm text-slate-500">Semua indikator memiliki bukti cukup.</p>}</div>
          <div>
            <h3 className="mb-2 font-bold">Pola kesalahan & miskonsepsi</h3>
            <div className="mb-2 text-xs"><b>Kesalahan:</b> {detail.frequentErrors.length ? detail.frequentErrors.map(e => `${e.label} (${e.count}x)`).join(', ') : 'Tidak ada'}</div>
            <div className="text-xs"><b>Miskonsepsi:</b> {detail.misconceptions.length ? detail.misconceptions.map(m => `${m.label} (${m.count})`).join(', ') : 'Tidak ada miskonsepsi dengan bukti minimal dua jawaban salah.'}</div>
            <h4 className="mb-1 mt-3 text-sm font-bold">Riwayat attempt</h4>
            <div className="max-h-40 overflow-y-auto"><table className="table text-xs"><thead><tr><th>Waktu</th><th>Jenis</th><th>Nilai</th><th>Benar</th></tr></thead><tbody>{detail.history.map(h => <tr key={h.attemptId}><td>{new Date(h.at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>{h.kind || 'reguler'}</td><td>{h.score}%</td><td>{h.correct}/{h.total}</td></tr>)}</tbody></table></div>
          </div>
        </div>

        <Card>
          <h3 className="mb-3 font-bold">Tren penguasaan per indikator</h3>
          {trendData.length ? <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trendData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="tanggal" /><YAxis domain={[0, 100]} /><Tooltip /><Legend />{trendLabels.map((label, index) => <Bar key={label} dataKey={label} fill={TREND_COLORS[index % TREND_COLORS.length]} radius={[4, 4, 0, 0]} />)}</BarChart>
          </ResponsiveContainer> : <p className="text-sm text-slate-500">Belum ada cukup titik waktu untuk menampilkan tren per indikator.</p>}
        </Card>

        <Card><h3 className="mb-2 font-bold">Rekomendasi</h3><ol className="list-inside list-decimal space-y-1 text-sm text-slate-700">{detail.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ol></Card>
      </div>}
    </Modal>

    <Modal open={!!evidenceMode && !!selectedStudentId} onClose={() => setEvidenceMode(null)} title={evidenceMode === 'wrong' ? 'Soal yang salah' : 'Jawaban siswa'} wide>
      {!detailEvidence.length ? <EmptyState title="Tidak ada butir untuk ditampilkan" description="Tidak ada bukti yang cocok dengan filter pada tampilan ini." /> : (
        <div className="space-y-3">
          {detailEvidence.map((item: SkillEvidence, index) => {
            const question = questionMap.get(item.questionId)
            const labelFor = (ids: string[]) => (question?.options || []).filter(o => ids.includes(o.id)).map(o => `${o.label}. ${o.text}`).join(' | ') || (ids.join(', ') || '—')
            return <div key={item.id} className="rounded-xl border p-3 text-sm">
              <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{index + 1}. {item.indicator} • {question?.code || item.questionId}</span><Badge className={item.correct ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'}>{item.correct ? 'Benar' : 'Salah'}</Badge></div>
              <RichText text={question?.prompt || 'Teks soal tidak ditemukan.'} className="text-sm" />
              <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                <div><b>Dijawab:</b> {labelFor(item.selected)}</div>
                <div><b>Kunci:</b> {labelFor(item.correctIds)}</div>
                <div><b>Poin:</b> {item.points}/{item.maxPoints} • {percentageText(item)}</div>
                <div><b>Kesalahan:</b> {item.errorType || '—'} • <b>Miskonsepsi:</b> {item.misconception || '—'}</div>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleString('id-ID')} • attempt {item.attemptId}</div>
            </div>
          })}
        </div>
      )}
    </Modal>
  </div>
}

function percentageText(item: SkillEvidence) {
  return `${item.maxPoints > 0 ? Math.round(item.points / item.maxPoints * 100) : (item.correct ? 100 : 0)}%`
}
