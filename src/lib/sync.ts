import { db } from '../db/db'
import { buildSkillEvidence } from './analytics'
import type {
  Exercise, ImportHistory, LearningAnalytic, LearningObjective, Question, QuestionMedia,
  RemedialPlan, RemediationRecommendation, SkillEvidence, Student, StudentAttempt
} from '../types'

export const RESULT_SYNC_FORMAT = 'smart-hots-result-sync'
export const RESULT_SYNC_VERSION = 2

export type SerializedQuestionMedia = Omit<QuestionMedia, 'blob'> & { blob: { __blob: true; data: number[] } }

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
  skillEvidence?: SkillEvidence[]
  remedialPlans?: RemedialPlan[]
  learningObjectives?: LearningObjective[]
  questionMedia?: SerializedQuestionMedia[]
  importHistory?: ImportHistory[]
}

export interface ImportSummary {
  students: number
  attempts: number
  skippedAttempts: number
  analytics: number
  recommendations: number
  questions: number
  exercises: number
  skillEvidence: number
  remedialPlans: number
  objectives: number
  media: number
  importHistory: number
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

async function serializeMedia(row: QuestionMedia): Promise<SerializedQuestionMedia> {
  const data = row.blob instanceof Blob ? Array.from(new Uint8Array(await row.blob.arrayBuffer())) : []
  return { ...row, blob: { __blob: true, data } }
}

function deserializeMedia(row: SerializedQuestionMedia): QuestionMedia {
  const raw = row.blob as unknown as { __blob?: boolean; data?: number[] }
  const blob = raw?.__blob && Array.isArray(raw.data) ? new Blob([new Uint8Array(raw.data)]) : new Blob()
  return { ...row, blob } as QuestionMedia
}

export async function buildResultSyncPackage(studentId: string): Promise<ResultSyncPackage> {
  const student = await db.students.get(studentId)
  if (!student) throw new Error('Data siswa tidak ditemukan.')

  const allAttempts = await db.studentAttempts.where('studentId').equals(studentId).toArray()
  const attempts = allAttempts.filter(a => a.status === 'selesai')
  const attemptIds = new Set(attempts.map(a => a.id))
  const [allAnalytics, allRecommendations, allEvidence, allPlans] = await Promise.all([
    db.learningAnalytics.where('studentId').equals(studentId).toArray(),
    db.remediationRecommendations.where('studentId').equals(studentId).toArray(),
    db.skillEvidence.where('studentId').equals(studentId).toArray(),
    db.remedialPlans.where('studentId').equals(studentId).toArray()
  ])
  const analytics = allAnalytics.filter(a => attemptIds.has(a.attemptId))
  const recommendations = allRecommendations.filter(r => !r.completed)
  const skillEvidence = allEvidence.filter(e => attemptIds.has(e.attemptId))
  const remedialPlans = allPlans.filter(p => p.history.some(h => attemptIds.has(h.attemptId)) || p.status !== 'disarankan')
  const questionIds = Array.from(new Set(attempts.flatMap(a => a.questionIds)))
  const exerciseIds = Array.from(new Set(attempts.map(a => a.exerciseId)))
  const [questionRows, exerciseRows, mediaRows, objectives, history] = await Promise.all([
    db.questions.bulkGet(questionIds),
    db.exercises.bulkGet(exerciseIds),
    db.questionMedia.filter(m => !!m.questionId && questionIds.includes(m.questionId)).toArray(),
    db.learningObjectives.toArray(),
    db.importHistory.toArray()
  ])
  const media = await Promise.all(mediaRows.map(serializeMedia))

  return {
    format: RESULT_SYNC_FORMAT,
    version: RESULT_SYNC_VERSION,
    exportedAt: Date.now(),
    student,
    attempts,
    analytics,
    recommendations,
    questions: questionRows.filter((q): q is Question => !!q),
    exercises: exerciseRows.filter((e): e is Exercise => !!e),
    skillEvidence,
    remedialPlans,
    learningObjectives: objectives,
    questionMedia: media,
    importHistory: history
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

/** Menerima paket versi 1 (lama) dan versi 2 (terbaru). */
export function parseResultSyncPackage(text: string): ResultSyncPackage {
  let data: unknown
  try { data = JSON.parse(text) } catch { throw new Error('File bukan JSON yang valid.') }
  const pkg = data as Partial<ResultSyncPackage>
  const version = Number(pkg?.version) || 0
  if (pkg?.format !== RESULT_SYNC_FORMAT || version < 1 || version > RESULT_SYNC_VERSION) {
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
    exercises: asArray<Exercise>(pkg.exercises),
    skillEvidence: asArray<SkillEvidence>(pkg.skillEvidence),
    remedialPlans: asArray<RemedialPlan>(pkg.remedialPlans),
    learningObjectives: asArray<LearningObjective>(pkg.learningObjectives),
    questionMedia: asArray<SerializedQuestionMedia>(pkg.questionMedia),
    importHistory: asArray<ImportHistory>(pkg.importHistory)
  }
}

export async function importResultSyncPackage(pkg: ResultSyncPackage): Promise<ImportSummary> {
  const summary: ImportSummary = {
    students: 0, attempts: 0, skippedAttempts: 0, analytics: 0, recommendations: 0,
    questions: 0, exercises: 0, skillEvidence: 0, remedialPlans: 0,
    objectives: 0, media: 0, importHistory: 0
  }

  // Paket versi 1 tidak membawa bukti kompetensi. Bangun ulang dari jawaban
  // yang tersedia agar heatmap tetap bisa menampilkan data lama.
  const evidenceRows = (pkg.skillEvidence || []).length
    ? pkg.skillEvidence || []
    : pkg.attempts.flatMap(a => {
      const questionIds = new Set(a.answers.map(ans => ans.questionId))
      const questionRows = pkg.questions.filter(q => questionIds.has(q.id))
      return buildSkillEvidence(a, questionRows)
    })

  await db.transaction('rw', db.tables.map(t => t.name), async () => {
    const localStudent = await db.students.get(pkg.student.id)
    if (!localStudent) { await db.students.put(pkg.student); summary.students++ }

    for (const objective of pkg.learningObjectives || []) {
      if (await db.learningObjectives.get(objective.id)) continue
      await db.learningObjectives.put(objective); summary.objectives++
    }
    for (const question of pkg.questions) {
      if (await db.questions.get(question.id)) continue
      await db.questions.put(question); summary.questions++
    }
    for (const exercise of pkg.exercises) {
      if (await db.exercises.get(exercise.id)) continue
      await db.exercises.put(exercise); summary.exercises++
    }
    for (const row of pkg.questionMedia || []) {
      if (!row?.id || await db.questionMedia.get(row.id)) continue
      await db.questionMedia.put(deserializeMedia(row)); summary.media++
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
    for (const row of evidenceRows) {
      if (await db.skillEvidence.get(row.id)) continue
      await db.skillEvidence.put(row); summary.skillEvidence++
    }
    for (const plan of pkg.remedialPlans || []) {
      if (await db.remedialPlans.get(plan.id)) continue
      await db.remedialPlans.put(plan); summary.remedialPlans++
    }
    for (const row of pkg.importHistory || []) {
      if (await db.importHistory.get(row.id)) continue
      await db.importHistory.put(row); summary.importHistory++
    }
  })

  return summary
}
