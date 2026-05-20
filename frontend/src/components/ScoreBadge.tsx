interface Props {
  score: number | null
  maxScore?: number
  size?: 'sm' | 'md' | 'lg'
}

function getColor(pct: number): { bg: string; text: string; border: string } {
  if (pct >= 85) return { bg: 'rgba(16,185,129,0.15)', text: '#34D399', border: 'rgba(16,185,129,0.3)' }
  if (pct >= 70) return { bg: 'rgba(99,102,241,0.15)', text: '#818CF8', border: 'rgba(99,102,241,0.3)' }
  if (pct >= 50) return { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D', border: 'rgba(245,158,11,0.3)' }
  return { bg: 'rgba(239,68,68,0.15)', text: '#F87171', border: 'rgba(239,68,68,0.3)' }
}

export default function ScoreBadge({ score, maxScore = 100, size = 'md' }: Props) {
  if (score === null || score === undefined)
    return <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>

  const pct = (score / maxScore) * 100
  const { bg, text, border } = getColor(pct)
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 15 : 12
  const padding = size === 'sm' ? '2px 8px' : size === 'lg' ? '5px 14px' : '3px 10px'

  return (
    <span style={{
      background: bg, color: text, border: `1px solid ${border}`,
      borderRadius: 20, padding, fontSize, fontWeight: 600,
      whiteSpace: 'nowrap', letterSpacing: '0.2px',
    }}>
      {score}
    </span>
  )
}
