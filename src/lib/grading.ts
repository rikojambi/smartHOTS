import type { ExerciseSetting, Question } from '../types'

export interface GradeResult { points: number; correct: boolean; explanation: string }

export function gradeAnswer(question: Question, selected: string[], settings: Partial<ExerciseSetting>): GradeResult {
  const correctIds = question.options.filter(o => o.isCorrect).map(o => o.label)
  const chosen = [...new Set(selected)]
  const hits = chosen.filter(id => correctIds.includes(id)).length
  const wrong = chosen.filter(id => !correctIds.includes(id)).length
  const exact = hits === correctIds.length && wrong === 0 && chosen.length === correctIds.length

  if (question.type === 'single') {
    return exact
      ? { points: 1, correct: true, explanation: 'Jawaban tepat.' }
      : { points: 0, correct: false, explanation: 'Jawaban tidak tepat.' }
  }

  if (exact) return { points: 1, correct: true, explanation: 'Semua pilihan benar terpilih.' }
  if (settings.partialScoring === false) {
    return { points: 0, correct: false, explanation: 'Penilaian ketat: nilai penuh hanya jika seluruh jawaban benar.' }
  }
  const penalty = Math.max(0, Math.min(1, settings.wrongPenalty ?? 0))
  const raw = hits / Math.max(1, correctIds.length) - penalty * (wrong / Math.max(1, question.options.length))
  const points = Math.max(0, Math.min(1, raw))
  return {
    points: Number(points.toFixed(3)),
    correct: false,
    explanation: `Sebagian benar: ${hits} dari ${correctIds.length} jawaban benar dipilih${wrong ? `, ${wrong} pilihan salah` : ''}.`
  }
}

export function calculateScore(points: number, totalQuestions: number) {
  return totalQuestions ? Math.round((points / totalQuestions) * 100) : 0
}
