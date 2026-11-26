import type { DiagnosticFinding, LearningAnalytic, MasteryCategory, Question, SkillEvidence, StudentAttempt, Exercise } from '../types'
import { db, getSetting } from '../db/db'
import { categorize, DEFAULT_THRESHOLDS, indicatorKeyOf, type Thresholds } from './competency'

export { categorize, DEFAULT_THRESHOLDS, indicatorKeyOf } from './competency'
export type { Thresholds } from './competency'

export function classifyError(q: Question, selected: string[]): string {
  const text = `${q.indicator} ${q.misconception} ${q.subTopic}`.toLowerCase()
  if (!selected.length) return 'Kesalahan interpretasi soal (tidak ada jawaban)'
  if (/grafik|tabel|data|membaca|baca/.test(text)) return 'Kesalahan membaca data'
  if (/strategi|pemilihan|rancang|merancang|solusi/.test(text)) return 'Kesalahan penalaran'
  if (/rumus|prosedur|urutan|langkah|teknik/.test(text)) return 'Kesalahan prosedur'
  if (/hitung|suku|jumlah|nilai/.test(text)) return 'Kesalahan perhitungan'
  return 'Kesalahan konsep'
}

function aggregate(attempt: StudentAttempt, questions: Question[], type: 'materi' | 'tp' | 'indikator', t: Thresholds): DiagnosticFinding[] {
  const map = new Map<string, { correct: number; total: number }>()
  attempt.answers.forEach(a => {
    const q = questions.find(x => x.id === a.questionId)
    if (!q) return
    const key = type === 'materi' ? `${q.topicId}|${q.subTopic}` : type === 'tp' ? q.tp : indicatorKeyOf(q)
    const row = map.get(key) || { correct: 0, total: 0 }
    row.total += 1
    if (a.correct) row.correct += 1
    map.set(key, row)
  })
  return [...map.entries()].map(([key, v]) => {
    const percentage = Math.round((v.correct / v.total) * 100)
    const label = type === 'materi'
      ? key.split('|')[1]
      : type === 'indikator'
        ? (questions.find(q => indicatorKeyOf(q) === key)?.indicator || key)
        : key.length > 72 ? `${key.slice(0, 69)}…` : key
    return { key, label, type, correct: v.correct, total: v.total, percentage, category: categorize(percentage, t) }
  }).sort((a, b) => a.percentage - b.percentage)
}

export function buildSkillEvidence(attempt: StudentAttempt, questions: Question[]): SkillEvidence[] {
  const createdAt = attempt.finishedAt || Date.now()
  return attempt.answers.flatMap(a => {
    const q = questions.find(x => x.id === a.questionId)
    if (!q) return []
    return [{
      id: `se-${attempt.id}-${q.id}`,
      attemptId: attempt.id,
      studentId: attempt.studentId,
      questionId: q.id,
      subjectId: q.subjectId,
      topicId: q.topicId,
      indicatorKey: indicatorKeyOf(q),
      indicator: q.indicator,
      subTopic: q.subTopic,
      cognitive: q.cognitive,
      difficulty: q.difficulty,
      correct: a.correct,
      points: a.points,
      maxPoints: a.maxPoints || 1,
      selected: a.selected,
      correctIds: a.correctIds,
      misconception: q.misconception,
      errorType: a.correct ? '' : classifyError(q, a.selected),
      createdAt
    }]
  })
}

export async function persistSkillEvidence(attempt: StudentAttempt, questions: Question[]) {
  const rows = buildSkillEvidence(attempt, questions)
  if (rows.length) await db.skillEvidence.bulkPut(rows)
  return rows
}

export async function analyzeAttempt(attempt: StudentAttempt, exercise: Exercise, questions: Question[], attemptId: string): Promise<LearningAnalytic> {
  const thresholds = await getSetting<Thresholds>('masteryThresholds', DEFAULT_THRESHOLDS)
  const findings = [
    ...aggregate(attempt, questions, 'materi', thresholds),
    ...aggregate(attempt, questions, 'tp', thresholds),
    ...aggregate(attempt, questions, 'indikator', thresholds)
  ]
  const wrongAnswers = attempt.answers.filter(a => !a.correct)
  const errorCounts = new Map<string, number>()
  const misconceptions = new Set<string>()
  const evidence: LearningAnalytic['evidence'] = []

  wrongAnswers.forEach(a => {
    const q = questions.find(x => x.id === a.questionId)
    if (!q) return
    const error = classifyError(q, a.selected)
    errorCounts.set(error, (errorCounts.get(error) || 0) + 1)
    if (q.misconception) misconceptions.add(q.misconception)
    evidence.push({
      questionCode: q.code,
      indicator: q.indicator,
      selected: a.selected,
      correct: q.options.filter(o => o.isCorrect).map(o => o.label)
    })
  })

  const errorPatterns = [...errorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => `${label} (${count} soal)`)

  const weak = findings.filter(f => f.type === 'materi' && f.percentage < thresholds.baik)
  const recommendations = [
    ...weak.map(f => `Pelajari kembali materi "${f.label}" (penguasaan ${f.percentage}%).`),
    ...[...misconceptions].slice(0, 4).map(m => `Perbaiki miskonsepsi: ${m}`),
    ...weak.slice(0, 3).map(f => `Kerjakan latihan remedial pada materi "${f.label}".`)
  ]
  if (!recommendations.length) recommendations.push('Pertahankan penguasaan materi dengan latihan lanjutan rutin.')

  return {
    id: `an-${attemptId}`,
    attemptId,
    studentId: attempt.studentId,
    subjectId: exercise.subjectId,
    createdAt: Date.now(),
    score: attempt.score,
    findings,
    misconceptions: [...misconceptions],
    errorPatterns,
    evidence,
    recommendations,
    priorityOrder: weak.map(f => f.label)
  }
}

export function masteryColor(category: MasteryCategory) {
  switch (category) {
    case 'Sangat baik': return 'bg-emerald-100 text-emerald-800'
    case 'Baik': return 'bg-teal-100 text-teal-800'
    case 'Cukup': return 'bg-amber-100 text-amber-800'
    case 'Perlu penguatan': return 'bg-orange-100 text-orange-800'
    default: return 'bg-rose-100 text-rose-800'
  }
}
