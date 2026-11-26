import type {
  CognitiveLevel, Difficulty, Exercise, Question, QuestionType, RemedialEvaluation,
  RemedialLevel, RemedialPlan, RemedialStatus, SkillEvidence, StudentAnswer, StudentAttempt
} from '../types'
import { db, queueSync, uid } from '../db/db'
import { indicatorKeyOf, loadRemedialSettings } from './competency'

type Settings = Awaited<ReturnType<typeof loadRemedialSettings>>
type Group = { indicatorKey: string; indicator: string; subjectId: string; topicId: string; rows: SkillEvidence[] }
type Analysis = {
  correct: number
  total: number
  pct: number
  topError: string
  errorCount: number
  misconceptions: string[]
  level: RemedialLevel
  subTopics: string[]
}

const ACTIVE_STATUSES: RemedialStatus[] = ['disarankan', 'disetujui', 'ditugaskan', 'berjalan', 'pengayaan']
const DAY_MS = 86_400_000

export function levelLabel(level: RemedialLevel): string {
  switch (level) {
    case 1: return 'Level 1 — Penguatan konsep'
    case 2: return 'Level 2 — Prosedur & penerapan'
    default: return 'Level 3 — Analisis & evaluasi'
  }
}

export function statusLabel(status: RemedialStatus): string {
  switch (status) {
    case 'disarankan': return 'Disarankan'
    case 'disetujui': return 'Disetujui'
    case 'ditugaskan': return 'Ditugaskan'
    case 'berjalan': return 'Berjalan'
    case 'tuntas': return 'Tuntas'
    case 'dihentikan': return 'Dihentikan'
    case 'pengayaan': return 'Pengayaan'
  }
}

