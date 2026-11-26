import { db, uid } from '../db/db'
import type { ClassRoom, Exercise, LearningObjective, Student, Subject, Teacher, Topic, User } from '../types'
import { TOPIC_SEEDS, buildQuestion, SEED_TEACHER, type SeedInput } from './seedTypes'
import { MAT } from './questions/mat'
import { BIN } from './questions/bin'
import { BING } from './questions/bing'
import { PAN } from './questions/pan'
import { IPA } from './questions/ipa'
import { IPS } from './questions/ips'
import { INF } from './questions/inf'
import { PJO } from './questions/pjo'
import { SEN } from './questions/sen'
import { PRA } from './questions/pra'

export const SUBJECT_SEEDS: Subject[] = [
  { id: 'MAT', name: 'Matematika', shortName: 'MTK', description: 'Pola bilangan, fungsi, dan persamaan', categories: [], color: '#0d9488', order: 1 },
  { id: 'BIN', name: 'Bahasa Indonesia', shortName: 'BIN', description: 'Teks informasi, prosedur, dan kalimat efektif', categories: [], color: '#2563eb', order: 2 },
  { id: 'BING', name: 'Bahasa Inggris', shortName: 'BING', description: 'Analytical exposition, recount, dan modals', categories: [], color: '#7c3aed', order: 3 },
  { id: 'PAN', name: 'Pendidikan Pancasila', shortName: 'PAN', description: 'Nilai Pancasila, konstitusi, dan kebhinekaan', categories: [], color: '#dc2626', order: 4 },
  { id: 'IPA', name: 'IPA', shortName: 'IPA', description: 'Biologi, Fisika, dan Kimia Fase E', categories: ['Biologi', 'Fisika', 'Kimia'], color: '#059669', order: 5 },
  { id: 'IPS', name: 'IPS', shortName: 'IPS', description: 'Geografi, Ekonomi, dan Sejarah Fase E', categories: ['Geografi', 'Ekonomi', 'Sejarah'], color: '#d97706', order: 6 },
  { id: 'INF', name: 'Informatika', shortName: 'INF', description: 'Algoritma, data, dan jaringan', categories: [], color: '#0891b2', order: 7 },
  { id: 'PJO', name: 'PJOK', shortName: 'PJO', description: 'Kebugaran, permainan bola, dan keselamatan', categories: [], color: '#ea580c', order: 8 },
  { id: 'SEN', name: 'Seni', shortName: 'SEN', description: 'Musik, rupa, tari, dan teater', categories: ['Seni Musik', 'Seni Rupa', 'Seni Tari', 'Seni Teater'], color: '#db2777', order: 9 },
  { id: 'PRA', name: 'Prakarya', shortName: 'PRA', description: 'Kerajinan, rekayasa, budidaya, dan pengolahan', categories: ['Kerajinan', 'Rekayasa', 'Budidaya', 'Pengolahan'], color: '#65a30d', order: 10 }
]

export const ALL_SEED_QUESTIONS: SeedInput[] = [...MAT, ...BIN, ...BING, ...PAN, ...IPA, ...IPS, ...INF, ...PJO, ...SEN, ...PRA]

const SEED_EXERCISE_IDS: Record<string, string> = { MAT: 'ex-matematika-1', BING: 'ex-bing-1' }
const SEED_EXERCISE_TITLES: Record<string, string> = {
  MAT: 'Latihan Dasar Barisan dan Fungsi',
  BIN: 'Teks Informasi, Prosedur, dan Kalimat Efektif',
  BING: 'Analytical Exposition & Recount',
  PAN: 'Nilai Pancasila, Konstitusi, dan Bhineka Tunggal Ika',
  IPA: 'Sel, Besaran, dan Materi',
  IPS: 'Litosfer, Sumber Daya, dan Peradaban Awal',
  INF: 'Algoritma, Data, dan Jaringan Komputer',
  PJO: 'Kebugaran, Permainan Bola, dan Keselamatan',
  SEN: 'Seni Musik, Rupa, Tari, dan Teater',
  PRA: 'Kerajinan, Rekayasa, Budidaya, dan Pengolahan'
}

