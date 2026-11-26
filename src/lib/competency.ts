import type { AiConfig, HeatmapColors, HeatmapSettings, MasteryCategory, Question, RemedialSettings } from '../types'
import { getSetting } from '../db/db'

export interface Thresholds { sangatBaik: number; baik: number; cukup: number; penguatan: number }

export const DEFAULT_THRESHOLDS: Thresholds = { sangatBaik: 85, baik: 70, cukup: 55, penguatan: 40 }

export function categorize(percentage: number, t: Thresholds): MasteryCategory {
  if (percentage >= t.sangatBaik) return 'Sangat baik'
  if (percentage >= t.baik) return 'Baik'
  if (percentage >= t.cukup) return 'Cukup'
  if (percentage >= t.penguatan) return 'Perlu penguatan'
  return 'Perlu remedial'
}

export const DEFAULT_HEATMAP_COLORS: HeatmapColors = {
  sangatBaik: '#10b981',
  baik: '#0ea5e9',
  cukup: '#f59e0b',
  penguatan: '#f97316',
  remedial: '#ef4444',
  insufficient: '#e2e8f0'
}

export const DEFAULT_HEATMAP_SETTINGS: HeatmapSettings = {
  colors: DEFAULT_HEATMAP_COLORS,
  minEvidence: 3
}

export const DEFAULT_REMEDIAL_SETTINGS: RemedialSettings = {
  masteryThreshold: 70,
  level1Count: 4,
  level2Count: 4,
  level3Count: 4,
  enrichmentCount: 3,
  avoidRecentDays: 14
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  enabled: false,
  endpoint: '',
  scopes: ['penjelasan', 'ringkasan', 'rekomendasi', 'draft-soal', 'kualitas-soal']
}

export function normalizeIndicatorText(text: string) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function indicatorKeyOf(question: Pick<Question, 'topicId' | 'indicator' | 'indicatorKey' | 'learningObjectiveId'>) {
  if (question.indicatorKey) return question.indicatorKey
  if (question.learningObjectiveId) return question.learningObjectiveId
  return `${question.topicId}|${normalizeIndicatorText(question.indicator)}`
}

export async function loadHeatmapSettings() {
  const [storedColors, storedMin] = await Promise.all([
    getSetting<Partial<typeof DEFAULT_HEATMAP_COLORS>>('heatmapColors', {}),
    getSetting<number>('heatmapMinEvidence', DEFAULT_HEATMAP_SETTINGS.minEvidence)
  ])
  return {
    colors: { ...DEFAULT_HEATMAP_COLORS, ...storedColors },
    minEvidence: Math.max(1, Number(storedMin) || DEFAULT_HEATMAP_SETTINGS.minEvidence)
  }
}

export async function loadRemedialSettings() {
  const stored = await getSetting<Partial<typeof DEFAULT_REMEDIAL_SETTINGS>>('remedialSettings', {})
  return { ...DEFAULT_REMEDIAL_SETTINGS, ...stored }
}

export async function loadAiConfig() {
  const stored = await getSetting<Partial<typeof DEFAULT_AI_CONFIG>>('aiConfig', {})
  return { ...DEFAULT_AI_CONFIG, ...stored }
}

export async function categoryFor(percentage: number) {
  const thresholds = await getSetting('masteryThresholds', DEFAULT_THRESHOLDS) as Thresholds
  return categorize(percentage, { ...DEFAULT_THRESHOLDS, ...thresholds })
}

export function colorForCategory(category: MasteryCategory, colors = DEFAULT_HEATMAP_COLORS) {
  switch (category) {
    case 'Sangat baik': return colors.sangatBaik
    case 'Baik': return colors.baik
    case 'Cukup': return colors.cukup
    case 'Perlu penguatan': return colors.penguatan
    default: return colors.remedial
  }
}
