import { db, getSetting, queueSync, uid } from '../db/db'
import { indicatorKeyOf, loadAiConfig } from './competency'
import type {
  AiConfig, CognitiveLevel, Difficulty, Question, QuestionOption, QuestionRevision, QuestionType
} from '../types'

export const AI_SCOPES = ['penjelasan', 'ringkasan', 'rekomendasi', 'draft-soal', 'kualitas-soal'] as const
export type AiScope = typeof AI_SCOPES[number]

export interface AiRequest {
  scope: AiScope
  payload: Record<string, unknown>
  signal?: AbortSignal
}

export interface AiQuestionDraft {
  subjectId: string
  topicId: string
  subTopic?: string
  prompt: string
  stimulus?: string
  type?: QuestionType
  options: Array<{ label: string; text: string; isCorrect: boolean; reason?: string }>
  explanation?: string
  tp?: string
  indicator?: string
  cognitive?: CognitiveLevel
  difficulty?: Difficulty
  competency?: string
  misconception?: string
  recommendation?: string
}

export interface AiResponse {
  ok: boolean
  text: string
  drafts: AiQuestionDraft[]
  error?: string
  model?: string
}

export interface AiAdapter {
  readonly name: string
  request(req: AiRequest): Promise<AiResponse>
}

const disabledResponse = (error: string): AiResponse => ({ ok: false, text: '', drafts: [], error })

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function asCognitive(value: unknown): CognitiveLevel {
  return value === 'C5' || value === 'C6' ? value : 'C4'
}

function asDifficulty(value: unknown): Difficulty {
  return value === 'mudah' || value === 'sulit' ? value : 'sedang'
}

function asType(value: unknown): QuestionType {
  return value === 'multiple' ? 'multiple' : 'single'
}

function sanitizeDraft(value: unknown): AiQuestionDraft | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const prompt = asString(raw.prompt || raw.question || raw.pertanyaan)
  const subjectId = asString(raw.subjectId)
  const topicId = asString(raw.topicId)
  if (!prompt || !subjectId || !topicId) return null
  const optionValues = Array.isArray(raw.options) ? raw.options : []
  const options = optionValues.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const o = item as Record<string, unknown>
    const text = asString(o.text)
    if (!text) return []
    return [{
      label: (asString(o.label) || String.fromCharCode(65 + index)).slice(0, 1).toUpperCase(),
      text,
      isCorrect: o.isCorrect === true || o.correct === true || asString(o.key).toUpperCase() === String.fromCharCode(65 + index),
      reason: asString(o.reason)
    }]
  })
  if (options.length < 2 || !options.some(o => o.isCorrect)) return null
  return {
    subjectId,
    topicId,
    subTopic: asString(raw.subTopic),
    prompt,
    stimulus: asString(raw.stimulus),
    type: asType(raw.type),
    options,
    explanation: asString(raw.explanation || raw.pembahasan),
    tp: asString(raw.tp),
    indicator: asString(raw.indicator || raw.indikator),
    cognitive: asCognitive(raw.cognitive || raw.level),
    difficulty: asDifficulty(raw.difficulty || raw.tingkatKesulitan),
    competency: asString(raw.competency || raw.kompetensi),
    misconception: asString(raw.misconception || raw.miskonsepsi),
    recommendation: asString(raw.recommendation || raw.rekomendasi)
  }
}

function normalizeConfig(config: Partial<AiConfig> | null | undefined) {
  return {
    enabled: config?.enabled === true,
    endpoint: asString(config?.endpoint),
    scopes: Array.isArray(config?.scopes) ? config!.scopes.map(s => asString(s)) : [...AI_SCOPES]
  }
}

/**
 * Adapter untuk endpoint proxy server. Frontend tidak pernah menyimpan atau
 * mengirim API key; kredensial ada di server yang dipilih admin.
 */
export function createProxyAiAdapter(config: Partial<AiConfig>): AiAdapter {
  const cfg = normalizeConfig(config)
  return {
    name: 'Proxy AI server',
    async request({ scope, payload, signal }: AiRequest): Promise<AiResponse> {
      if (!cfg.enabled) return disabledResponse('Asisten AI belum diaktifkan oleh admin.')
      if (!cfg.endpoint) return disabledResponse('URL endpoint asisten AI belum dikonfigurasi.')
      if (!cfg.scopes.includes(scope)) return disabledResponse(`Layanan "${scope}" tidak diizinkan pada endpoint ini.`)

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 25000)
      const forwardAbort = () => controller.abort()
      signal?.addEventListener('abort', forwardAbort)
      try {
        const res = await fetch(cfg.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ protocol: 'smart-hots-ai/v1', scope, payload }),
          signal: controller.signal
        })
        if (!res.ok) return disabledResponse(`Server asisten AI mengembalikan HTTP ${res.status}.`)
        const raw = await res.json() as Record<string, unknown>
        const drafts = (Array.isArray(raw.drafts) ? raw.drafts : Array.isArray(raw.questions) ? raw.questions : [])
          .map(sanitizeDraft).filter((d): d is AiQuestionDraft => !!d)
        return {
          ok: true,
          text: asString(raw.text ?? raw.summary ?? raw.explanation ?? raw.recommendation),
          drafts,
          model: asString(raw.model) || undefined
        }
      } catch (e) {
        const aborted = signal?.aborted || (e instanceof Error && e.name === 'AbortError')
        return disabledResponse(aborted ? 'Permintaan dibatalkan atau waktu habis.' : `Asisten AI tidak dapat dihubungi: ${String(e)}`)
      } finally {
        clearTimeout(timer)
        signal?.removeEventListener('abort', forwardAbort)
      }
    }
  }
}

