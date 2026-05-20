import { Headphones } from 'lucide-react'

interface Props {
  sourceFile: string | null
}

/**
 * Audio playback placeholder.
 * Recordings for lamoda calls are not yet wired to a streaming source —
 * we only have the original mp3 filename in `call_transcriptions.source_file`.
 * When a storage source is added, replace this with a real player.
 */
export default function AudioPlayer({ sourceFile }: Props) {
  return (
    <div style={{
      background: 'rgba(100,116,139,0.06)',
      border: '1px dashed rgba(100,116,139,0.25)',
      borderRadius: 'var(--radius)',
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-dim)', flexShrink: 0,
      }}>
        <Headphones size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
          Запись звонка
        </div>
        <div style={{
          fontSize: 11, color: 'var(--text-dim)', marginTop: 2,
          fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {sourceFile || 'файл не указан'}
        </div>
      </div>
    </div>
  )
}
