import api from './client'
import type {
  Overview, DateStat, CallClassStat, KpiLevelStat,
  CriteriaStat, ProblemStat, RecommendationStat, ScoreRange,
  DialogsResponse, DialogDetail, FilterOption,
} from '../types'

// Auth
export const login = (username: string, password: string) =>
  api.post<{ access_token: string; username: string }>('/auth/login', { username, password })

// Filters meta
export const getCallClasses = () => api.get<FilterOption[]>('/filters/call-classes')
export const getKpiLevels = () => api.get<FilterOption[]>('/filters/kpi-levels')
export const getDateRange = () => api.get<{ min_date: string; max_date: string }>('/filters/date-range')

// Stats
export const getOverview = (params: Record<string, string>) =>
  api.get<Overview>('/stats/overview', { params })

export const getByDate = (params: Record<string, string>) =>
  api.get<DateStat[]>('/stats/by-date', { params })

export const getByCallClass = (params: Record<string, string>) =>
  api.get<CallClassStat[]>('/stats/by-call-class', { params })

export const getByKpiLevel = (params: Record<string, string>) =>
  api.get<KpiLevelStat[]>('/stats/by-kpi-level', { params })

export const getCriteria = (params: Record<string, string>) =>
  api.get<CriteriaStat[]>('/stats/criteria', { params })

export const getBonusCriteria = (params: Record<string, string>) =>
  api.get<CriteriaStat[]>('/stats/bonus-criteria', { params })

export const getProblems = (params: Record<string, string>) =>
  api.get<ProblemStat[]>('/stats/problems', { params })

export const getRecommendations = (params: Record<string, string>) =>
  api.get<RecommendationStat[]>('/stats/recommendations', { params })

export const getScoreDistribution = (params: Record<string, string>) =>
  api.get<ScoreRange[]>('/stats/score-distribution', { params })

// Dialogs
export const getDialogs = (params: Record<string, string | number>) =>
  api.get<DialogsResponse>('/dialogs', { params })

export const getDialog = (callId: string) =>
  api.get<DialogDetail>(`/dialogs/${callId}`)

export const addDispute = (callId: string, score: number, comment: string) =>
  api.put(`/dialogs/${callId}/dispute`, { score, comment })

export const removeDispute = (callId: string) =>
  api.delete(`/dialogs/${callId}/dispute`)
