import type { MasteryCategory, Question, SkillEvidence, Student, StudentAttempt, Subject, Topic } from '../types'
import { categorize, indicatorKeyOf, type Thresholds, DEFAULT_THRESHOLDS } from './competency'

export interface HeatmapFilters {
  classId?: string
  studentId?: string
  subjectId?: string
  topicId?: string
  from?: number
  to?: number
  tp?: string
  cognitive?: string
  indicatorKey?: string
}

export interface HeatmapCell {
  studentId: string
  studentName: string
  className: string
  indicatorKey: string
  indicator: string
  topicId: string
  topicName: string
  correct: number
  total: number
  points: number
  maxPoints: number
  percentage: number
  category: MasteryCategory
  sufficient: boolean
  attempts: number
  errorTypes: string[]
  misconceptions: string[]
  /** Catatan kecukupan bukti, misalnya saat hanya satu attempt yang tersedia. */
  note?: string
}

export interface HeatmapColumn {
  indicatorKey: string
  indicator: string
  topicId: string
  topicName: string
  subjectId: string
  subjectName: string
  totalEvidence: number
  average: number
  masteryCount: number
  needsRemedialCount: number
  insufficientCount: number
  topError: string
}

export interface HeatmapInsight {
  weakest: HeatmapColumn[]
  strongest: HeatmapColumn[]
  highestErrorRate: Array<{ label: string; errors: number; total: number; rate: number }>
  studentsNeedingRemedial: number
  distribution: Array<{ category: string; count: number }>
}

export interface HeatmapInput {
  evidence: SkillEvidence[]
  students: Student[]
  questions: Question[]
  topics: Topic[]
  subjects: Subject[]
  settings: { minEvidence: number; thresholds: Thresholds }
  /** Opsional: dipakai untuk label jenis attempt dan waktu Attempt pada riwayat. */
  attempts?: StudentAttempt[]
}

export interface StudentDetail {
  mastered: HeatmapCell[]
  weak: HeatmapCell[]
  insufficient: HeatmapCell[]
  frequentErrors: Array<{ label: string; count: number }>
  misconceptions: Array<{ label: string; count: number }>
  history: Array<{ attemptId: string; at: number; score: number; kind?: string; correct: number; total: number }>
  trend: Array<{ at: number; percentage: number; label: string }>
  recommendations: string[]
}

const CATEGORIES: MasteryCategory[] = ['Sangat baik', 'Baik', 'Cukup', 'Perlu penguatan', 'Perlu remedial']
const MASTERED = new Set<MasteryCategory>(['Sangat baik', 'Baik'])
const DAY = 24 * 60 * 60 * 1000

interface EvidenceRow {
  ev: SkillEvidence
  key: string
  indicator: string
  topicName: string
  subjectId: string
  subjectName: string
  studentName: string
  className: string
  pct: number
}

function clean(value: string | undefined): string {
  return (value || '').trim()
}

function percentageOf(ev: SkillEvidence): number {
  const raw = ev.maxPoints > 0 ? Math.round((ev.points / ev.maxPoints) * 100) : (ev.correct ? 100 : 0)
  return Math.max(0, Math.min(100, raw))
}

