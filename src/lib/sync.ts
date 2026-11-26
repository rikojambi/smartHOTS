import { db } from '../db/db'
import type { Exercise, LearningAnalytic, Question, RemediationRecommendation, Student, StudentAttempt } from '../types'

export const RESULT_SYNC_FORMAT = 'smart-hots-result-sync'
export const RESULT_SYNC_VERSION = 1

export interface ResultSyncPackage {
  format: typeof RESULT_SYNC_FORMAT
  version: number
  exportedAt: number
  student: Student
  attempts: StudentAttempt[]
  analytics: LearningAnalytic[]
  recommendations: RemediationRecommendation[]
  questions: Question[]
  exercises: Exercise[]
}

export interface ImportSummary {
  students: number
  attempts: number
  skippedAttempts: number
  analytics: number
  recommendations: number
  questions: number
  exercises: number
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

export async function buildResultSyncPackage(studentId: string): Promise<ResultSyncPackage> {
  const student = await db.students.get(studentId)
  if (!student) throw new Error('Data siswa tidak ditemukan.')

  const allAttempts = await db.studentAttempts.where('studentId').equals(studentId).toArray()
  const attempts = allAttempts.filter(a => a.status === 'selesai')
  const attemptIds = new Set(attempts.map(a => a.id))
  const [allAnalytics, allRecommendations] = await Promise.all([
    db.learningAnalytics.where('studentId').equals(studentId).toArray(),
    db.remediationRecommendations.where('studentId').equals(studentId).toArray()
  ])
  const analytics = allAnalytics.filter(a => attemptIds.has(a.attemptId))
  const recommendations = allRecommendations.filter(r => !r.completed)
  const questionIds = Array.from(new Set(attempts.flatMap(a => a.questionIds)))
  const exerciseIds = Array.from(new Set(attempts.map(a => a.exerciseId)))
  const [questionRows, exerciseRows] = await Promise.all([
    db.questions.bulkGet(questionIds),
    db.exercises.bulkGet(exerciseIds)
  ])

  return {
    format: RESULT_SYNC_FORMAT,
    version: RESULT_SYNC_VERSION,
    exportedAt: Date.now(),
    student,
    attempts,
    analytics,
    recommendations,
    questions: questionRows.filter((q): q is Question => !!q),
    exercises: exerciseRows.filter((e): e is Exercise => !!e)
  }
}

function saveJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadResultSyncPackage(pkg: ResultSyncPackage, filename?: string) {
  const safeName = pkg.student.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'siswa'
  const date = new Date(pkg.exportedAt).toISOString().slice(0, 10)
  saveJson(pkg, filename || `hasil-latihan-${safeName}-${date}.json`)
}

export function parseResultSyncPackage(text: string): ResultSyncPackage {
  let data: unknown
  try { data = JSON.parse(text) } catch { throw new Error('File bukan JSON yang valid.') }
  const pkg = data as Partial<ResultSyncPackage>
  if (pkg?.format !== RESULT_SYNC_FORMAT || pkg.version !== RESULT_SYNC_VERSION) {
    throw new Error('Format file tidak dikenali. Pastikan file berasal dari menu "Unduh hasil untuk guru".')
  }
  if (!pkg.student?.id || !pkg.student?.name || !Array.isArray(pkg.attempts)) {
    throw new Error('Isi paket tidak lengkap.')
  }
  return {
    format: RESULT_SYNC_FORMAT,
    version: RESULT_SYNC_VERSION,
    exportedAt: Number(pkg.exportedAt) || Date.now(),
    student: pkg.student,
    attempts: asArray<StudentAttempt>(pkg.attempts),
    analytics: asArray<LearningAnalytic>(pkg.analytics),
    recommendations: asArray<RemediationRecommendation>(pkg.recommendations),
    questions: asArray<Question>(pkg.questions),
    exercises: asArray<Exercise>(pkg.exercises)
  }
}

export async function importResultSyncPackage(pkg: ResultSyncPackage): Promise<ImportSummary> {
  const summary: ImportSummary = {
    students: 0, attempts: 0, skippedAttempts: 0, analytics: 0,
    recommendations: 0, questions: 0, exercises: 0
  }

  await db.transaction('rw', db.tables.map(t => t.name), async () => {
    const localStudent = await db.students.get(pkg.student.id)
    if (!localStudent) { await db.students.put(pkg.student); summary.students++ }

    for (const question of pkg.questions) {
      if (await db.questions.get(question.id)) continue
      await db.questions.put(question); summary.questions++
    }
    for (const exercise of pkg.exercises) {
      if (await db.exercises.get(exercise.id)) continue
      await db.exercises.put(exercise); summary.exercises++
    }
    for (const attempt of pkg.attempts) {
      if (await db.studentAttempts.get(attempt.id)) { summary.skippedAttempts++; continue }
      await db.studentAttempts.put(attempt); summary.attempts++
    }
    for (const analytic of pkg.analytics) {
      if (await db.learningAnalytics.get(analytic.id)) continue
      await db.learningAnalytics.put(analytic); summary.analytics++
    }
    for (const recommendation of pkg.recommendations) {
      if (await db.remediationRecommendations.get(recommendation.id)) continue
      await db.remediationRecommendations.put(recommendation); summary.recommendations++
    }
  })

  return summary
}
