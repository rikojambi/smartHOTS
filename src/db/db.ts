import Dexie, { type Table } from 'dexie'
import type {
  ApplicationSetting, ClassRoom, Exercise, ImportHistory, LearningAnalytic,
  LearningObjective, Question, QuestionMedia, QuestionRevision,
  RemediationRecommendation, Student, StudentAttempt, Subject, SyncTask,
  Teacher, Topic, User
} from '../types'

export class SmartHotsDB extends Dexie {
  users!: Table<User, string>
  students!: Table<Student, string>
  teachers!: Table<Teacher, string>
  classes!: Table<ClassRoom, string>
  subjects!: Table<Subject, string>
  topics!: Table<Topic, string>
  learningObjectives!: Table<LearningObjective, string>
  questions!: Table<Question, string>
  questionOptions!: Table<{ id: string; questionId: string; label: string; text: string; isCorrect: boolean }, string>
  questionMedia!: Table<QuestionMedia, string>
  questionRevisions!: Table<QuestionRevision, string>
  exercises!: Table<Exercise, string>
  exerciseQuestions!: Table<{ id: string; exerciseId: string; questionId: string; order: number }, string>
  studentAttempts!: Table<StudentAttempt, string>
  studentAnswers!: Table<{ id: string; attemptId: string; questionId: string; selected: string[]; correct: boolean; points: number }, string>
  learningAnalytics!: Table<LearningAnalytic, string>
  remediationRecommendations!: Table<RemediationRecommendation, string>
  importHistory!: Table<ImportHistory, string>
  applicationSettings!: Table<ApplicationSetting, string>
  syncQueue!: Table<SyncTask, number>

  constructor() {
    super('smart-hots-db')
    this.version(1).stores({
      users: 'id,username,role,active',
      students: 'id,userId,className',
      teachers: 'id,userId',
      classes: 'id,name,grade',
      subjects: 'id,name,order',
      topics: 'id,subjectId,semester,order',
      learningObjectives: 'id,subjectId,topicId',
      questions: 'id,code,subjectId,topicId,category,type,difficulty,cognitive,status,active,teacherId,updatedAt',
      questionOptions: 'id,questionId',
      questionMedia: 'id,questionId',
      questionRevisions: 'id,questionId,version',
      exercises: 'id,subjectId,teacherId,active',
      exerciseQuestions: 'id,exerciseId,questionId',
      studentAttempts: 'id,exerciseId,studentId,status,finishedAt',
      studentAnswers: 'id,attemptId,questionId',
      learningAnalytics: 'id,attemptId,studentId,subjectId,createdAt',
      remediationRecommendations: 'id,studentId,subjectId,priority',
      importHistory: 'id,fileName,subjectId,createdAt',
      applicationSettings: 'key',
      syncQueue: '++id,table,recordId,createdAt'
    })
  }
}

export const db = new SmartHotsDB()

export const uid = (prefix = '') => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export async function putSetting(key: string, value: unknown) {
  await db.applicationSettings.put({ key, value, updatedAt: Date.now() })
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.applicationSettings.get(key)
  return row ? (row.value as T) : fallback
}

export async function queueSync(table: string, recordId: string, operation: 'put' | 'delete' = 'put') {
  try { await db.syncQueue.add({ table, recordId, operation, createdAt: Date.now() }) } catch { /* ignore duplicates */ }
}

export async function exportBackup(): Promise<string> {
  const tables = [
    'users', 'students', 'teachers', 'classes', 'subjects', 'topics', 'learningObjectives',
    'questions', 'questionOptions', 'questionMedia', 'questionRevisions', 'exercises',
    'exerciseQuestions', 'studentAttempts', 'studentAnswers', 'learningAnalytics',
    'remediationRecommendations', 'importHistory', 'applicationSettings'
  ] as const
  const payload: Record<string, unknown> = { version: 1, exportedAt: Date.now() }
  for (const name of tables) {
    const rows = await db.table(name).toArray()
    payload[name] = await Promise.all(rows.map(async row => {
      if (name === 'questionMedia' && row.blob instanceof Blob) {
        return { ...row, blob: { __blob: true, data: Array.from(new Uint8Array(await row.blob.arrayBuffer())) } }
      }
      return row
    }))
  }
  return JSON.stringify(payload)
}

export async function importBackup(json: string) {
  const parsed = JSON.parse(json) as Record<string, unknown[]>
  if (!parsed.version || !Array.isArray(parsed.questions)) throw new Error('Format backup tidak dikenali')
  const tables = Object.keys(parsed).filter(k => !['version', 'exportedAt'].includes(k))
  await db.transaction('rw', db.tables, async () => {
    for (const name of tables) {
      const table = db.table(name)
      await table.clear()
      const rows = parsed[name] as Record<string, unknown>[]
      for (const row of rows) {
        const b = row.blob as { __blob?: boolean; data?: number[] } | undefined
        if (b?.__blob && Array.isArray(b.data)) row.blob = new Blob([new Uint8Array(b.data)])
        await table.put(row)
      }
    }
  })
}