function average(values: number[]): number {
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function buildIndex(input: HeatmapInput) {
  const questions = new Map(input.questions.map(q => [q.id, q]))
  const students = new Map(input.students.map(s => [s.id, s]))
  const topics = new Map(input.topics.map(t => [t.id, t]))
  const subjects = new Map(input.subjects.map(s => [s.id, s]))
  const attempts = new Map((input.attempts || []).map(a => [a.id, a]))
  return { questions, students, topics, subjects, attempts }
}

/** Nilai persentase per butir bukti dibulatkan dulu, baru dirata-ratakan. */
function toRow(ev: SkillEvidence, index: ReturnType<typeof buildIndex>): EvidenceRow {
  const question = index.questions.get(ev.questionId)
  const student = index.students.get(ev.studentId)
  const topic = index.topics.get(ev.topicId) || index.topics.get(question?.topicId || '')
  const subjectId = ev.subjectId || question?.subjectId || ''
  const subject = index.subjects.get(subjectId) || index.subjects.get(question?.subjectId || '')
  const key = clean(ev.indicatorKey) || (question ? indicatorKeyOf(question) : clean(ev.indicator))
  const indicator = clean(ev.indicator) || clean(question?.indicator) || key
  const topicName = clean(topic?.name) || clean(ev.topicId.split('|').pop()) || clean(question?.topicId.split('|').pop()) || 'Materi tidak diketahui'
  return {
    ev,
    key,
    indicator,
    topicName,
    subjectId,
    subjectName: clean(subject?.name) || clean(subjectId) || 'Mapel tidak diketahui',
    studentName: clean(student?.name) || `Siswa ${ev.studentId}`,
    className: clean(student?.className) || 'Tanpa kelas',
    pct: percentageOf(ev)
  }
}

function matches(row: EvidenceRow, filters: HeatmapFilters, index: ReturnType<typeof buildIndex>): boolean {
  const q = index.questions.get(row.ev.questionId)
  const topic = index.topics.get(row.ev.topicId) || index.topics.get(q?.topicId || '')
  if (filters.classId && row.className !== filters.classId) return false
  if (filters.studentId && row.ev.studentId !== filters.studentId) return false
  if (filters.subjectId && row.subjectId !== filters.subjectId && q?.subjectId !== filters.subjectId) return false
  if (filters.topicId && row.ev.topicId !== filters.topicId && q?.topicId !== filters.topicId) return false
  if (filters.from !== undefined && row.ev.createdAt < filters.from) return false
  if (filters.to !== undefined && row.ev.createdAt > filters.to) return false
  if (filters.cognitive && row.ev.cognitive !== filters.cognitive && q?.cognitive !== filters.cognitive) return false
  if (filters.indicatorKey && row.key !== filters.indicatorKey) return false
  if (filters.tp) {
    const needle = filters.tp.trim().toLowerCase()
    const tpValues = [q?.tp || '', ...(topic?.tp || [])].map(v => v.toLowerCase())
    if (!tpValues.some(value => value === needle || value.includes(needle))) return false
  }
  return true
}

function filteredRows(input: HeatmapInput, filters: HeatmapFilters): EvidenceRow[] {
  const index = buildIndex(input)
  return input.evidence.map(ev => toRow(ev, index)).filter(row => matches(row, filters, index))
}

function groupBy<T>(rows: T[], keyOf: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const key = keyOf(row)
    const existing = groups.get(key)
    if (existing) existing.push(row)
    else groups.set(key, [row])
  }
  return groups
}

/**
 * Kecukupan bukti: minimal `minEvidence` butir, `minEvidence` soal berbeda, dan 2 attempt.
 * Jika seluruh data yang lolos filter hanya berasal dari satu attempt, syarat attempt
 * dilonggarkan menjadi `minEvidence` soal berbeda dan hal itu dicatat pada `note`.
 */
function sufficiency(rows: EvidenceRow[], minEvidence: number, totalAttempts: number) {
  const questions = new Set(rows.map(r => r.ev.questionId)).size
  const attempts = new Set(rows.map(r => r.ev.attemptId)).size
  const singleAttemptDataset = totalAttempts <= 1
  const enough = rows.length >= minEvidence && questions >= minEvidence && (singleAttemptDataset || attempts >= 2)
  const reasons: string[] = []
  if (rows.length < minEvidence) reasons.push(`minimal ${minEvidence} bukti`)
  if (questions < minEvidence) reasons.push(`minimal ${minEvidence} soal berbeda`)
  if (!singleAttemptDataset && attempts < 2) reasons.push('minimal 2 attempt')
  if (singleAttemptDataset) reasons.push('hanya tersedia satu attempt')
  return {
    sufficient: enough,
    note: enough
      ? (singleAttemptDataset ? `Kecukupan dari ${questions} soal berbeda (hanya satu attempt tersedia).` : undefined)
      : `Belum cukup bukti: ${reasons.join('; ')}.`
  }
}

