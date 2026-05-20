export interface User {
  username: string
}

export type CallClass =
  | 'target_call'
  | 'unsuitable_candidate'
  | 'candidate_refused'
  | 'no_contact_or_disconnected'
  | 'wrong_number'
  | 'other'

export type KpiLevel = 'high' | 'normal' | 'low'

export interface Overview {
  total_calls: number
  analyzed_calls: number
  avg_base_score: number | null
  avg_bonus_score: number | null
  avg_total_score: number | null
  high_kpi_count: number
  low_kpi_count: number
  target_call_count: number
}

export interface DateStat {
  date: string
  count: number
  avg_score: number | null
}

export interface CallClassStat {
  call_class: string
  count: number
  avg_score: number | null
}

export interface KpiLevelStat {
  kpi_level: string
  count: number
  avg_score: number | null
}

export interface CriteriaStat {
  criteria: string
  avg_score: number
  max_possible: number
  sample_count: number
}

export interface ProblemStat {
  problem: string
  count: number
}

export interface RecommendationStat {
  recommendation: string
  count: number
}

export interface ScoreRange {
  range: string
  count: number
}

export interface FilterOption {
  value: string
  label: string
  count: number
}

export interface DialogListItem {
  call_id: string
  call_date: string
  source_file: string | null
  call_class: CallClass | null
  kpi_level: KpiLevel | null
  base_score: number | null
  bonus_score: number | null
  total_score: number | null
  confidence: number | null
  summary: string | null
  problems_count: number
}

export interface DialogsResponse {
  items: DialogListItem[]
  total: number
  page: number
  size: number
  pages: number
}

export interface Turn {
  text: string
}

export interface Criterion {
  name: string
  score: number | null
  max_score: number | null
  comment: string
  evidence: string
}

export interface Dispute {
  score: number
  comment: string
  username: string
  created_at: string
}

export interface Analysis {
  call_class: CallClass | null
  confidence: number | null
  base_score: number | null
  bonus_score: number | null
  total_score: number | null
  kpi_level: KpiLevel | null
  summary: string | null
  main_problems: string[]
  recommendations: string[]
  criteria: Criterion[]
  bonus_criteria: Criterion[]
  model_name: string | null
  prompt_version: string | null
  analyzed_at: string | null
  dispute: Dispute | null
}

export interface Session {
  call_id: string
  call_date: string
  source_file: string | null
  created_at: string
}

export interface DialogDetail {
  session: Session
  transcript: Turn[]
  analysis: Analysis | null
}

export interface RefusalsOverview {
  refusals_count: number
  candidate_refused_count: number
  unsuitable_candidate_count: number
  analyzed_total: number
  refusal_rate_pct: number | null
  avg_base_score: number | null
  avg_objection_handling: number | null
  missed_objection_count: number
  low_kpi_refusals: number
}

export interface RefusalsByDate {
  date: string
  count: number
  avg_objection_handling: number | null
  avg_base_score: number | null
}

export interface RefusalTypeStat {
  refusal_type: string
  count: number
  avg_base_score: number | null
  avg_objection_handling: number | null
}

export interface ObjectionBucket {
  bucket: string
  count: number
}

export interface CriteriaCompare {
  criteria: string
  refusals_avg: number | null
  target_avg: number | null
  max_possible: number
}

export interface RefusalsFilters {
  from_date: string
  to_date: string
  refusal_type: string
  kpi_level: string
}

export interface Filters {
  from_date: string
  to_date: string
  call_class: string
  kpi_level: string
  min_score: string
  max_score: string
  search?: string
}

// Human-readable labels
export const REFUSAL_TYPE_LABELS: Record<string, string> = {
  candidate_refused: 'Кандидат отказался',
  unsuitable_candidate: 'Неподходящий кандидат',
}

export const CALL_CLASS_LABELS: Record<string, string> = {
  target_call: 'Целевой звонок',
  unsuitable_candidate: 'Неподходящий кандидат',
  candidate_refused: 'Кандидат отказался',
  no_contact_or_disconnected: 'Нет контакта / прерван',
  wrong_number: 'Не тот номер',
  other: 'Прочее',
  unknown: 'Без анализа',
}

export const KPI_LEVEL_LABELS: Record<string, string> = {
  high: 'Высокий',
  normal: 'Средний',
  low: 'Низкий',
  unknown: 'Не определён',
}

export const CRITERIA_LABELS: Record<string, string> = {
  greeting: 'Приветствие',
  needs_discovery: 'Выявление потребностей',
  vacancy_presentation: 'Презентация вакансии',
  candidate_profile_assessment: 'Оценка профиля кандидата',
  invitation_or_correct_refusal: 'Приглашение / корректный отказ',
  dialog_closing: 'Завершение диалога',
  speech_quality: 'Качество речи',
  dialog_management: 'Управление диалогом',
  // bonus
  objection_handling: 'Работа с возражениями',
  helpfulness_and_alternatives: 'Помощь и альтернативы',
  friend_contacts: 'Контакты друзей',
}
