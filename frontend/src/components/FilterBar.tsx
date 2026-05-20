import { useEffect, useState } from 'react'
import { getCallClasses, getKpiLevels } from '../api'
import { SlidersHorizontal, X } from 'lucide-react'
import type { Filters, FilterOption } from '../types'

interface Props {
  value: Filters
  onChange: (f: Filters) => void
  showSearch?: boolean
}

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

export default function FilterBar({ value, onChange, showSearch }: Props) {
  const [callClasses, setCallClasses] = useState<FilterOption[]>([])
  const [kpiLevels, setKpiLevels] = useState<FilterOption[]>([])

  useEffect(() => {
    getCallClasses().then(r => setCallClasses(r.data))
    getKpiLevels().then(r => setKpiLevels(r.data))
  }, [])

  const set = (k: keyof Filters, v: string) => onChange({ ...value, [k]: v })
  const hasAny = Object.values(value).some(v => v !== '')
  const reset = () => onChange({
    from_date: '', to_date: '', call_class: '', kpi_level: '',
    min_score: '', max_score: '', search: '',
  })

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = 'var(--accent)'
    e.target.style.background = 'var(--bg-card)'
  }
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = 'var(--border)'
    e.target.style.background = 'var(--bg-elev)'
  }

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
        {showSearch && (
          <div style={{ minWidth: 180, flex: '1 1 180px' }}>
            <label style={lbl}>Поиск</label>
            <input style={inp} placeholder="call_id / резюме / файл..." value={value.search || ''}
              onChange={e => set('search', e.target.value)}
              onFocus={focusStyle} onBlur={blurStyle} />
          </div>
        )}
        <div style={{ minWidth: 140, flex: '1 1 140px' }}>
          <label style={lbl}>Дата с</label>
          <input style={{ ...inp, colorScheme: 'dark' }} type="date" value={value.from_date}
            onChange={e => set('from_date', e.target.value)}
            onFocus={focusStyle} onBlur={blurStyle} />
        </div>
        <div style={{ minWidth: 140, flex: '1 1 140px' }}>
          <label style={lbl}>Дата по</label>
          <input style={{ ...inp, colorScheme: 'dark' }} type="date" value={value.to_date}
            onChange={e => set('to_date', e.target.value)}
            onFocus={focusStyle} onBlur={blurStyle} />
        </div>
        <div style={{ minWidth: 200, flex: '2 1 200px' }}>
          <label style={lbl}>Тип звонка</label>
          <select style={inp} value={value.call_class}
            onChange={e => set('call_class', e.target.value)}
            onFocus={focusStyle} onBlur={blurStyle}>
            <option value="">Все типы</option>
            {callClasses.map(c => (
              <option key={c.value} value={c.value}>{c.label} ({c.count})</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 160, flex: '1 1 160px' }}>
          <label style={lbl}>KPI</label>
          <select style={inp} value={value.kpi_level}
            onChange={e => set('kpi_level', e.target.value)}
            onFocus={focusStyle} onBlur={blurStyle}>
            <option value="">Все уровни</option>
            {kpiLevels.map(c => (
              <option key={c.value} value={c.value}>{c.label} ({c.count})</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 96, flex: '0 1 96px' }}>
          <label style={lbl}>Балл от</label>
          <input style={inp} type="number" min={0} max={100} placeholder="0"
            value={value.min_score} onChange={e => set('min_score', e.target.value)}
            onFocus={focusStyle} onBlur={blurStyle} />
        </div>
        <div style={{ minWidth: 96, flex: '0 1 96px' }}>
          <label style={lbl}>Балл до</label>
          <input style={inp} type="number" min={0} max={100} placeholder="100"
            value={value.max_score} onChange={e => set('max_score', e.target.value)}
            onFocus={focusStyle} onBlur={blurStyle} />
        </div>
      </div>
    </div>
  )
}
