import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import {
  UserX, TrendingDown, AlertTriangle, MessageCircleOff,
  Shield, Percent, SlidersHorizontal, X,
} from 'lucide-react'
import Layout from '../components/Layout'
import KpiCard from '../components/KpiCard'
import { useTheme } from '../hooks/useTheme'
import {
  getRefusalsOverview, getRefusalsByDate, getRefusalsByType,
  getRefusalsByKpi, getObjectionHandlingDistribution,
  getRefusalsProblems, getRefusalsRecommendations, getCriteriaCompare,
} from '../api'
import type {
  RefusalsOverview, RefusalsByDate, RefusalTypeStat, KpiLevelStat,
  ObjectionBucket, ProblemStat, RecommendationStat, CriteriaCompare,
  RefusalsFilters,
} from '../types'
import { REFUSAL_TYPE_LABELS, KPI_LEVEL_LABELS, CRITERIA_LABELS } from '../types'

const REFUSAL_COLORS: Record<string, string> = {
  candidate_refused: '#EF4444',
  unsuitable_candidate: '#F59E0B',
}
const KPI_COLORS: Record<string, string> = {
  high: '#10B981', normal: '#6366F1', low: '#EF4444', unknown: '#64748B',
}
const OBJ_COLORS = ['#EF4444', '#F59E0B', '#FBBF24', '#6366F1', '#10B981']

const EMPTY: RefusalsFilters = {
  from_date: '', to_date: '', refusal_type: '', kpi_level: '',
}

interface Props { username: string; onLogout: () => void }

