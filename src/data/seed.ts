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

export async function seedDatabase(force = false) {
  const existing = await db.subjects.count()
  if (existing > 0 && !force) return

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
  const students: Student[] = [
    { id: 'student-1', userId: 'student-1', name: 'Alya Putri', className: 'X-A', school: 'SMA Negeri 1', createdAt: now },
    { id: 'student-2', userId: 'student-2', name: 'Rizky Pratama', className: 'X-B', school: 'SMA Negeri 1', createdAt: now }
  ]
  const topics: Topic[] = TOPIC_SEEDS.map(({ categories: _c, ...t }) => ({ ...t }))
  const objectives: LearningObjective[] = TOPIC_SEEDS.flatMap(t => t.tp.map((description, i) => ({
    id: `lo-${t.id}-${i + 1}`, subjectId: t.subjectId, topicId: t.id,
    code: `${t.subjectId}-TP${i + 1}`, description, semester: t.semester
  })))
  const questions = ALL_SEED_QUESTIONS.map((q, i) => buildQuestion(q, i))

  const defaultExercise = (id: string, title: string, subjectId: string, ids: string[], teacherId: string): Exercise => ({
    id, title, subjectId, teacherId, active: true, createdAt: now,
    questionIds: ids,
    settings: {
      questionCount: ids.length, durationMinutes: Math.max(10, ids.length * 2),
      difficulties: ['mudah', 'sedang', 'sulit'], types: ['single', 'multiple'],
      shuffleQuestions: true, shuffleOptions: false, allowRetry: 2,
      showExplanation: 'selesai', partialScoring: true, wrongPenalty: 0, topicIds: []
    }
  })
  const exercises: Exercise[] = [
    defaultExercise('ex-matematika-1', 'Latihan Dasar Barisan dan Fungsi', 'MAT', questions.filter(q => q.subjectId === 'MAT').map(q => q.id), SEED_TEACHER),
    defaultExercise('ex-bing-1', 'Analytical Exposition & Recount', 'BING', questions.filter(q => q.subjectId === 'BING').map(q => q.id), 'teacher-2')
  ]

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
    })

  return { questions: questions.length }
}

export function newQuestionId() { return uid('q-') }
