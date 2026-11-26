import type { DocxParseResult } from './docx'
import { db, queueSync, uid } from '../db/db'
import { indicatorKeyOf, normalizeIndicatorText } from './competency'
import type { ImportHistory, ParsedQuestion, Question } from '../types'

export interface DuplicateInfo {
  kind: 'file' | 'database'
  id: string
  label: string
  score: number
  reimport?: boolean
}

export interface DraftOption {
  label: string
  text: string
  mediaId?: string
}

export interface DraftImage {
  id: string
  name: string
  blob: Blob
  location: 'stimulus' | 'option'
  optionLabel?: string
  removed?: boolean
}

export interface ImportDraft extends Omit<ParsedQuestion, 'options' | 'images'> {
  options: DraftOption[]
  images: DraftImage[]
  accepted: boolean
  duplicate?: DuplicateInfo
  validation: string[]
}

export interface ImportSaveOptions {
  drafts: ImportDraft[]
  file: File
  subjectId: string
  subjectCode: string
  topicId: string
  semester: number
  teacherId: string
  analysis: DocxParseResult['analysis']
  errors: string[]
  warnings: string[]
  reimportOf?: string
  onProgress?: (percent: number, label: string) => void
}

export interface SaveImportResult {
  history: ImportHistory
  imported: number
  failed: number
  skipped: number
  imageCount: number
  questionIds: string[]
}

const STOP_WORDS = new Set([
  'yang', 'di', 'dari', 'dan', 'atau', 'untuk', 'pada', 'dengan', 'adalah', 'ini', 'itu',
  'ke', 'dalam', 'the', 'a', 'an', 'of', 'in', 'on', 'is', 'are', 'to'
])