function seedExerciseId(subjectId: string) {
  return SEED_EXERCISE_IDS[subjectId] || `ex-${subjectId.toLowerCase()}-1`
}

function seedExerciseTitle(subject: Subject) {
  return SEED_EXERCISE_TITLES[subject.id] || `Latihan HOTS ${subject.name}`
}

function makeDefaultExercise(id: string, title: string, subjectId: string, ids: string[], teacherId: string, now: number): Exercise {
  return {
    id, title, subjectId, teacherId, active: true, createdAt: now,
    questionIds: ids,
    settings: {
      questionCount: ids.length, durationMinutes: Math.max(10, ids.length * 2),
      difficulties: ['mudah', 'sedang', 'sulit'], types: ['single', 'multiple'],
      shuffleQuestions: true, shuffleOptions: false, allowRetry: 2,
      showExplanation: 'selesai', partialScoring: true, wrongPenalty: 0, topicIds: []
    }
  }
}

async function ensureSeedExercises() {
  const subjects = await db.subjects.toArray()
  if (!subjects.length) return
  const existingIds = new Set((await db.exercises.toArray()).map(e => e.id))
  const questions = await db.questions.toArray()
  const teachers = await db.teachers.toArray()
  const now = Date.now()
  const additions: Exercise[] = []

  for (const seed of SUBJECT_SEEDS) {
    const subject = subjects.find(s => s.id === seed.id)
    if (!subject || existingIds.has(seedExerciseId(seed.id))) continue
    const ids = questions.filter(q => q.subjectId === seed.id && q.active && q.status === 'siap').map(q => q.id)
    const teacherId = teachers.find(t => t.subjects.includes(seed.id))?.userId || SEED_TEACHER
    additions.push(makeDefaultExercise(seedExerciseId(seed.id), seedExerciseTitle(subject), seed.id, ids, teacherId, now))
  }

  if (additions.length) await db.exercises.bulkPut(additions)
}

async function ensureStudentSubjectAssignments() {
  const subjects = await db.subjects.toArray()
  if (!subjects.length) return
  const subjectIds = subjects.map(s => s.id)
  const students = await db.students.toArray()
  const legacy = students.filter(s => !Array.isArray(s.subjectIds))
  if (!legacy.length) return
  await Promise.all(legacy.map(s => db.students.update(s.id, { subjectIds })))
}

function advancedDefaultSettings(now: number) {
  return [
    { key: 'heatmapColors', value: { sangatBaik: '#10b981', baik: '#0ea5e9', cukup: '#f59e0b', penguatan: '#f97316', remedial: '#ef4444', insufficient: '#e2e8f0' }, updatedAt: now },
    { key: 'heatmapMinEvidence', value: 3, updatedAt: now },
    { key: 'remedialSettings', value: { masteryThreshold: 70, level1Count: 4, level2Count: 4, level3Count: 4, enrichmentCount: 3, avoidRecentDays: 14 }, updatedAt: now },
    { key: 'aiConfig', value: { enabled: false, endpoint: '', scopes: ['penjelasan', 'ringkasan', 'rekomendasi', 'draft-soal', 'kualitas-soal'] }, updatedAt: now }
  ]
}

async function ensureAdvancedSetup() {
  const now = Date.now()
  const questions = await db.questions.toArray()
  const missing = questions.filter(q => !q.indicatorKey)
  if (missing.length) {
    await db.questions.bulkPut(missing.map(q => ({
      ...q,
      indicatorKey: q.learningObjectiveId || `${q.topicId}|${q.indicator.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()}`
    })))
  }
  for (const setting of advancedDefaultSettings(now)) {
    if (!(await db.applicationSettings.get(setting.key))) await db.applicationSettings.put(setting)
  }
}

