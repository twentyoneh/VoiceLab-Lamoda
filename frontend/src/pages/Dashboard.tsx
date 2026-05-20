import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import { MessageSquare, Star, AlertTriangle, TrendingUp, Target, Award } from 'lucide-react'
import Layout from '../components/Layout'
import KpiCard from '../components/KpiCard'
import FilterBar from '../components/FilterBar'
import { useTheme } from '../hooks/useTheme'
import {
  getOverview, getByDate, getByCallClass, getByKpiLevel,
  getCriteria, getProblems, getScoreDistribution,
} from '../api'
import type {
  Overview, DateStat, CallClassStat, KpiLevelStat,
  CriteriaStat, ProblemStat, ScoreRange, Filters,
} from '../types'
import { CALL_CLASS_LABELS, KPI_LEVEL_LABELS, CRITERIA_LABELS } from '../types'

const PALETTE = ['#6366F1', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899']
const KPI_COLORS: Record<string, string> = {
  high: '#10B981',
  normal: '#6366F1',
  low: '#EF4444',
  unknown: '#64748B',
}
const EMPTY: Filters = {
  from_date: '', to_date: '', call_class: '', kpi_level: '',
  min_score: '', max_score: '',
}

interface Props { username: string; onLogout: () => void }

const renderLegend = (value: string) => (
  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
    {value.length > 22 ? value.slice(0, 22) + '…' : value}
  </span>
)

export default function Dashboard({ username, onLogout }: Props) {
  const { ttStyle, gridStroke, cursorFill } = useTheme()
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [byDate, setByDate] = useState<DateStat[]>([])
  const [byClass, setByClass] = useState<CallClassStat[]>([])
  const [byKpi, setByKpi] = useState<KpiLevelStat[]>([])
  const [criteria, setCriteria] = useState<CriteriaStat[]>([])
  const [problems, setProblems] = useState<ProblemStat[]>([])
  const [distribution, setDistribution] = useState<ScoreRange[]>([])

  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))

  useEffect(() => {
    getOverview(params).then(r => setOverview(r.data))
    getByDate(params).then(r => setByDate(r.data))
    getByCallClass(params).then(r => setByClass(r.data))
    getByKpiLevel(params).then(r => setByKpi(r.data))
    getCriteria(params).then(r => setCriteria(r.data))
    getProblems(params).then(r => setProblems(r.data))
    getScoreDistribution(params).then(r => setDistribution(r.data))
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

  // map call_class codes → readable labels for charts
  const classChartData = byClass.map(c => ({
    ...c,
    label: CALL_CLASS_LABELS[c.call_class] || c.call_class,
  }))
  const kpiChartData = byKpi.map(c => ({
    ...c,
    label: KPI_LEVEL_LABELS[c.kpi_level] || c.kpi_level,
  }))

  const criteriaChartData = criteria.slice(0, 8).map(c => ({
    ...c,
    label: CRITERIA_LABELS[c.criteria] || c.criteria,
  }))

  return (
    <Layout title="Дашборд" username={username} onLogout={onLogout}>
      <FilterBar value={filters} onChange={setFilters} />

      {/* KPI */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 14, marginBottom: 20,
      }}>
        <KpiCard label="Всего звонков" value={overview?.total_calls ?? '—'}
          icon={<MessageSquare size={17} />} accent="var(--accent)" />
        <KpiCard label="Проанализировано" value={overview?.analyzed_calls ?? '—'}
          icon={<TrendingUp size={17} />} accent="var(--success)" />
        <KpiCard label="Средний балл (база)"
          value={overview?.avg_base_score != null ? `${overview.avg_base_score} / 100` : '—'}
          icon={<Star size={17} />} accent="var(--warning)" />
        <KpiCard label="Бонус (ср.)"
          value={overview?.avg_bonus_score != null ? `+${overview.avg_bonus_score} / 60` : '—'}
          icon={<Award size={17} />} accent="var(--accent-2)" />
        <KpiCard label="Высокий KPI" value={overview?.high_kpi_count ?? '—'}
          icon={<TrendingUp size={17} />} accent="var(--success)" />
        <KpiCard label="Низкий KPI" value={overview?.low_kpi_count ?? '—'}
          icon={<AlertTriangle size={17} />} accent="var(--danger)" />
        <KpiCard label="Целевые звонки" value={overview?.target_call_count ?? '—'}
          icon={<Target size={17} />} accent="var(--accent-3)" />
      </div>

      {/* Row 1: trend + call_class pie */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,360px)',
        gap: 14, marginBottom: 14,
      }}>
        <div style={card}>
          <div style={sTitle}>Динамика звонков по дням</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={byDate} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" {...ax} />
              <YAxis {...ax} />
              <YAxis yAxisId="r" orientation="right" {...ax} />
              <Tooltip {...TT}
                formatter={(v: number, n: string) => [v, n === 'count' ? 'Звонки' : 'Ср. балл']} />
              <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2}
                dot={{ r: 3, fill: '#6366F1', strokeWidth: 0 }} name="count" />
              <Line type="monotone" dataKey="avg_score" stroke="#10B981" strokeWidth={2}
                dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }} name="avg_score" yAxisId="r" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <div style={sTitle}>По типу звонка</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={classChartData} dataKey="count" nameKey="label"
                cx="50%" cy="43%"
                outerRadius={80} innerRadius={34}
                paddingAngle={2}
                label={({ percent }) => percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : ''}
                labelLine={false}
              >
                {classChartData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip {...TT} formatter={(v: number) => [v, 'Звонков']} />
              <Legend
                iconSize={8} iconType="circle"
                formatter={renderLegend}
                wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: criteria + (distribution, kpi, problems) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
        gap: 14,
      }}>
        <div style={card}>
          <div style={sTitle}>Слабые места — средний балл по критериям</div>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart
              data={criteriaChartData} layout="vertical"
              margin={{ top: 0, right: 16, left: 170, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis type="number" {...ax} domain={[0, 20]} />
              <YAxis
                type="category" dataKey="label" width={165}
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                axisLine={false} tickLine={false}
              />
              <Tooltip {...TT} formatter={(v: number, _n: string, item: any) => [
                `${Number(v).toFixed(1)} / ${item.payload.max_possible}`,
                'Ср. балл',
              ]} />
              <Bar dataKey="avg_score" radius={[0, 4, 4, 0]}>
                {criteriaChartData.map((c, i) => {
                  const pct = c.max_possible > 0 ? (c.avg_score / c.max_possible) * 100 : 0
                  return <Cell key={i} fill={pct >= 80 ? '#10B981' : pct >= 60 ? '#6366F1' : pct >= 40 ? '#F59E0B' : '#EF4444'} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div style={card}>
            <div style={sTitle}>Распределение по баллам (база)</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={distribution} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="range" {...ax} />
                <YAxis {...ax} />
                <Tooltip {...TT} formatter={(v: number) => [v, 'Звонков']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distribution.map((d, i) => {
                    const c = d.range === '80-100' ? '#10B981'
                      : d.range === '60-79' ? '#6366F1'
                      : d.range === '40-59' ? '#8B5CF6'
                      : d.range === '20-39' ? '#F59E0B' : '#EF4444'
                    return <Cell key={i} fill={c} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={card}>
            <div style={sTitle}>По уровню KPI</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={kpiChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="label" {...ax} />
                <YAxis {...ax} />
                <Tooltip {...TT} formatter={(v: number) => [v, 'Звонков']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {kpiChartData.map((d, i) => (
                    <Cell key={i} fill={KPI_COLORS[d.kpi_level] || '#6366F1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {problems.length > 0 && (
            <div style={card}>
              <div style={sTitle}>Топ проблем (по mentions)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
                {problems.slice(0, 6).map((e, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    gap: 10, padding: '7px 10px',
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.12)',
                    borderRadius: 8, minWidth: 0,
                  }}>
                    <span style={{
                      fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4,
                      flex: 1, minWidth: 0, overflow: 'hidden',
                    }}>
                      {e.problem}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: '#F87171',
                      background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)',
                      padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                    }}>{e.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
