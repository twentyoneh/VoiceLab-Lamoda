import type { ReactNode } from 'react'

interface Props {
  label: string
  value: string | number | null
  sub?: string
  icon?: ReactNode
  accent?: string
}

export default function KpiCard({ label, value, sub, icon, accent = 'var(--accent)' }: Props) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '16px 18px',
      boxShadow: 'var(--shadow)',
      display: 'flex', gap: 12, alignItems: 'flex-start',
      transition: 'background .2s',
      minWidth: 0,           // allow shrinking in flex/grid
      overflow: 'hidden',
    }}>
      {icon && (
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          background: `${accent}18`,
          border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent,
        }}>
          {icon}
        </div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, color: 'var(--text-dim)',
          marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1,
          wordBreak: 'break-word',
        }}>
          {value ?? '—'}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{sub}</div>
        )}
      </div>
    </div>
  )
}