/** Token overlap coefficient (intersection / smaller token set). */
export function similarity(left: string, right: string): number {
  const tokens = (value: string) => new Set(
    (value.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(token => !STOP_WORDS.has(token))
  )
  const a = tokens(left)
  const b = tokens(right)
  if (!a.size || !b.size) return 0
  let shared = 0
  for (const token of a) if (b.has(token)) shared += 1
  return shared / Math.min(a.size, b.size)
}

export function stripHtml(value: string) {
  if (!value) return ''
  const doc = new DOMParser().parseFromString(value, 'text/html')
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
}

/** Allow-list sanitizer for the small subset of HTML produced from Word tables. */
export function sanitizeHtml(value: string) {
  const allowed = new Set(['TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'SUP', 'SUB', 'SPAN'])
  const doc = new DOMParser().parseFromString(`<div id="sanitize-root">${value}</div>`, 'text/html')
  const root = doc.getElementById('sanitize-root')
  if (!root) return ''
  const walk = (node: Node): string => {
    if (node.nodeType === 3) return (node.textContent || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!))
    if (node.nodeType !== 1) return ''
    const element = node as Element
    const tag = element.tagName.toUpperCase()
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META'].includes(tag)) return ''
    const inner = Array.from(element.childNodes).map(walk).join('')
    if (!allowed.has(tag)) return inner
    return `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`
  }
  return Array.from(root.childNodes).map(walk).join('')
}

function fingerprintText(value: {
  prompt: string
  stimulus: string
  indicator?: string
  topic?: string
}) {
  return [
    stripHtml(value.stimulus || ''),
    stripHtml(value.prompt || ''),
    normalizeIndicatorText(value.indicator || ''),
    normalizeIndicatorText(value.topic || '')
  ].filter(Boolean).join(' ')
}

export function draftFromParsed(question: ParsedQuestion): ImportDraft {
  return {
    ...question,
    options: question.options.map(option => ({ ...option })),
    images: question.images.map(image => ({ ...image })),
    accepted: true,
    validation: []
  }
}

export function validateDraft(draft: ImportDraft): string[] {
  const problems: string[] = []
  if (!draft.prompt.trim()) problems.push('Pertanyaan kosong.')
  const activeImages = draft.images.filter(image => !image.removed)
  const usableOptions = draft.options.filter(option =>
    option.text.trim() || activeImages.some(image => image.location === 'option' && image.optionLabel === option.label))
  if (usableOptions.length < 2) problems.push('Pilihan jawaban kurang dari dua.')
  if (!draft.answer.length) problems.push('Kunci jawaban belum ditentukan.')
  if (draft.type === 'single' && draft.answer.length > 1) problems.push('Pilihan ganda hanya boleh memiliki satu kunci.')
  if (draft.type === 'multiple' && draft.answer.length < 2) problems.push('Multiple response minimal memiliki dua kunci.')
  const labels = draft.options.map(option => option.label)
  if (new Set(labels).size !== labels.length) problems.push('Ada label pilihan yang ganda.')
  const wrong = draft.answer.filter(label => !labels.includes(label))
  if (wrong.length) problems.push(`Kunci ${wrong.join(', ')} tidak memiliki pilihan sesuai.`)
  return problems
}

/**
 * Mark near-identical questions both inside the file and against the existing bank.
 * A token overlap of 0.8 or higher counts as a duplicate.
 */
export function detectDuplicates(
  drafts: ImportDraft[],
  existing: Question[],
  topicId: string,
  topicName?: string
): Record<string, DuplicateInfo> {
  const found: Record<string, DuplicateInfo> = {}
  for (let i = 0; i < drafts.length; i += 1) {
    for (let j = i + 1; j < drafts.length; j += 1) {
      const left = drafts[i]
      const right = drafts[j]
      const score = similarity(fingerprintText(left), fingerprintText(right))
      if (score >= 0.8 && !found[right.tempId]) {
        found[right.tempId] = { kind: 'file', id: left.tempId, label: `Soal ${left.number}`, score }
      }
    }
  }
  for (const draft of drafts) {
    if (found[draft.tempId]) continue
    for (const question of existing) {
      if (topicId && question.topicId && question.topicId !== topicId) continue
      const score = similarity(
        fingerprintText(draft),
        fingerprintText({ prompt: question.prompt, stimulus: question.stimulus, indicator: question.indicator, topic: topicName })
      )
      if (score >= 0.8) {
        found[draft.tempId] = { kind: 'database', id: question.id, label: question.code || 'Soal di bank', score }
        break
      }
    }
  }
  return found
}

/** Save accepted drafts in batches of 25 and write a complete import history record. */
export async function saveImport(options: ImportSaveOptions): Promise<SaveImportResult> {
  const report = (percent: number, label: string) => {
    try { options.onProgress?.(Math.max(0, Math.min(100, Math.round(percent))), label) } catch { /* ignore UI callback errors */ }
  }
  const allErrors = [...options.errors]
  const excluded = options.drafts.filter(draft => !draft.accepted)
  for (const draft of excluded) {
    allErrors.push(`Soal ${draft.number} dilewati sesuai pilihan guru.`)
  }
  const chosen = options.drafts.filter(draft => draft.accepted && validateDraft(draft).length === 0)
  for (const draft of options.drafts.filter(draft => draft.accepted && validateDraft(draft).length > 0)) {
    allErrors.push(`Soal ${draft.number} gagal divalidasi: ${validateDraft(draft).join(' ')}`)
  }

  const now = Date.now()
  const codePrefix = (options.subjectCode || options.subjectId || 'MAPEL').replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase() || 'MAPEL'
  const topicRow = options.topicId ? await db.topics.get(options.topicId) : undefined
  const questionIds: string[] = []
  let imageCount = 0
  let failed = 0

  report(0, 'Menyiapkan penyimpanan…')
  for (let start = 0; start < chosen.length; start += 25) {
    const batch = chosen.slice(start, start + 25)
    for (const draft of batch) {
      const id = uid('q-')
      const mediaMap = new Map<string, string>()
      const activeImages = draft.images.filter(image => !image.removed && image.blob)
      for (const image of activeImages) {
        const mediaId = uid('media-')
        mediaMap.set(image.id, mediaId)
        await db.questionMedia.put({
          id: mediaId, name: image.name, mime: image.blob.type || 'image/png',
          blob: image.blob, questionId: id, location: image.location, createdAt: now
        })
        imageCount += 1
      }
      const indicatorText = draft.indicator?.trim() || draft.tp.trim() || topicRow?.tp[0] || ''
      const normalized = normalizeIndicatorText(indicatorText)
      const indicatorKey = indicatorKeyOf({
        topicId: options.topicId,
        indicator: normalized,
        indicatorKey: '',
        learningObjectiveId: ''
      })
      const question: Question = {
        id,
        code: `IMP-${codePrefix}-${draft.number}-${now.toString(36).slice(-4).toUpperCase()}`,
        subjectId: options.subjectId,
        topicId: options.topicId,
        subTopic: 'Hasil import',
        category: topicRow?.category,
        semester: options.semester,
        cp: topicRow?.cp || '',
        tp: draft.tp || topicRow?.tp.join('; ') || '',
        indicator: indicatorText,
        indicatorKey,
        cognitive: draft.cognitive,
        difficulty: draft.difficulty,
        type: draft.type,
        status: 'perlu_diperiksa',
        active: true,
        stimulus: draft.stimulus,
        stimulusMediaId: activeImages.find(image => image.location === 'stimulus')
          ? mediaMap.get(activeImages.find(image => image.location === 'stimulus')!.id) : undefined,
        prompt: draft.prompt,
        options: draft.options.map(option => ({
          id: uid('opt-'),
          label: option.label,
          text: option.text,
          isCorrect: draft.answer.includes(option.label),
          reason: draft.answer.includes(option.label) ? 'Sesuai kunci jawaban hasil import.' : 'Pilihan tidak sesuai kunci.',
          mediaId: activeImages.some(image => image.location === 'option' && image.optionLabel === option.label)
            ? mediaMap.get(activeImages.find(image => image.location === 'option' && image.optionLabel === option.label)!.id)
            : undefined
        })),
        explanation: draft.explanation + (draft.semantic ? `\n[Aspek: ${draft.semantic}]` : ''),
        competency: draft.competency?.trim() || (draft.semantic ? `Kompetensi aspek ${draft.semantic}` : 'Kompetensi sesuai indikator'),
        misconception: draft.misconception?.trim() || 'Perlu ditelaah guru',
        recommendation: draft.recommendation?.trim() || 'Latihan penguatan pada materi terkait',
        teacherId: options.teacherId,
        generatedBy: 'import',
        version: 1,
        createdAt: now,
        updatedAt: now
      }
      try {
        await db.questions.add(question)
        await queueSync('questions', id)
        questionIds.push(id)
      } catch (error) {
        failed += 1
        allErrors.push(`Soal ${draft.number} gagal disimpan: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    const done = Math.min(start + 25, chosen.length)
    report(Math.round((done / Math.max(1, chosen.length)) * 92), `Menyimpan soal ${done} dari ${chosen.length}…`)
    if (done < chosen.length) await new Promise<void>(resolve => setTimeout(resolve, 0))
  }

  const history: ImportHistory = {
    id: uid('imp-'),
    fileName: options.file.name,
    teacherId: options.teacherId,
    subjectId: options.subjectId,
    topicId: options.topicId,
    detected: options.drafts.length,
    imported: questionIds.length,
    errors: allErrors,
    successCount: questionIds.length,
    failedCount: options.drafts.length - questionIds.length,
    imageCount,
    warnings: options.warnings,
    questionIds,
    analysis: options.analysis,
    createdAt: now,
    ...(options.reimportOf ? { reimportOf: options.reimportOf } : {})
  }
  report(96, 'Mencatat riwayat impor…')
  await db.importHistory.put(history)
  await queueSync('importHistory', history.id)
  report(100, 'Impor selesai.')

  return {
    history,
    imported: questionIds.length,
    failed,
    skipped: excluded.length,
    imageCount,
    questionIds
  }
}
