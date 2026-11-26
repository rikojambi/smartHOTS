export type Role = 'admin' | 'teacher' | 'student'
export type QuestionType = 'single' | 'multiple'
export type CognitiveLevel = 'C4' | 'C5' | 'C6'
export type Difficulty = 'mudah' | 'sedang' | 'sulit'
export type QuestionStatus = 'draft' | 'perlu_diperiksa' | 'siap' | 'diarsipkan'
export type MasteryCategory = 'Sangat baik' | 'Baik' | 'Cukup' | 'Perlu penguatan' | 'Perlu remedial'
export type AttemptKind = 'reguler' | 'remedial' | 'pengayaan'
export type RemedialLevel = 1 | 2 | 3
export type RemedialStatus = 'disarankan' | 'disetujui' | 'ditugaskan' | 'berjalan' | 'tuntas' | 'dihentikan' | 'pengayaan'

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
  subjectIds: string[]
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
  indicatorKey?: string
  learningObjectiveId?: string
  generatedBy?: 'teacher' | 'import' | 'ai'
  approvedBy?: string
  approvedAt?: number
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
  kind?: AttemptKind
  remedialPlanId?: string
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
  successCount?: number
  failedCount?: number
  imageCount?: number
  warnings?: string[]
  questionIds?: string[]
  reimportOf?: string
  analysis?: {
    paragraphs: number
    tables: number
    images: number
    equations: number
  }
}

export interface SkillEvidence {
  id: string
  attemptId: string
  studentId: string
  questionId: string
  subjectId: string
  topicId: string
  indicatorKey: string
  indicator: string
  subTopic: string
  cognitive: CognitiveLevel
  difficulty: Difficulty
  correct: boolean
  points: number
  maxPoints: number
  selected: string[]
  correctIds: string[]
  misconception: string
  errorType: string
  createdAt: number
}

export interface RemedialEvaluation {
  at: number
  attemptId: string
  score: number
  mastered: string[]
  remaining: string[]
  note: string
}

export interface RemedialPlan {
  id: string
  studentId: string
  subjectId: string
  topicId: string
  indicatorKey: string
  indicator: string
  level: RemedialLevel
  status: RemedialStatus
  title: string
  reason: string
  materials: string[]
  questionIds: string[]
  sourceAttemptIds: string[]
  scoreBefore: number
  scoreAfter?: number
  createdAt: number
  updatedAt: number
  dueAt?: number
  assignedBy: string
  approvedBy?: string
  approvedAt?: number
  history: RemedialEvaluation[]
  teacherNote?: string
}

export interface HeatmapColors {
  sangatBaik: string
  baik: string
  cukup: string
  penguatan: string
  remedial: string
  insufficient: string
}

export interface HeatmapSettings {
  colors: HeatmapColors
  minEvidence: number
}

export interface RemedialSettings {
  masteryThreshold: number
  level1Count: number
  level2Count: number
  level3Count: number
  enrichmentCount: number
  avoidRecentDays: number
}

export interface AiConfig {
  enabled: boolean
  endpoint: string
  scopes: string[]
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
  indicator?: string
  competency?: string
  misconception?: string
  recommendation?: string
  semantic?: 'konsep' | 'penerapan' | 'analisis'
  tableHtml?: string
  equationCount?: number
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
