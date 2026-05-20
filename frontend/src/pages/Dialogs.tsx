import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ExternalLink, AlertTriangle, CheckCircle, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import Layout from '../components/Layout'
import FilterBar from '../components/FilterBar'
import ScoreBadge from '../components/ScoreBadge'
import { getDialogs } from '../api'
import type { DialogListItem, Filters } from '../types'
import { CALL_CLASS_LABELS, KPI_LEVEL_LABELS } from '../types'

const EMPTY: Filters = {
  from_date: '', to_date: '', call_class: '', kpi_level: '',
  min_score: '', max_score: '', search: '',
}

const KPI_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  high: { bg: 'rgba(16,185,129,0.12)', fg: '#34D399', border: 'rgba(16,185,129,0.3)' },
  normal: { bg: 'rgba(99,102,241,0.12)', fg: '#818CF8', border: 'rgba(99,102,241,0.3)' },
  low: { bg: 'rgba(239,68,68,0.12)', fg: '#F87171', border: 'rgba(239,68,68,0.3)' },
}

interface Props { username: string; onLogout: () => void }

export default function Dialogs({ username, onLogout }: Props) {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<DialogListItem[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [sortBy, setSortBy] = useState('call_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const buildParams = (pg: number, sz: number) => ({
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
    page: pg, size: sz, sort_by: sortBy, sort_dir: sortDir,
  })

  useEffect(() => {
    setLoading(true)
    getDialogs(buildParams(page, 25) as Record<string, string | number>)
      .then(r => { setItems(r.data.items); setTotal(r.data.total); setPages(r.data.pages) })
      .finally(() => setLoading(false))
  }, [filters, page, sortBy, sortDir])

  useEffect(() => { setPage(1) }, [filters])

  const exportExcel = async () => {
    setExporting(true)
    try {
      const r = await getDialogs(buildParams(1, 2000) as Record<string, string | number>)
      const rows = r.data.items.map(d => ({
        'Дата': d.call_date?.slice(0, 10),
        'Время': d.call_date?.slice(11, 16),
        'Call ID': d.call_id,
        'Тип звонка': d.call_class ? (CALL_CLASS_LABELS[d.call_class] || d.call_class) : '',
        'KPI': d.kpi_level ? (KPI_LEVEL_LABELS[d.kpi_level] || d.kpi_level) : '',
        'Балл (база)': d.base_score,
        'Бонус': d.bonus_score,
        'Всего': d.total_score,
        'Уверенность': d.confidence,
        'Проблем': d.problems_count,
        'Резюме ИИ': d.summary || '',
        'Source file': d.source_file || '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [
        { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 24 }, { wch: 10 },
        { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 60 }, { wch: 42 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Звонки')
      XLSX.writeFile(wb, `voicelab_calls_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally {
      setExporting(false)
    }
  }

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }
  const sortIcon = (col: string) => sortBy === col
    ? <span style={{ color: 'var(--accent)', marginLeft: 3 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>
    : null

  const th: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontSize: 10,
    fontWeight: 600, color: 'var(--text-dim)', background: 'var(--bg-elev)',
    borderBottom: '1px solid var(--border)', textTransform: 'uppercase',
    letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = {
    padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)',
    borderBottom: '1px solid var(--row-border)', verticalAlign: 'top',
  }

  const pgBtn = (disabled: boolean): React.CSSProperties => ({
    background: disabled ? 'transparent' : 'var(--bg-card-h)',
    border: '1px solid var(--border)', borderRadius: 8,
    padding: '6px 10px', cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', color: disabled ? 'var(--text-dim)' : 'var(--text)',
    opacity: disabled ? 0.4 : 1,
  })

  return (
    <Layout title="Звонки" username={username} onLogout={onLogout}>
      <FilterBar value={filters} onChange={setFilters} showSearch />

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-elev)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {loading ? 'Загрузка...' : (
              <>Найдено: <b style={{ color: 'var(--text)' }}>{total.toLocaleString('ru')}</b> звонков</>
            )}
          </span>
          <button
            onClick={exportExcel} disabled={exporting || total === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 8, padding: '7px 14px', cursor: exporting || total === 0 ? 'not-allowed' : 'pointer',
              color: '#818CF8', fontSize: 12, fontWeight: 500, opacity: exporting || total === 0 ? 0.6 : 1,
            }}
          >
            <Download size={13} /> {exporting ? 'Выгрузка...' : 'Excel'}
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th} onClick={() => handleSort('call_date')}>
                  Дата {sortIcon('call_date')}
                </th>
                <th style={th}>Время</th>
                <th style={th}>Call ID</th>
                <th style={th} onClick={() => handleSort('call_class')}>
                  Тип звонка {sortIcon('call_class')}
                </th>
                <th style={th} onClick={() => handleSort('kpi_level')}>
                  KPI {sortIcon('kpi_level')}
                </th>
                <th style={{ ...th, textAlign: 'center' }} onClick={() => handleSort('base_score')}>
                  Балл {sortIcon('base_score')}
                </th>
                <th style={{ ...th, textAlign: 'center' }}>Бонус</th>
                <th style={{ ...th, textAlign: 'center' }}>Проблем</th>
                <th style={th}>Резюме</th>
                <th style={{ ...th, textAlign: 'center' }}>Открыть</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d, i) => {
                const kpiClr = d.kpi_level ? KPI_COLORS[d.kpi_level] : null
                return (
                  <tr key={d.call_id}
                    style={{ background: i % 2 === 0 ? 'transparent' : 'var(--row-alt)', cursor: 'pointer' }}
                    onDoubleClick={() => navigate(`/dialogs/${d.call_id}`)}>
                    <td style={{ ...td, color: 'var(--text)', fontWeight: 500 }}>{d.call_date?.slice(0, 10)}</td>
                    <td style={td}>{d.call_date?.slice(11, 16)}</td>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: 'var(--text-dim)' }}>
                      {d.call_id}
                    </td>
                    <td style={td}>
                      {d.call_class ? (
                        <span style={{
                          background: 'rgba(99,102,241,0.12)', color: '#818CF8',
                          border: '1px solid rgba(99,102,241,0.2)',
                          borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 500,
                        }}>{CALL_CLASS_LABELS[d.call_class] || d.call_class}</span>
                      ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>
                    <td style={td}>
                      {kpiClr ? (
                        <span style={{
                          background: kpiClr.bg, color: kpiClr.fg,
                          border: `1px solid ${kpiClr.border}`,
                          borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 500,
                        }}>{KPI_LEVEL_LABELS[d.kpi_level!] || d.kpi_level}</span>
                      ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <ScoreBadge score={d.base_score} maxScore={100} size="sm" />
                    </td>
                    <td style={{ ...td, textAlign: 'center', fontSize: 12 }}>
                      {d.bonus_score != null && d.bonus_score > 0 ? (
                        <span style={{
                          color: '#34D399', fontWeight: 600,
                          background: 'rgba(16,185,129,0.1)',
                          border: '1px solid rgba(16,185,129,0.2)',
                          borderRadius: 20, padding: '2px 8px',
                        }}>+{d.bonus_score}</span>
                      ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {d.problems_count > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <AlertTriangle size={13} color="var(--danger)" />
                          <span style={{ color: '#F87171', fontSize: 11, fontWeight: 600 }}>{d.problems_count}</span>
                        </div>
                      ) : (
                        <CheckCircle size={14} color="var(--success)" />
                      )}
                    </td>
                    <td style={{ ...td, maxWidth: 260 }}>
                      {d.summary ? (
                        <span style={{
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          fontSize: 12, lineHeight: 1.4,
                        }}>{d.summary}</span>
                      ) : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <button
                        onClick={() => navigate(`/dialogs/${d.call_id}`)}
                        title="Открыть карточку"
                        style={{
                          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                          borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: '#818CF8',
                          display: 'inline-flex', alignItems: 'center', transition: 'all .15s',
                        }}
                      >
                        <ExternalLink size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div style={{
            padding: '12px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end',
            background: 'var(--bg-elev)',
          }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1} style={pgBtn(page === 1)}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Стр. <b style={{ color: 'var(--text)' }}>{page}</b> из {pages}
            </span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages} style={pgBtn(page === pages)}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