export default function Refusals({ username, onLogout }: Props) {
  const { ttStyle, gridStroke, cursorFill } = useTheme()
  const [filters, setFilters] = useState<RefusalsFilters>(EMPTY)
  const [overview, setOverview] = useState<RefusalsOverview | null>(null)
  const [byDate, setByDate] = useState<RefusalsByDate[]>([])
  const [byType, setByType] = useState<RefusalTypeStat[]>([])
  const [byKpi, setByKpi] = useState<KpiLevelStat[]>([])
  const [objDist, setObjDist] = useState<ObjectionBucket[]>([])
  const [problems, setProblems] = useState<ProblemStat[]>([])
  const [recs, setRecs] = useState<RecommendationStat[]>([])
  const [compare, setCompare] = useState<CriteriaCompare[]>([])

  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))

  useEffect(() => {
    getRefusalsOverview(params).then(r => setOverview(r.data))
    getRefusalsByDate(params).then(r => setByDate(r.data))
    getRefusalsByType(params).then(r => setByType(r.data))
    getRefusalsByKpi(params).then(r => setByKpi(r.data))
    getObjectionHandlingDistribution(params).then(r => setObjDist(r.data))
    getRefusalsProblems(params).then(r => setProblems(r.data))
    getRefusalsRecommendations(params).then(r => setRecs(r.data))
    // criteria-compare принимает только даты
    const dateOnly = Object.fromEntries(
      Object.entries(params).filter(([k]) => k === 'from_date' || k === 'to_date')
    )
    getCriteriaCompare(dateOnly).then(r => setCompare(r.data))
  }, [filters])

  const TT = { contentStyle: ttStyle, cursor: { fill: cursorFill } }
  const ax = { tick: { fontSize: 11, fill: 'var(--text-dim)' }, axisLine: false, tickLine: false }

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '20px 22px',
    boxShadow: 'var(--shadow)', transition: 'background .2s',
    overflow: 'hidden', minWidth: 0,
  }
  const sTitle: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 16,
  }
  const sSub: React.CSSProperties = {
    fontSize: 11, color: 'var(--text-dim)', marginTop: -10, marginBottom: 14,
  }

  const typeChart = byType.map(t => ({
    ...t,
    label: REFUSAL_TYPE_LABELS[t.refusal_type] || t.refusal_type,
  }))

  const kpiChart = byKpi.map(k => ({
    ...k,
    label: KPI_LEVEL_LABELS[k.kpi_level] || k.kpi_level,
  }))

  const radarData = compare.map(c => ({
    criteria: CRITERIA_LABELS[c.criteria] || c.criteria,
    Отказы: c.refusals_avg ?? 0,
    Целевые: c.target_avg ?? 0,
    max: c.max_possible,
  }))

  return (
    <Layout title="Отказы — аналитика" username={username} onLogout={onLogout}>
      {/* Filter bar */}
      <RefusalsFilterBar value={filters} onChange={setFilters} />

      {/* KPI cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 14, marginBottom: 20,
      }}>
        <KpiCard label="Всего отказов" value={overview?.refusals_count ?? '—'}
          icon={<UserX size={17} />} accent="var(--danger)"
          sub={`из ${overview?.analyzed_total ?? '—'} проанализир.`} />
        <KpiCard label="Доля отказов"
          value={overview?.refusal_rate_pct != null ? `${overview.refusal_rate_pct}%` : '—'}
          icon={<Percent size={17} />} accent="var(--warning)" />
        <KpiCard label="Кандидат отказался"
          value={overview?.candidate_refused_count ?? '—'}
          icon={<MessageCircleOff size={17} />} accent="#EF4444" />
        <KpiCard label="Неподходящий"
          value={overview?.unsuitable_candidate_count ?? '—'}
          icon={<TrendingDown size={17} />} accent="#F59E0B" />
        <KpiCard label="Возражения (ср.)"
          value={overview?.avg_objection_handling != null
            ? `${overview.avg_objection_handling} / 20` : '—'}
          icon={<Shield size={17} />} accent="var(--accent)"
          sub="отработка возражений" />
        <KpiCard label="Упущенные возможности"
          value={overview?.missed_objection_count ?? '—'}
          icon={<AlertTriangle size={17} />} accent="var(--danger)"
          sub="оценка возражений < 50%" />
        <KpiCard label="Низкий KPI"
          value={overview?.low_kpi_refusals ?? '—'}
          icon={<TrendingDown size={17} />} accent="var(--danger)" />
      </div>

      {/* Row 1: trend + type pie */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,360px)',
        gap: 14, marginBottom: 14,
      }}>
        <div style={card}>
          <div style={sTitle}>Динамика отказов по дням</div>
          <div style={sSub}>линии: количество отказов и средний балл отработки возражений</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={byDate} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" {...ax} />
              <YAxis {...ax} />
              <YAxis yAxisId="r" orientation="right" {...ax} domain={[0, 20]} />
              <Tooltip {...TT}
                formatter={(v: number, n: string) => [
                  v,
                  n === 'count' ? 'Отказов'
                    : n === 'avg_objection_handling' ? 'Возражения (ср.)'
                    : 'Базовый балл (ср.)',
                ]} />
              <Line type="monotone" dataKey="count" stroke="#EF4444" strokeWidth={2}
                dot={{ r: 3, fill: '#EF4444', strokeWidth: 0 }} name="count" />
              <Line type="monotone" dataKey="avg_objection_handling" stroke="#6366F1" strokeWidth={2}
                dot={{ r: 3, fill: '#6366F1', strokeWidth: 0 }}
                name="avg_objection_handling" yAxisId="r" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <div style={sTitle}>Структура отказов</div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={typeChart} dataKey="count" nameKey="label"
                cx="50%" cy="45%"
                outerRadius={82} innerRadius={36}
                paddingAngle={3}
                label={({ percent }) => percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : ''}
                labelLine={false}
              >
                {typeChart.map((t, i) => (
                  <Cell key={i} fill={REFUSAL_COLORS[t.refusal_type] || '#94A3B8'} />
                ))}
              </Pie>
              <Tooltip {...TT} formatter={(v: number) => [v, 'Звонков']} />
              <Legend
                iconSize={8} iconType="circle"
                wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: objection-handling distribution + KPI dist */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
        gap: 14, marginBottom: 14,
      }}>
        <div style={card}>
          <div style={sTitle}>Отработка возражений — распределение оценок</div>
          <div style={sSub}>сколько звонков попало в каждый диапазон (0–20)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={objDist} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="bucket" {...ax} />
              <YAxis {...ax} />
              <Tooltip {...TT} formatter={(v: number) => [v, 'Звонков']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {objDist.map((_, i) => (
                  <Cell key={i} fill={OBJ_COLORS[i] || '#6366F1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <div style={sTitle}>Отказы по уровню KPI рекрутера</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={kpiChart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="label" {...ax} />
              <YAxis {...ax} />
              <Tooltip {...TT} formatter={(v: number) => [v, 'Отказов']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {kpiChart.map((k, i) => (
                  <Cell key={i} fill={KPI_COLORS[k.kpi_level] || '#6366F1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: radar comparison */}
      {radarData.length > 0 && (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={sTitle}>Сравнение критериев: отказы vs целевые</div>
          <div style={sSub}>где рекрутер «теряет» баллы именно на отказных звонках</div>
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={radarData} outerRadius="78%">
              <PolarGrid stroke={gridStroke} />
              <PolarAngleAxis dataKey="criteria"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <PolarRadiusAxis tick={{ fontSize: 9, fill: 'var(--text-dim)' }} />
              <Radar name="Отказы" dataKey="Отказы"
                stroke="#EF4444" fill="#EF4444" fillOpacity={0.25} />
              <Radar name="Целевые" dataKey="Целевые"
                stroke="#10B981" fill="#10B981" fillOpacity={0.18} />
              <Tooltip {...TT} />
              <Legend iconSize={8} iconType="circle"
                wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Row 4: problems + recommendations */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
        gap: 14,
      }}>
        <div style={card}>
          <div style={sTitle}>Топ проблем на отказных звонках</div>
          {problems.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Нет данных</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {problems.slice(0, 10).map((e, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  gap: 10, padding: '7px 10px',
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.12)',
                  borderRadius: 8, minWidth: 0,
                }}>
                  <span style={{
                    fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4,
                    flex: 1, minWidth: 0,
                  }}>{e.problem}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#F87171',
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                  }}>{e.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={card}>
          <div style={sTitle}>Топ рекомендаций ИИ</div>
          {recs.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Нет данных</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recs.slice(0, 10).map((e, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  gap: 10, padding: '7px 10px',
                  background: 'rgba(16,185,129,0.06)',
                  border: '1px solid rgba(16,185,129,0.14)',
                  borderRadius: 8, minWidth: 0,
                }}>
                  <span style={{
                    fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4,
                    flex: 1, minWidth: 0,
                  }}>{e.recommendation}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#34D399',
                    background: 'rgba(16,185,129,0.15)',
                    border: '1px solid rgba(16,185,129,0.28)',
                    padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                  }}>{e.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}


/* -------- local filter bar (без call_class — он зафиксирован) -------- */

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 11px',
  background: 'var(--bg-elev)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', fontSize: 13,
  color: 'var(--text)', outline: 'none',
  transition: 'border-color .15s',
}
const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: 'var(--text-dim)',
  marginBottom: 5, display: 'block',
  textTransform: 'uppercase', letterSpacing: '0.5px',
}

function RefusalsFilterBar({
  value, onChange,
}: { value: RefusalsFilters; onChange: (f: RefusalsFilters) => void }) {
  const set = (k: keyof RefusalsFilters, v: string) => onChange({ ...value, [k]: v })
  const hasAny = Object.values(value).some(v => v !== '')
  const reset = () => onChange(EMPTY)

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '16px 20px',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <SlidersHorizontal size={13} color="var(--accent)" />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Фильтры</span>
        {hasAny && (
          <button onClick={reset} style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
            color: 'var(--danger)', background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
            padding: '3px 9px', cursor: 'pointer', fontSize: 11, fontWeight: 500,
          }}>
            <X size={11} /> Сбросить
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ minWidth: 140, flex: '1 1 140px' }}>
          <label style={lbl}>Дата с</label>
          <input style={{ ...inp, colorScheme: 'dark' }} type="date" value={value.from_date}
            onChange={e => set('from_date', e.target.value)} />
        </div>
        <div style={{ minWidth: 140, flex: '1 1 140px' }}>
          <label style={lbl}>Дата по</label>
          <input style={{ ...inp, colorScheme: 'dark' }} type="date" value={value.to_date}
            onChange={e => set('to_date', e.target.value)} />
        </div>
        <div style={{ minWidth: 200, flex: '2 1 200px' }}>
          <label style={lbl}>Тип отказа</label>
          <select style={inp} value={value.refusal_type}
            onChange={e => set('refusal_type', e.target.value)}>
            <option value="">Все типы</option>
            <option value="candidate_refused">Кандидат отказался</option>
            <option value="unsuitable_candidate">Неподходящий кандидат</option>
          </select>
        </div>
        <div style={{ minWidth: 160, flex: '1 1 160px' }}>
          <label style={lbl}>KPI рекрутера</label>
          <select style={inp} value={value.kpi_level}
            onChange={e => set('kpi_level', e.target.value)}>
            <option value="">Все уровни</option>
            <option value="high">Высокий</option>
            <option value="normal">Средний</option>
            <option value="low">Низкий</option>
          </select>
        </div>
      </div>
    </div>
  )
}