export async function seedDatabase(force = false) {
  const existing = await db.subjects.count()
  if (existing > 0 && !force) {
    await ensureSeedExercises()
    await ensureStudentSubjectAssignments()
    await ensureAdvancedSetup()
    return
  }

  const now = Date.now()
  const users: User[] = [
    { id: 'admin-1', username: 'admin', password: 'admin123', name: 'Administrator', role: 'admin', active: true, createdAt: now },
    { id: SEED_TEACHER, username: 'guru', password: 'guru123', name: 'Ibu Sari', role: 'teacher', active: true, createdAt: now },
    { id: 'teacher-2', username: 'guru2', password: 'guru123', name: 'Pak Budi', role: 'teacher', active: true, createdAt: now },
    { id: 'student-1', username: 'siswa', password: 'siswa123', name: 'Alya Putri', role: 'student', active: true, createdAt: now },
    { id: 'student-2', username: 'siswa2', password: 'siswa123', name: 'Rizky Pratama', role: 'student', active: true, createdAt: now }
  ]
  const teachers: Teacher[] = [
    { id: 'teacher-1', userId: 'teacher-1', name: 'Ibu Sari', subjects: ['MAT', 'IPA', 'INF'], createdAt: now },
    { id: 'teacher-2', userId: 'teacher-2', name: 'Pak Budi', subjects: ['BIN', 'BING', 'PAN'], createdAt: now }
  ]
  const classes: ClassRoom[] = [
    { id: 'class-10a', name: 'X-A', grade: 'X', semester: 1, teacherIds: ['teacher-1'] },
    { id: 'class-10b', name: 'X-B', grade: 'X', semester: 1, teacherIds: ['teacher-2'] }
  ]
  const allSubjectIds = SUBJECT_SEEDS.map(s => s.id)
  const students: Student[] = [
    { id: 'student-1', userId: 'student-1', name: 'Alya Putri', className: 'X-A', school: 'SMA Negeri 1', subjectIds: allSubjectIds, createdAt: now },
    { id: 'student-2', userId: 'student-2', name: 'Rizky Pratama', className: 'X-B', school: 'SMA Negeri 1', subjectIds: allSubjectIds, createdAt: now }
  ]
  const topics: Topic[] = TOPIC_SEEDS.map(({ categories: _c, ...t }) => ({ ...t }))
  const objectives: LearningObjective[] = TOPIC_SEEDS.flatMap(t => t.tp.map((description, i) => ({
    id: `lo-${t.id}-${i + 1}`, subjectId: t.subjectId, topicId: t.id,
    code: `${t.subjectId}-TP${i + 1}`, description, semester: t.semester
  })))
  const questions = ALL_SEED_QUESTIONS.map((q, i) => buildQuestion(q, i))

  const exercises: Exercise[] = SUBJECT_SEEDS.map(subject => {
    const ids = questions.filter(q => q.subjectId === subject.id).map(q => q.id)
    const teacherId = teachers.find(t => t.subjects.includes(subject.id))?.userId || SEED_TEACHER
    return makeDefaultExercise(seedExerciseId(subject.id), seedExerciseTitle(subject), subject.id, ids, teacherId, now)
  })

  await db.transaction('rw', db.tables.map(t => t.name), async () => {
      if (force) {
        await Promise.all(db.tables.map(t => t.clear()))
      }
      await db.users.bulkPut(users)
      await db.teachers.bulkPut(teachers)
      await db.students.bulkPut(students)
      await db.classes.bulkPut(classes)
      await db.subjects.bulkPut(SUBJECT_SEEDS)
      await db.topics.bulkPut(topics)
      await db.learningObjectives.bulkPut(objectives)
      await db.questions.bulkPut(questions)
      await db.exercises.bulkPut(exercises)
      await db.applicationSettings.put({ key: 'seededAt', value: now, updatedAt: now })
      await db.applicationSettings.put({
        key: 'masteryThresholds',
        value: { sangatBaik: 85, baik: 70, cukup: 55, penguatan: 40 },
        updatedAt: now
      })
      await db.applicationSettings.put({
        key: 'scoringDefaults',
        value: { partialScoring: true, wrongPenalty: 0 },
        updatedAt: now
      })
      await db.applicationSettings.put({
        key: 'syncConfig',
        value: { provider: 'none', endpoint: '' },
        updatedAt: now
      })
      for (const setting of advancedDefaultSettings(now)) await db.applicationSettings.put(setting)
    })

  return { questions: questions.length }
}

export function newQuestionId() { return uid('q-') }