function countFor(level: RemedialLevel, settings: Settings): number {
  if (level === 1) return Math.max(1, settings.level1Count)
  if (level === 2) return Math.max(1, settings.level2Count)
  return Math.max(1, settings.level3Count)
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function currentTeacherId(): Promise<string> {
  try {
    const userId = localStorage.getItem('smart-hots-session')
    if (userId) {
      const user = await db.users.get(userId)
      if (user && (user.role === 'teacher' || user.role === 'admin')) {
        const teacher = await db.teachers.where('userId').equals(user.id).first()
        if (teacher) return teacher.id
      }
    }
  } catch { /* sesi tidak tersedia */ }
  return 'sistem'
}

function groupEvidence(rows: SkillEvidence[]): Group[] {
  const map = new Map<string, Group>()
  for (const row of [...rows].sort((a, b) => a.createdAt - b.createdAt)) {
    let group = map.get(row.indicatorKey)
    if (!group) {
      group = { indicatorKey: row.indicatorKey, indicator: row.indicator, subjectId: row.subjectId, topicId: row.topicId, rows: [] }
      map.set(row.indicatorKey, group)
    }
    if (row.indicator) group.indicator = row.indicator
    if (row.subjectId) group.subjectId = row.subjectId
    if (row.topicId) group.topicId = row.topicId
    group.rows.push(row)
  }
  return [...map.values()]
}

function analyzeGroup(group: Group, threshold: number): Analysis {
  const rows = group.rows
  const correct = rows.filter(row => row.correct).length
  const total = rows.length
  const pct = total ? Math.round(correct / total * 100) : 0
  const wrong = rows.filter(row => !row.correct)

  const errors = new Map<string, number>()
  for (const row of wrong) {
    const key = row.errorType || 'Kesalahan konsep'
    errors.set(key, (errors.get(key) || 0) + 1)
  }
  const rankedErrors = [...errors.entries()].sort((a, b) => b[1] - a[1])
  const [topError, errorCount] = rankedErrors[0] || ['Kesalahan konsep', 0]

  const misconceptions = new Map<string, number>()
  for (const row of wrong) {
    if (row.misconception) misconceptions.set(row.misconception, (misconceptions.get(row.misconception) || 0) + 1)
  }
  const repeatedMisconceptions = [...misconceptions.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([text]) => text)

  const concept = wrong.filter(row => /konsep|tidak ada jawaban|interpretasi/i.test(row.errorType)).length
  const procedural = wrong.filter(row => /prosedur|perhitungan|membaca data|langkah/i.test(row.errorType)).length
  const reasoning = wrong.filter(row => /penalaran|analisis|evaluasi|strategi/i.test(row.errorType)).length
  const higherOrder = wrong.filter(row => row.cognitive === 'C5' || row.cognitive === 'C6').length
  const nearThreshold = pct >= threshold - 15 && pct < threshold

  let level: RemedialLevel
  if (nearThreshold && wrong.length && higherOrder / wrong.length >= 0.4) level = 3
  else if (pct < threshold - 25 || concept > procedural + reasoning) level = 1
  else if (procedural + reasoning > concept) level = 2
  else level = 1

  return {
    correct, total, pct, topError, errorCount,
    misconceptions: repeatedMisconceptions, level,
    subTopics: [...new Set(rows.map(row => row.subTopic).filter(Boolean))]
  }
}

function reasonFor(analysis: Analysis, group: Group, threshold: number, attempts: number): string {
  const parts = [
    `Benar ${analysis.correct}/${analysis.total} (${analysis.pct}%) pada indikator "${group.indicator || group.indicatorKey}", di bawah batas penguasaan ${threshold}%.`,
    `Pola kesalahan dominan: ${analysis.topError} (${analysis.errorCount} respons).`
  ]
  if (analysis.misconceptions.length) parts.push(`Miskonsepsi dengan minimal 2 bukti: ${analysis.misconceptions.join('; ')}.`)
  if (attempts >= 2) parts.push(`Bukti berasal dari ${attempts} percobaan berbeda.`)
  return parts.join(' ')
}

function materialsFor(level: RemedialLevel, indicator: string, subTopics: string[], misconceptions: string[]): string[] {
  const focus = subTopics.length ? subTopics.join(', ') : indicator
  const first = subTopics[0] || indicator || 'materi ini'
  const materials = [
    `Baca kembali konsep "${indicator || focus}" pada subtopik ${focus}; tuliskan definisi, ciri utama, dan contoh penerapannya dengan kata-kata sendiri.`,
    `Kerjakan 2 contoh soal tentang ${first}, lalu jelaskan mengapa setiap pilihan benar atau salah berdasarkan konsep tersebut.`
  ]
  if (misconceptions.length) materials.push(`Perbaiki miskonsepsi yang terdeteksi: ${misconceptions.slice(0, 3).join('; ')}.`)
  if (level === 2) {
    materials.push(`Baca kasus pada stimulus soal bertema ${first}, lalu identifikasi data yang diketahui, data yang ditanya, dan hubungan antaranya.`)
    materials.push('Ikuti langkah: (1) nyatakan besaran/varibel, (2) pilih prosedur atau rumus yang sesuai, (3) lakukan perhitungan bertahap, (4) cek satuan dan logika hasil.')
    materials.push(`Latih penerapan prosedur pada ${focus} menggunakan soal berlevel sedang dan bandingkan langkahmu dengan pembahasan.`)
  }
  if (level === 3) {
    materials.push(`Pelajari kasus kompleks pada ${first} yang memuat beberapa kondisi dan data saling terkait; petakan hubungan sebab-akibatnya.`)
    materials.push(`Tugas C4: hubungkan informasi dari ${focus} dan jelaskan hubungan antar konsep secara runtut.`)
    materials.push('Tugas C5: evaluasi dua strategi penyelesaian alternatif, nyatakan kriteria penilaian, dan berikan alasan pemilihan strategi terbaik.')
    materials.push('Tugas C6: rancang solusi baru untuk kasus serupa, uji konsistensinya dengan data, dan jelaskan keterbatasannya.')
  }
  return materials
}

function makePlan(args: {
  studentId: string
  group: Group
  level: RemedialLevel
  status: RemedialStatus
  reason: string
  questions: Question[]
  sourceAttemptIds: string[]
  scoreBefore: number
  assignedBy: string
  analysis: Analysis
}): RemedialPlan {
  const now = Date.now()
  const label = args.status === 'pengayaan' ? 'Pengayaan' : levelLabel(args.level)
  return {
    id: uid('rp-'),
    studentId: args.studentId,
    subjectId: args.group.subjectId,
    topicId: args.group.topicId,
    indicatorKey: args.group.indicatorKey,
    indicator: args.group.indicator || args.group.indicatorKey,
    level: args.level,
    status: args.status,
    title: `${label} — ${(args.group.indicator || args.group.indicatorKey).slice(0, 70)}`,
    reason: args.reason,
    materials: materialsFor(args.level, args.group.indicator, args.analysis.subTopics, args.analysis.misconceptions),
    questionIds: args.questions.map(question => question.id),
    sourceAttemptIds: [...new Set(args.sourceAttemptIds)],
    scoreBefore: args.scoreBefore,
    createdAt: now,
    updatedAt: now,
    assignedBy: args.assignedBy || 'sistem',
    history: []
  }
}

function candidateQuestions(all: Question[], group: Group, mode: RemedialLevel | 'enrichment', excluded: Set<string>): Question[] {
  const difficulties: Difficulty[] = mode === 'enrichment' ? ['sulit']
    : mode === 1 ? ['mudah', 'sedang']
      : mode === 2 ? ['sedang'] : ['sedang', 'sulit']
  const cognitive: CognitiveLevel[] = mode === 'enrichment' ? ['C5', 'C6']
    : mode === 1 ? ['C4']
      : mode === 2 ? ['C4', 'C5'] : ['C5', 'C6']
  return all
    .filter(question => !excluded.has(question.id)
      && question.active !== false
      && question.status !== 'diarsipkan'
      && question.subjectId === group.subjectId
      && indicatorKeyOf(question) === group.indicatorKey
      && difficulties.includes(question.difficulty)
      && cognitive.includes(question.cognitive))
    .sort((a, b) => Number(b.topicId === group.topicId) - Number(a.topicId === group.topicId)
      || b.version - a.version
      || a.code.localeCompare(b.code))
}

/** Ambil soal secara bergiliran per subtopik agar konteks/sudut pandang bervariasi. */
function pickQuestions(candidates: Question[], count: number): Question[] {
  if (!candidates.length || count <= 0) return []
  const buckets = new Map<string, Question[]>()
  for (const question of candidates) {
    const key = question.subTopic || question.topicId || 'umum'
    const bucket = buckets.get(key) || []
    bucket.push(question)
    buckets.set(key, bucket)
  }
  const keys = [...buckets.keys()].sort((a, b) => (buckets.get(b)?.length || 0) - (buckets.get(a)?.length || 0))
  const picked: Question[] = []
  let progressed = true
  while (picked.length < count && progressed) {
    progressed = false
    for (const key of keys) {
      const next = buckets.get(key)?.shift()
      if (!next) continue
      picked.push(next)
      progressed = true
      if (picked.length >= count) break
    }
  }
  return picked
}

async function recentUsedQuestionIds(studentId: string, days: number): Promise<Set<string>> {
  const cutoff = Date.now() - Math.max(0, days) * DAY_MS
  const attempts = await db.studentAttempts.where('studentId').equals(studentId)
    .filter(attempt => (attempt.kind === 'remedial' || attempt.kind === 'pengayaan') && attempt.startedAt >= cutoff)
    .toArray()
  return new Set(attempts.flatMap(attempt => attempt.questionIds))
}

export async function generateRemedialPlans(
  studentId: string,
  options?: { subjectId?: string; indicatorKey?: string; create?: boolean }
): Promise<{
  plans: RemedialPlan[]
  warnings: string[]
  insufficient: Array<{ indicatorKey: string; indicator: string; need: number; available: number }>
}> {
  const settings = await loadRemedialSettings()
  const [evidence, questions, existingPlans, recentUsed, teacherId] = await Promise.all([
    db.skillEvidence.where('studentId').equals(studentId).toArray(),
    db.questions.toArray(),
    db.remedialPlans.where('studentId').equals(studentId).toArray(),
    recentUsedQuestionIds(studentId, settings.avoidRecentDays),
    currentTeacherId()
  ])

  const scoped = evidence.filter(row =>
    (!options?.subjectId || row.subjectId === options.subjectId)
    && (!options?.indicatorKey || row.indicatorKey === options.indicatorKey))
  const groups = groupEvidence(scoped)
  const plans: RemedialPlan[] = []
  const warnings: string[] = []
  const insufficient: Array<{ indicatorKey: string; indicator: string; need: number; available: number }> = []
  const used = new Set<string>([
    ...recentUsed,
    ...existingPlans.filter(plan => plan.status !== 'dihentikan').flatMap(plan => plan.questionIds)
  ])

  if (!groups.length) warnings.push('Belum ada bukti respons yang dapat dianalisis pada cakupan yang dipilih.')
  for (const group of groups) {
    const analysis = analyzeGroup(group, settings.masteryThreshold)
    if (analysis.pct >= settings.masteryThreshold) continue

    const label = group.indicator || group.indicatorKey
    const distinctQuestions = new Set(group.rows.map(row => row.questionId)).size
    const distinctAttempts = new Set(group.rows.map(row => row.attemptId)).size
    if (group.rows.length < 3 || distinctQuestions < 2) {
      warnings.push(`Indikator "${label}" hanya memiliki ${group.rows.length} bukti dan ${distinctQuestions} soal berbeda (minimal 3 bukti dan 2 soal), sehingga rencana tidak dibuat.`)
      continue
    }
    if (distinctAttempts < 2) warnings.push(`Indikator "${label}" hanya memiliki bukti dari ${distinctAttempts} percobaan; sebaiknya kumpulkan bukti tambahan sebelum menugaskan.`)

    const need = countFor(analysis.level, settings)
    const candidates = candidateQuestions(questions, group, analysis.level, used)
    if (candidates.length < need) {
      insufficient.push({ indicatorKey: group.indicatorKey, indicator: label, need, available: candidates.length })
      warnings.push(`Indikator "${label}" memerlukan ${need} soal ${levelLabel(analysis.level)}, tetapi hanya ${candidates.length} soal sesuai yang tersedia; rencana dilewati.`)
      continue
    }

    const duplicate = existingPlans.some(plan => ACTIVE_STATUSES.includes(plan.status)
      && plan.indicatorKey === group.indicatorKey && plan.level === analysis.level)
    if (duplicate) continue

    const picked = pickQuestions(candidates, need)
    const plan = makePlan({
      studentId, group, level: analysis.level, status: 'disarankan',
      reason: reasonFor(analysis, group, settings.masteryThreshold, distinctAttempts),
      questions: picked,
      sourceAttemptIds: group.rows.map(row => row.attemptId),
      scoreBefore: analysis.pct,
      assignedBy: teacherId,
      analysis
    })
    if (options?.create !== false) {
      await db.remedialPlans.put(plan)
      await queueSync('remedialPlans', plan.id)
    }
    plans.push(plan)
    picked.forEach(question => used.add(question.id))
  }

  return { plans, warnings, insufficient }
}

export async function assignPlan(planId: string, teacherId: string, dueAt?: number): Promise<void> {
  const patch: Partial<RemedialPlan> = {
    status: 'ditugaskan',
    assignedBy: teacherId || 'sistem',
    approvedBy: teacherId || 'sistem',
    approvedAt: Date.now(),
    updatedAt: Date.now()
  }
  if (dueAt) patch.dueAt = dueAt
  await db.remedialPlans.update(planId, patch)
  await queueSync('remedialPlans', planId)
}

export async function updatePlan(planId: string, patch: Partial<RemedialPlan>): Promise<void> {
  const safe: Partial<RemedialPlan> = { updatedAt: Date.now() }
  if (patch.level) safe.level = patch.level
  if (patch.status) safe.status = patch.status
  if ('dueAt' in patch) safe.dueAt = patch.dueAt || undefined
  if ('teacherNote' in patch) safe.teacherNote = patch.teacherNote || undefined
  if (patch.questionIds) safe.questionIds = [...new Set(patch.questionIds)]
  if (patch.materials) safe.materials = patch.materials.map(text => text.trim()).filter(Boolean)
  await db.remedialPlans.update(planId, safe)
  await queueSync('remedialPlans', planId)
}

export async function stopPlan(planId: string): Promise<void> {
  await db.remedialPlans.update(planId, { status: 'dihentikan', updatedAt: Date.now() })
  await queueSync('remedialPlans', planId)
}

export async function createEnrichmentPlan(planId: string): Promise<RemedialPlan> {
  const source = await db.remedialPlans.get(planId)
  if (!source) throw new Error('Rencana remedial tidak ditemukan.')
  const settings = await loadRemedialSettings()
  const [allQuestions, allPlans, recentUsed, teacherId] = await Promise.all([
    db.questions.toArray(),
    db.remedialPlans.where('studentId').equals(source.studentId).toArray(),
    recentUsedQuestionIds(source.studentId, settings.avoidRecentDays),
    currentTeacherId()
  ])
  const excluded = new Set<string>([
    ...allPlans.filter(plan => plan.indicatorKey === source.indicatorKey).flatMap(plan => plan.questionIds),
    ...recentUsed
  ])
  const group: Group = {
    indicatorKey: source.indicatorKey, indicator: source.indicator,
    subjectId: source.subjectId, topicId: source.topicId, rows: []
  }
  const picked = pickQuestions(candidateQuestions(allQuestions, group, 'enrichment', excluded), Math.max(1, settings.enrichmentCount))
  if (!picked.length) throw new Error('Belum ada soal pengayaan (sulit, C5/C6) yang tersedia untuk indikator ini.')

  const analysis: Analysis = {
    correct: 0, total: 0,
    pct: source.scoreAfter ?? source.scoreBefore,
    topError: '', errorCount: 0, misconceptions: [],
    level: source.level, subTopics: [...new Set(picked.map(question => question.subTopic))]
  }
  const plan = makePlan({
    studentId: source.studentId, group, level: source.level, status: 'pengayaan',
    reason: `Indikator "${source.indicator || source.indicatorKey}" telah mencapai penguasaan ${analysis.pct}% (batas ${settings.masteryThreshold}%). Berikan soal pengayaan C5/C6 yang lebih kompleks untuk memperdalam dan memperluas penerapan.`,
    questions: picked, sourceAttemptIds: source.sourceAttemptIds,
    scoreBefore: analysis.pct, assignedBy: teacherId, analysis
  })
  await db.remedialPlans.put(plan)
  await queueSync('remedialPlans', plan.id)
  return plan
}

export async function startRemedialAttempt(planId: string, studentId: string): Promise<{ attemptId: string; exerciseId: string }> {
  const plan = await db.remedialPlans.get(planId)
  if (!plan) throw new Error('Rencana remedial tidak ditemukan.')

  const running = await db.studentAttempts.where('studentId').equals(studentId)
    .filter(attempt => attempt.remedialPlanId === planId && attempt.status === 'berjalan')
    .first()
  if (running) return { attemptId: running.id, exerciseId: running.exerciseId }

  const fetched = await db.questions.bulkGet(plan.questionIds)
  const questions = fetched.filter((question): question is Question => !!question && question.active !== false)
  if (!questions.length) throw new Error('Soal remedial belum tersedia. Tambahkan soal yang sesuai terlebih dahulu.')

  const exerciseId = `rem-ex-${plan.id}`
  const existing = await db.exercises.get(exerciseId)
  const difficulties = [...new Set(questions.map(question => question.difficulty))] as Difficulty[]
  const types = [...new Set(questions.map(question => question.type))] as QuestionType[]
  const exercise: Exercise = {
    id: exerciseId,
    title: `${plan.status === 'pengayaan' ? 'Pengayaan' : 'Remedial'} ${(plan.indicator || plan.indicatorKey).slice(0, 55)}`,
    subjectId: plan.subjectId,
    teacherId: plan.assignedBy || 'sistem',
    settings: {
      questionCount: questions.length,
      durationMinutes: Math.max(5, questions.length * 3),
      difficulties: difficulties.length ? difficulties : ['mudah', 'sedang'],
      types: types.length ? types : ['single'],
      shuffleQuestions: true,
      shuffleOptions: true,
      allowRetry: 1,
      showExplanation: 'selesai',
      partialScoring: true,
      wrongPenalty: 0,
      topicIds: plan.topicId ? [plan.topicId] : []
    },
    questionIds: questions.map(question => question.id),
    active: true,
    createdAt: existing?.createdAt || Date.now()
  }

  const answers: StudentAnswer[] = questions.map(question => ({
    questionId: question.id,
    selected: [],
    correctIds: question.options.filter(option => option.isCorrect).map(option => option.label),
    points: 0,
    maxPoints: 1,
    correct: false,
    flagged: false
  }))
  const attempt: StudentAttempt = {
    id: uid('att-'),
    exerciseId,
    studentId,
    startedAt: Date.now(),
    status: 'berjalan',
    questionIds: questions.map(question => question.id),
    answers,
    score: 0,
    snapshotVersion: Object.fromEntries(questions.map(question => [question.id, question.version])),
    kind: plan.status === 'pengayaan' ? 'pengayaan' : 'remedial',
    remedialPlanId: plan.id
  }

  await db.exercises.put(exercise)
  await db.studentAttempts.put(attempt)
  await db.remedialPlans.update(plan.id, { status: 'berjalan', updatedAt: Date.now() })
  await queueSync('exercises', exercise.id)
  await queueSync('studentAttempts', attempt.id)
  await queueSync('remedialPlans', plan.id)
  return { attemptId: attempt.id, exerciseId }
}

async function createFollowUpPlan(
  plan: RemedialPlan,
  attempt: StudentAttempt,
  pct: number,
  settings: Settings,
  topError: string
): Promise<RemedialPlan | null> {
  const nextLevel: RemedialLevel = plan.level >= 3 ? 3 : (plan.level + 1) as RemedialLevel
  const [allQuestions, allPlans, recentUsed, teacherId] = await Promise.all([
    db.questions.toArray(),
    db.remedialPlans.where('studentId').equals(plan.studentId).toArray(),
    recentUsedQuestionIds(plan.studentId, settings.avoidRecentDays),
    currentTeacherId()
  ])
  const excluded = new Set<string>([
    ...allPlans.filter(item => item.indicatorKey === plan.indicatorKey).flatMap(item => item.questionIds),
    ...recentUsed
  ])
  const group: Group = {
    indicatorKey: plan.indicatorKey, indicator: plan.indicator,
    subjectId: plan.subjectId, topicId: plan.topicId, rows: []
  }
  const picked = pickQuestions(candidateQuestions(allQuestions, group, nextLevel, excluded), countFor(nextLevel, settings))
  if (!picked.length) return null

  const analysis: Analysis = {
    correct: 0, total: 0, pct, topError, errorCount: 0,
    misconceptions: [], level: nextLevel,
    subTopics: [...new Set(picked.map(question => question.subTopic))]
  }
  const followUp = makePlan({
    studentId: plan.studentId, group, level: nextLevel, status: 'disarankan',
    reason: `Tindak lanjut ${levelLabel(nextLevel)}: pada percobaan terakhir penguasaan indikator hanya ${pct}% (batas ${settings.masteryThreshold}%). Pola kesalahan: ${topError || 'belum teridentifikasi'}. Soal dipilih berbeda dari rangkaian sebelumnya.`,
    questions: picked,
    sourceAttemptIds: [...plan.sourceAttemptIds, attempt.id],
    scoreBefore: pct,
    assignedBy: teacherId || plan.assignedBy,
    analysis
  })
  await db.remedialPlans.put(followUp)
  await queueSync('remedialPlans', followUp.id)
  return followUp
}

export async function finalizeRemedialAttempt(attempt: StudentAttempt): Promise<void> {
  if (!attempt.remedialPlanId || attempt.status !== 'selesai') return
  const plan = await db.remedialPlans.get(attempt.remedialPlanId)
  if (!plan || plan.history.some(item => item.attemptId === attempt.id)) return

  const settings = await loadRemedialSettings()
  const evidenceRows = await db.skillEvidence.where('attemptId').equals(attempt.id).toArray()
  const scoped = evidenceRows.filter(row => row.indicatorKey === plan.indicatorKey)
  const answerRows = attempt.answers.filter(answer => plan.questionIds.includes(answer.questionId))
  const total = scoped.length || answerRows.length || attempt.answers.length
  const correct = scoped.length ? scoped.filter(row => row.correct).length : answerRows.filter(answer => answer.correct).length
  const pct = total ? Math.round(correct / total * 100) : 0

  const grouped = new Map<string, { correct: number; total: number }>()
  for (const row of evidenceRows) {
    const entry = grouped.get(row.indicatorKey) || { correct: 0, total: 0 }
    entry.total += 1
    if (row.correct) entry.correct += 1
    grouped.set(row.indicatorKey, entry)
  }
  if (!grouped.has(plan.indicatorKey)) grouped.set(plan.indicatorKey, { correct, total: Math.max(1, total) })
  const mastered: string[] = []
  const remaining: string[] = []
  for (const [key, value] of grouped) {
    const valuePct = value.total ? Math.round(value.correct / value.total * 100) : 0
    if (valuePct >= settings.masteryThreshold) mastered.push(key)
    else remaining.push(key)
  }
  const isMastered = pct >= settings.masteryThreshold
  const topError = scoped.filter(row => !row.correct && row.errorType)[0]?.errorType || ''

  let followUpNote = ''
  if (isMastered) {
    try {
      const enrichment = await createEnrichmentPlan(plan.id)
      followUpNote = `Rencana pengayaan otomatis dibuat (${enrichment.id}).`
    } catch (error) {
      followUpNote = `Rencana pengayaan belum dibuat: ${messageOf(error)}`
    }
  } else {
    const next = await createFollowUpPlan(plan, attempt, pct, settings, topError)
    followUpNote = next
      ? `Rencana lanjutan ${levelLabel(next.level)} disarankan (${next.id}).`
      : 'Belum ada soal berbeda yang tersedia; guru perlu menyiapkan soal lanjutan.'
  }

  const evaluation: RemedialEvaluation = {
    at: attempt.finishedAt || Date.now(),
    attemptId: attempt.id,
    score: attempt.score,
    mastered,
    remaining,
    note: `Penguasaan indikator ${pct}% (batas ${settings.masteryThreshold}%), nilai latihan ${attempt.score}. ${isMastered ? 'Indikator dinyatakan tuntas.' : 'Indikator belum tuntas.'} ${followUpNote}`
  }
  await db.remedialPlans.update(plan.id, {
    status: isMastered ? 'tuntas' : 'disarankan',
    scoreAfter: attempt.score,
    history: [...plan.history, evaluation],
    updatedAt: Date.now()
  })
  await queueSync('remedialPlans', plan.id)
}
