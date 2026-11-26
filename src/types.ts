export type Role = 'admin' | 'teacher' | 'student'
export type QuestionType = 'single' | 'multiple'
export type CognitiveLevel = 'C4' | 'C5' | 'C6'
export type Difficulty = 'mudah' | 'sedang' | 'sulit'
export type QuestionStatus = 'draft' | 'perlu_diperiksa' | 'siap' | 'diarsipkan'
export type MasteryCategory = 'Sangat baik' | 'Baik' | 'Cukup' | 'Perlu penguatan' | 'Perlu remedial'

export interface User {
  id: string
  username: string
  password: string
  name: string
  role: Role
  active: boolean
  createdAt: number
}

export interface Student {
  id: string
  userId: string
  name: string
  className: string
  school: string
  createdAt: number
}

export interface Teacher {
  id: string
  userId: string
  name: string
  subjects: string[]
  createdAt: number
}

export interface ClassRoom {
  id: string
  name: string
  grade: string
  semester: number
  teacherIds: string[]
}

export interface Subject {
  id: string
  name: string
  shortName: string
  description: string
  categories: string[]
  color: string
  order: number
}

export interface Topic {
  id: string
  subjectId: string
  name: string
  subTopics: string[]
  category?: string
  semester: number
  order: number
  cp: string
  tp: string[]
}

export interface LearningObjective {
  id: string
  subjectId: string
  topicId: string
  code: string
  description: string
  semester: number
}

export interface QuestionOption {
  id: string
  label: string
  text: string
  mediaId?: string
  isCorrect: boolean
  reason: string
}

export interface Question {
  id: string
  code: string
  subjectId: string
  topicId: string
  subTopic: string
  category?: string
  semester: number
  cp: string
  tp: string
  indicator: string
  cognitive: CognitiveLevel
  difficulty: Difficulty
  type: QuestionType
  status: QuestionStatus
  active: boolean
  stimulus: string
  stimulusMediaId?: string
  prompt: string
  options: QuestionOption[]
  explanation: string
  competency: string
  misconception: string
  recommendation: string
  teacherId: string
  version: number
  createdAt: number
  updatedAt: number
}

export interface QuestionMedia {
  id: string
  name: string
  mime: string
  blob: Blob
  questionId?: string
  location?: 'stimulus' | 'option'
  createdAt: number
}

export interface QuestionRevision {
  id: string
  questionId: string
  version: number
  snapshot: Question
  changedBy: string
  changedAt: number
  note: string
}

export interface ExerciseSetting {
  questionCount: number
  durationMinutes: number
  difficulties: Difficulty[]
  types: QuestionType[]
  shuffleQuestions: boolean
  shuffleOptions: boolean
  allowRetry: number
  showExplanation: 'langsung' | 'selesai'
  partialScoring: boolean
  wrongPenalty: number
  topicIds: string[]
}

export interface Exercise {
  id: string
  title: string
  subjectId: string
  teacherId: string
  classId?: string
  settings: ExerciseSetting
  questionIds: string[]
  active: boolean
  createdAt: number
}

export interface StudentAnswer {
  questionId: string
  selected: string[]
  correctIds: string[]
  points: number
  maxPoints: number
  correct: boolean
  flagged: boolean
  answeredAt?: number
}

export interface StudentAttempt {
  id: string
  exerciseId: string
  studentId: string
  startedAt: number
  finishedAt?: number
  status: 'berjalan' | 'selesai'
  questionIds: string[]
  answers: StudentAnswer[]
  score: number
  snapshotVersion: Record<string, number>
}

export interface DiagnosticFinding {
  key: string
  label: string
  type: 'materi' | 'tp' | 'indikator' | 'kesalahan'
  correct: number
  total: number
  percentage: number
  category: MasteryCategory
}

export interface LearningAnalytic {
  id: string
  attemptId: string
  studentId: string
  subjectId: string
  createdAt: number
  score: number
  findings: DiagnosticFinding[]
  misconceptions: string[]
  errorPatterns: string[]
  evidence: { questionCode: string; indicator: string; selected: string[]; correct: string[] }[]
  recommendations: string[]
  priorityOrder: string[]
}

export interface RemediationRecommendation {
  id: string
  studentId: string
  subjectId: string
  topicId: string
  title: string
  reason: string
  materials: string
  questionIds: string[]
  priority: number
  completed: boolean
  createdAt: number
}

export interface ImportHistory {
  id: string
  fileName: string
  teacherId: string
  subjectId: string
  topicId: string
  detected: number
  imported: number
  errors: string[]
  createdAt: number
}

export interface ApplicationSetting {
  key: string
  value: unknown
  updatedAt: number
}

export interface ParsedQuestion {
  tempId: string
  number: number
  type: QuestionType
  stimulus: string
  prompt: string
  options: { label: string; text: string; mediaId?: string }[]
  answer: string[]
  explanation: string
  tp: string
  cognitive: CognitiveLevel
  difficulty: Difficulty
  images: { id: string; name: string; blob: Blob; location: 'stimulus' | 'option'; optionLabel?: string }[]
  warnings: string[]
}

export interface SyncTask {
  id?: number
  table: string
  recordId: string
  operation: 'put' | 'delete'
  createdAt: number
}