export async function getAiAdapter(): Promise<AiAdapter> {
  return createProxyAiAdapter(await loadAiConfig())
}

export async function getAiStatus() {
  const config = normalizeConfig(await loadAiConfig())
  return { enabled: config.enabled, endpoint: config.endpoint, scopes: config.scopes }
}

/** Menyimpan keluaran AI sebagai Draft. Tidak pernah menimpa soal yang ada. */
export async function saveAiDrafts(drafts: AiQuestionDraft[], teacherId: string): Promise<{ saved: string[]; errors: string[] }> {
  const saved: string[] = []
  const errors: string[] = []
  if (!drafts.length) return { saved, errors }
  const topics = await db.topics.toArray()
  const sequence = await getSetting<number>('aiDraftSequence', 0)
  let counter = sequence
  const now = Date.now()

  await db.transaction('rw', db.questions, db.applicationSettings, async () => {
    for (const [index, draft] of drafts.entries()) {
      const topic = topics.find(t => t.id === draft.topicId)
      if (!topic) { errors.push(`Baris ${index + 1}: materi tidak ditemukan.`); continue }
      if (draft.subjectId !== topic.subjectId) { errors.push(`Baris ${index + 1}: mata pelajaran tidak cocok dengan materi.`); continue }
      if (!draft.prompt.trim()) { errors.push(`Baris ${index + 1}: pertanyaan kosong.`); continue }
      const options: QuestionOption[] = draft.options.slice(0, 5).map((o, i) => ({
        id: uid('opt-'),
        label: (o.label || String.fromCharCode(65 + i)).slice(0, 1).toUpperCase(),
        text: o.text.trim(),
        isCorrect: o.isCorrect,
        reason: o.reason || '-'
      }))
      if (options.length < 2 || !options.some(o => o.isCorrect)) {
        errors.push(`Baris ${index + 1}: minimal dua opsi dan satu kunci jawaban diperlukan.`)
        continue
      }
      counter += 1
      const indicator = draft.indicator || '-'
      const question: Question = {
        id: uid('q-'),
        code: `AI-${draft.subjectId}-${String(counter).padStart(3, '0')}-${now.toString(36)}`,
        subjectId: draft.subjectId,
        topicId: draft.topicId,
        subTopic: draft.subTopic || topic.subTopics[0] || '-',
        category: topic.category,
        semester: topic.semester,
        cp: topic.cp,
        tp: draft.tp || topic.tp.join('; '),
        indicator,
        indicatorKey: indicatorKeyOf({ topicId: draft.topicId, indicator }),
        generatedBy: 'ai',
        cognitive: asCognitive(draft.cognitive),
        difficulty: asDifficulty(draft.difficulty),
        type: asType(draft.type),
        status: 'draft',
        active: false,
        stimulus: draft.stimulus || '',
        prompt: draft.prompt.trim(),
        options,
        explanation: draft.explanation || '-',
        competency: draft.competency || topic.cp,
        misconception: draft.misconception || '-',
        recommendation: draft.recommendation || '-',
        teacherId,
        version: 1,
        createdAt: now,
        updatedAt: now
      }
      await db.questions.put(question)
      saved.push(question.id)
    }
    if (counter !== sequence) await db.applicationSettings.put({ key: 'aiDraftSequence', value: counter, updatedAt: now })
  })

  for (const id of saved) await queueSync('questions', id)
  return { saved, errors }
}

/** Guru menyetujui draft AI menjadi soal siap pakai. Membuat revisi untuk audit. */
export async function approveAiDraft(questionId: string, teacherId: string): Promise<void> {
  const q = await db.questions.get(questionId)
  if (!q || q.generatedBy !== 'ai' || q.status !== 'draft') return
  const now = Date.now()
  const revision: QuestionRevision = {
    id: uid('rev-'),
    questionId: q.id,
    version: q.version,
    snapshot: { ...q },
    changedBy: teacherId,
    changedAt: now,
    note: 'Draft asisten AI disetujui guru'
  }
  await db.transaction('rw', db.questions, db.questionRevisions, async () => {
    await db.questionRevisions.put(revision)
    await db.questions.update(q.id, {
      status: 'siap', active: true, approvedBy: teacherId, approvedAt: now,
      version: q.version + 1, updatedAt: now
    })
  })
  await queueSync('questions', q.id)
}

/** Guru menolak draft AI; soal diarsipkan dan tidak pernah dipakai dalam penilaian. */
export async function rejectAiDraft(questionId: string, teacherId: string): Promise<void> {
  const q = await db.questions.get(questionId)
  if (!q || q.generatedBy !== 'ai' || q.status !== 'draft') return
  const now = Date.now()
  await db.questionRevisions.put({
    id: uid('rev-'), questionId: q.id, version: q.version, snapshot: { ...q },
    changedBy: teacherId, changedAt: now, note: 'Draft asisten AI ditolak guru'
  })
  await db.questions.update(q.id, { status: 'diarsipkan', active: false, updatedAt: now })
  await queueSync('questions', q.id)
}