/** Miskonsepsi hanya diakui bila didukung minimal dua jawaban salah pada indikator yang sama. */
function misconceptionCounts(rows: EvidenceRow[]) {
  const counts = new Map<string, { label: string; count: number }>()
  for (const row of rows) {
    if (row.ev.correct) continue
    const label = clean(row.ev.misconception)
    if (!label) continue
    const key = label.toLowerCase()
    const found = counts.get(key)
    if (found) found.count += 1
    else counts.set(key, { label, count: 1 })
  }
  return counts
}

function cellFrom(rows: EvidenceRow[], minEvidence: number, thresholds: Thresholds, totalAttempts: number): HeatmapCell {
  const first = rows[0]
  const correct = rows.filter(r => r.ev.correct).length
  const percentage = average(rows.map(r => r.pct))
  const evidenceState = sufficiency(rows, minEvidence, totalAttempts)
  const category: MasteryCategory = evidenceState.sufficient ? categorize(percentage, thresholds) : 'Cukup'
  const attempts = new Set(rows.map(r => r.ev.attemptId)).size
  const errorTypes = [...new Set(rows.filter(r => !r.ev.correct).map(r => clean(r.ev.errorType)).filter(Boolean))]

  const misconceptions: string[] = []
  let hasWeakEvidence = false
  for (const item of misconceptionCounts(rows).values()) {
    if (item.count >= 2) misconceptions.push(item.label)
    else hasWeakEvidence = true
  }
  if (hasWeakEvidence) misconceptions.push('belum cukup bukti')

  return {
    studentId: first.ev.studentId,
    studentName: first.studentName,
    className: first.className,
    indicatorKey: first.key,
    indicator: first.indicator,
    topicId: first.ev.topicId,
    topicName: first.topicName,
    correct,
    total: rows.length,
    points: Math.round(rows.reduce((sum, r) => sum + r.ev.points, 0) * 100) / 100,
    maxPoints: Math.round(rows.reduce((sum, r) => sum + r.ev.maxPoints, 0) * 100) / 100,
    percentage,
    category,
    sufficient: evidenceState.sufficient,
    attempts,
    errorTypes,
    misconceptions,
    note: evidenceState.note
  }
}

function buildColumns(rows: EvidenceRow[], minEvidence: number, thresholds: Thresholds, totalAttempts: number) {
  const byIndicator = groupBy(rows, r => r.key)
  const errorRates = new Map<string, { errors: number; total: number }>()
  const columns: HeatmapColumn[] = []
  for (const [key, group] of byIndicator) {
    const first = group[0]
    const errors = group.filter(r => !r.ev.correct).length
    errorRates.set(key, { errors, total: group.length })
    const cells = [...groupBy(group, r => r.ev.studentId).values()].map(cellRows => cellFrom(cellRows, minEvidence, thresholds, totalAttempts))
    const errorNames = new Map<string, { label: string; count: number }>()
    for (const row of group) {
      if (row.ev.correct) continue
      const label = clean(row.ev.errorType)
      if (!label) continue
      const nameKey = label.toLowerCase()
      const found = errorNames.get(nameKey)
      if (found) found.count += 1
      else errorNames.set(nameKey, { label, count: 1 })
    }
    const topError = [...errorNames.values()].sort((a, b) => b.count - a.count)[0]
    columns.push({
      indicatorKey: key,
      indicator: first.indicator,
      topicId: first.ev.topicId,
      topicName: first.topicName,
      subjectId: first.subjectId,
      subjectName: first.subjectName,
      totalEvidence: group.length,
      average: average(group.map(r => r.pct)),
      masteryCount: cells.filter(c => c.sufficient && MASTERED.has(c.category)).length,
      needsRemedialCount: cells.filter(c => c.sufficient && c.category === 'Perlu remedial').length,
      insufficientCount: cells.filter(c => !c.sufficient).length,
      topError: topError ? topError.label : 'Tidak ada data kesalahan'
    })
  }
  columns.sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'id') || a.topicName.localeCompare(b.topicName, 'id') || a.indicator.localeCompare(b.indicator, 'id'))
  return { columns, errorRates }
}

function buildInsights(rows: EvidenceRow[], columns: HeatmapColumn[], errorRates: Map<string, { errors: number; total: number }>, minEvidence: number, thresholds: Thresholds): HeatmapInsight {
  const allCells: HeatmapCell[] = []
  const totalAttempts = new Set(rows.map(r => r.ev.attemptId)).size
  const byStudent = groupBy(rows, r => r.ev.studentId)
  for (const studentRows of byStudent.values()) {
    for (const cellRows of groupBy(studentRows, r => r.key).values()) {
      allCells.push(cellFrom(cellRows, minEvidence, thresholds, totalAttempts))
    }
  }
  const candidates = columns.filter(c => c.totalEvidence >= minEvidence)
  const distribution = CATEGORIES.map(category => ({ category, count: allCells.filter(c => c.category === category).length }))
  const highestErrorRate = [...candidates].map(c => {
    const stat = errorRates.get(c.indicatorKey) || { errors: 0, total: c.totalEvidence }
    return { label: c.indicator, errors: stat.errors, total: stat.total, rate: stat.total ? Math.round(stat.errors / stat.total * 100) : 0 }
  }).filter(item => item.total > 0).sort((a, b) => b.rate - a.rate || b.errors - a.errors).slice(0, 5)
  return {
    weakest: [...candidates].sort((a, b) => a.average - b.average || b.totalEvidence - a.totalEvidence).slice(0, 5),
    strongest: [...candidates].sort((a, b) => b.average - a.average || b.totalEvidence - a.totalEvidence).slice(0, 5),
    highestErrorRate,
    studentsNeedingRemedial: new Set(allCells.filter(c => c.sufficient && c.category === 'Perlu remedial').map(c => c.studentId)).size,
    distribution
  }
}

/** Mengembalikan butir bukti mentah yang lolos filter (tanpa agregasi). */
export function filterHeatmapEvidence(input: HeatmapInput, filters: HeatmapFilters): SkillEvidence[] {
  return filteredRows(input, filters).map(row => row.ev)
}

/** Agregasi peta kelemahan lintas siswa. Murni komputasi, tanpa React atau Dexie. */
export function buildHeatmap(input: HeatmapInput, filters: HeatmapFilters): {
  rows: Array<{ studentId: string; studentName: string; className: string; cells: HeatmapCell[] }>
  columns: HeatmapColumn[]
  insights: HeatmapInsight
} {
  const rows = filteredRows(input, filters)
  const minEvidence = Math.max(1, Number(input.settings.minEvidence) || 1)
  const thresholds = { ...DEFAULT_THRESHOLDS, ...input.settings.thresholds }
  const totalAttempts = new Set(rows.map(r => r.ev.attemptId)).size
  const { columns, errorRates } = buildColumns(rows, minEvidence, thresholds, totalAttempts)

  const grouped = groupBy(rows, r => r.ev.studentId)
  const studentRows = [...grouped.entries()].map(([studentId, group]) => {
    const cells = [...groupBy(group, r => r.key).values()].map(cellRows => cellFrom(cellRows, minEvidence, thresholds, totalAttempts))
    cells.sort((a, b) => a.topicName.localeCompare(b.topicName, 'id') || a.indicator.localeCompare(b.indicator, 'id'))
    return { studentId, studentName: group[0].studentName, className: group[0].className, cells }
  }).sort((a, b) => a.className.localeCompare(b.className, 'id') || a.studentName.localeCompare(b.studentName, 'id'))

  return { rows: studentRows, columns, insights: buildInsights(rows, columns, errorRates, minEvidence, thresholds) }
}

/** Detail satu siswa: penguasaan, bukti kesalahan, riwayat, dan tren per indikator. */
export function buildStudentDetail(input: HeatmapInput, studentId: string, filters: HeatmapFilters): StudentDetail {
  const rows = filteredRows(input, { ...filters, studentId })
  const minEvidence = Math.max(1, Number(input.settings.minEvidence) || 1)
  const thresholds = { ...DEFAULT_THRESHOLDS, ...input.settings.thresholds }
  const totalAttempts = new Set(rows.map(r => r.ev.attemptId)).size
  const index = buildIndex(input)
  const groups = groupBy(rows, r => r.key)
  const cells = [...groups.values()].map(cellRows => cellFrom(cellRows, minEvidence, thresholds, totalAttempts))
    .sort((a, b) => a.topicName.localeCompare(b.topicName, 'id') || a.indicator.localeCompare(b.indicator, 'id'))

  const mastered = cells.filter(c => c.sufficient && MASTERED.has(c.category))
  const weak = cells.filter(c => c.sufficient && !MASTERED.has(c.category))
  const insufficient = cells.filter(c => !c.sufficient)

  const errors = new Map<string, number>()
  for (const row of rows) {
    if (row.ev.correct) continue
    const label = clean(row.ev.errorType)
    if (!label) continue
    const key = label.toLowerCase()
    errors.set(key, (errors.get(key) || 0) + 1)
  }
  const frequentErrors = [...errors.entries()].map(([key, count]) => ({
    label: rows.find(r => !r.ev.correct && clean(r.ev.errorType).toLowerCase() === key)?.ev.errorType || key,
    count
  })).sort((a, b) => b.count - a.count).slice(0, 10)

  const misconceptionMap = new Map<string, { label: string; count: number }>()
  let weakEvidenceCount = 0
  for (const group of groups.values()) {
    for (const item of misconceptionCounts(group).values()) {
      if (item.count < 2) { weakEvidenceCount += 1; continue }
      const key = item.label.toLowerCase()
      const found = misconceptionMap.get(key)
      if (found) found.count += item.count
      else misconceptionMap.set(key, { ...item })
    }
  }
  const misconceptions = [...misconceptionMap.values()].sort((a, b) => b.count - a.count).slice(0, 10)
  if (weakEvidenceCount) misconceptions.push({ label: 'belum cukup bukti', count: weakEvidenceCount })

  const attemptGroups = groupBy(rows, r => r.ev.attemptId)
  const history = [...attemptGroups.entries()].map(([attemptId, group]) => {
    const attempt = index.attempts.get(attemptId)
    return {
      attemptId,
      at: attempt?.finishedAt || attempt?.startedAt || Math.max(...group.map(r => r.ev.createdAt)),
      score: average(group.map(r => r.pct)),
      kind: attempt?.kind,
      correct: group.filter(r => r.ev.correct).length,
      total: group.length
    }
  }).sort((a, b) => b.at - a.at)

  const trendPoints = new Map<string, { at: number; percentage: number; label: string }>()
  for (const [key, group] of groups) {
    const label = group[0].indicator
    for (const [bucket, bucketRows] of groupBy(group, r => String(Math.floor(r.ev.createdAt / DAY) * DAY))) {
      const pointKey = `${key}|${bucket}`
      trendPoints.set(pointKey, { at: Number(bucket), percentage: average(bucketRows.map(r => r.pct)), label })
    }
  }
  const trend = [...trendPoints.values()].sort((a, b) => a.at - b.at || a.label.localeCompare(b.label, 'id')).slice(-120)

  const recommendations: string[] = []
  for (const cell of [...weak].sort((a, b) => a.percentage - b.percentage).slice(0, 5)) {
    const note = cell.misconceptions.filter(m => m !== 'belum cukup bukti')
    recommendations.push(`Prioritaskan remedial indikator "${cell.indicator}" (${cell.topicName}): penguasaan ${cell.percentage}% dari ${cell.total} bukti pada ${cell.attempts} attempt.${note.length ? ` Miskonsepsi: ${note.join(', ')}.` : ''}`)
  }
  for (const cell of insufficient.slice(0, 3)) {
    recommendations.push(`Tambah bukti untuk indikator "${cell.indicator}" (${cell.topicName}): baru ${cell.total} respons dari ${cell.attempts} attempt. ${cell.note || ''}`.trim())
  }
  if (frequentErrors.length) recommendations.push(`Latih kembali pola kesalahan paling sering: ${frequentErrors.slice(0, 3).map(e => `${e.label} (${e.count}x)`).join(', ')}.`)
  if (!recommendations.length) recommendations.push('Penguasaan siswa sudah stabil pada indikator yang memiliki bukti cukup; pertahankan dengan latihan berkala.')

  return { mastered, weak, insufficient, frequentErrors, misconceptions, history, trend, recommendations }
}
