import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Calendar, Clock, AlertTriangle, CheckCircle, Download,
  Scale, X, Trash2, Hash, FileAudio, Award, Target, Lightbulb,
} from 'lucide-react'
import AudioPlayer from '../components/AudioPlayer'
import * as XLSX from 'xlsx'
import Layout from '../components/Layout'
import ScoreBadge from '../components/ScoreBadge'
import { getDialog, addDispute, removeDispute } from '../api'
import type { DialogDetail as DDType, Dispute, Criterion } from '../types'
import { CALL_CLASS_LABELS, KPI_LEVEL_LABELS, CRITERIA_LABELS } from '../types'

interface Props { username: string; onLogout: () => void }

const MAX_BASE = 100

// ─── Dispute Modal ───────────────────────────────────────────────────────────
interface ModalProps {
  existing: Dispute | null
  onSave: (score: number, comment: string) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}

function DisputeModal({ existing, onSave, onDelete, onClose }: ModalProps) {
  const [score, setScore] = useState(existing?.score?.toString() ?? '')
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    const s = parseFloat(score)
    if (isNaN(s) || s < 0 || s > 100) { setError('Введите балл от 0 до 100'); return }
    setError(''); setLoading(true)
    try { await onSave(s, comment); onClose() }
    catch { setError('Ошибка сохранения') }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    setLoading(true)
    try { await onDelete(); onClose() }
    catch { setError('Ошибка удаления') }
    finally { setLoading(false) }
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(4px)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
  const modal: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border-s)',
    borderRadius: 'var(--radius-lg)', padding: '28px 30px', width: 440,
    boxShadow: 'var(--shadow)', position: 'relative',
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: 'var(--bg-elev)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text)', outline: 'none',
    transition: 'border-color .15s',
  }
  const btn = (primary: boolean): React.CSSProperties => ({
    padding: '10px 20px', borderRadius: 'var(--radius-sm)', fontSize: 13,
    fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
    border: 'none', opacity: loading ? 0.6 : 1,
    background: primary ? 'var(--grad)' : 'var(--bg-elev)',
    color: primary ? '#fff' : 'var(--text-muted)',
    boxShadow: primary ? '0 4px 14px -4px rgba(99,102,241,0.5)' : 'none',
  })

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16, background: 'none',
          border: 'none', cursor: 'pointer', color: 'var(--text-dim)',
        }}><X size={16} /></button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Scale size={17} color="#F59E0B" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {existing ? 'Редактировать оспаривание' : 'Оспорить оценку'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>
              Скорректированный балл базы (0–100) заменит балл ИИ в отчётах
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>
            Скорректированный балл (0–100)
          </label>
          <input
            style={{ ...inp, width: 120 }} type="number" min={0} max={100} step={0.5}
            value={score} onChange={e => setScore(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
            placeholder="Например: 85"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>
            Обоснование (необязательно)
          </label>
          <textarea
            style={{ ...inp, resize: 'vertical', minHeight: 90, fontFamily: 'inherit' }}
            value={comment} onChange={e => setComment(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
            placeholder="Укажите причину оспаривания оценки ИИ..."
          />
        </div>

        {error && (
          <div style={{
            marginBottom: 14, padding: '8px 12px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8, color: '#F87171', fontSize: 12,
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
          {existing && (
            <button onClick={handleDelete} disabled={loading} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#F87171', cursor: loading ? 'not-allowed' : 'pointer',
              marginRight: 'auto',
            }}>
              <Trash2 size={13} /> Удалить
            </button>
          )}
          <button onClick={onClose} style={btn(false)} disabled={loading}>Отмена</button>
          <button onClick={handleSave} style={btn(true)} disabled={loading}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Criterion row ───────────────────────────────────────────────────────────
function CriterionRow({ c }: { c: Criterion }) {
  const max = c.max_score ?? 0
  const p = c.score != null && max > 0 ? (c.score / max) * 100 : 0
  const clr = p >= 80 ? 'var(--success)' : p >= 60 ? 'var(--accent)' : p >= 40 ? 'var(--warning)' : 'var(--danger)'
  const label = CRITERIA_LABELS[c.name] || c.name
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 9,
      background: p < 50 ? 'rgba(239,68,68,0.06)' : 'var(--row-alt)',
      border: `1px solid ${p < 50 ? 'rgba(239,68,68,0.15)' : 'var(--border)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
          {c.score ?? '—'}<span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>/{max}</span>
        </span>
      </div>
      <div style={{ height: 3, background: 'var(--track-bg)', borderRadius: 2 }}>
        <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(p, 100)}%`, background: clr }} />
      </div>
      {c.comment && (
        <p style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.45, marginTop: 5 }}>
          {c.comment}
        </p>
      )}
      {c.evidence && (
        <p style={{
          fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 5,
          fontStyle: 'italic', borderLeft: '2px solid var(--border)', paddingLeft: 7,
        }}>
          «{c.evidence}»
        </p>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DialogDetail({ username, onLogout }: Props) {
  const { callId } = useParams<{ callId: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<DDType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDispute, setShowDispute] = useState(false)

  const load = () => {
    if (!callId) return
    setLoading(true)
    getDialog(callId)
      .then(r => setData(r.data))
      .catch(() => setError('Звонок не найден'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [callId])

  const handleSaveDispute = async (score: number, comment: string) => {
    await addDispute(callId!, score, comment)
    load()
  }

  const handleDeleteDispute = async () => {
    await removeDispute(callId!)
    load()
  }

  const exportExcel = () => {
    if (!data) return
    const wb = XLSX.utils.book_new()
    const a = data.analysis
    const dispute = a?.dispute
    const info: (string | number | null)[][] = [
      ['Поле', 'Значение'],
      ['Call ID', data.session.call_id],
      ['Дата', data.session.call_date],
      ['Source file', data.session.source_file ?? ''],
      ['Тип звонка', a?.call_class ? (CALL_CLASS_LABELS[a.call_class] || a.call_class) : ''],
      ['KPI', a?.kpi_level ? (KPI_LEVEL_LABELS[a.kpi_level] || a.kpi_level) : ''],
      ['Уверенность', a?.confidence ?? ''],
      ['Балл (база)', a?.base_score ?? ''],
      ['Бонус', a?.bonus_score ?? ''],
      ['Всего', a?.total_score ?? ''],
      ...(dispute ? [
        ['Оспоренный балл', dispute.score],
        ['Обоснование', dispute.comment],
        ['Оспорил', dispute.username],
      ] : []),
      ['Резюме', a?.summary ?? ''],
      ['Проблемы', (a?.main_problems ?? []).join('; ')],
      ['Рекомендации', (a?.recommendations ?? []).join('; ')],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(info)
    ws1['!cols'] = [{ wch: 24 }, { wch: 70 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Информация')
    if (a?.criteria.length) {
      const cRows = [...a.criteria, ...a.bonus_criteria].map(c => ({
        'Критерий': CRITERIA_LABELS[c.name] || c.name,
        'Балл': c.score,
        'Макс': c.max_score,
        'Тип': a.bonus_criteria.includes(c) ? 'Бонус' : 'База',
        'Комментарий': c.comment,
        'Цитата': c.evidence,
      }))
      const ws2 = XLSX.utils.json_to_sheet(cRows)
      ws2['!cols'] = [{ wch: 32 }, { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 60 }, { wch: 60 }]
      XLSX.utils.book_append_sheet(wb, ws2, 'Критерии')
    }
    if (data.transcript.length) {
      const rows = data.transcript.map((t, i) => ({ '№': i + 1, 'Реплика': t.text }))
      const ws3 = XLSX.utils.json_to_sheet(rows)
      ws3['!cols'] = [{ wch: 5 }, { wch: 100 }]
      XLSX.utils.book_append_sheet(wb, ws3, 'Транскрипт')
    }
    XLSX.writeFile(wb, `call_${data.session.call_id}.xlsx`)
  }

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
    marginBottom: 14, overflow: 'hidden',
  }

  if (loading) return (
    <Layout title="Звонок" username={username} onLogout={onLogout}>
      <div style={{ color: 'var(--text-dim)', fontSize: 14, padding: 40, textAlign: 'center' }}>Загрузка...</div>
    </Layout>
  )
  if (error || !data) return (
    <Layout title="Звонок" username={username} onLogout={onLogout}>
      <div style={{ color: 'var(--danger)', fontSize: 14, padding: 40, textAlign: 'center' }}>{error || 'Ошибка загрузки'}</div>
    </Layout>
  )

  const { session, transcript, analysis } = data
  const dispute = analysis?.dispute ?? null
  const displayScore = dispute?.score ?? analysis?.base_score ?? null
  const pct = displayScore != null ? (displayScore / MAX_BASE) * 100 : 0
  const barColor = pct >= 85 ? 'var(--success)' : pct >= 70 ? 'var(--accent)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'

  const kpiLabel = analysis?.kpi_level ? (KPI_LEVEL_LABELS[analysis.kpi_level] || analysis.kpi_level) : '—'
  const classLabel = analysis?.call_class ? (CALL_CLASS_LABELS[analysis.call_class] || analysis.call_class) : '—'

  return (
    <Layout title={`Звонок ${session.call_id}`} username={username} onLogout={onLogout}>
      {showDispute && (
        <DisputeModal
          existing={dispute}
          onSave={handleSaveDispute}
          onDelete={handleDeleteDispute}
          onClose={() => setShowDispute(false)}
        />
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/dialogs')} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'transparent',
          border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 13,
        }}>
          <ArrowLeft size={14} /> Назад к звонкам
        </button>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {analysis && (
            <button onClick={() => setShowDispute(true)} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: dispute ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
              border: `1px solid ${dispute ? 'rgba(245,158,11,0.25)' : 'rgba(99,102,241,0.22)'}`,
              borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
              color: dispute ? '#FCD34D' : '#818CF8', fontSize: 12, fontWeight: 500,
            }}>
              <Scale size={13} />
              {dispute ? 'Оспаривание активно' : 'Оспорить'}
            </button>
          )}
          <button onClick={exportExcel} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.22)',
            borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
            color: '#818CF8', fontSize: 12, fontWeight: 500,
          }}>
            <Download size={13} /> Excel
          </button>
        </div>
      </div>

      {/* Session header */}
      <div style={{ ...card, padding: '18px 22px', marginBottom: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            <MetaItem icon={<Hash size={13} />} label="Call ID" value={session.call_id} mono />
            <MetaItem icon={<Calendar size={13} />} label="Дата" value={session.call_date?.slice(0, 10)} />
            <MetaItem icon={<Clock size={13} />} label="Время" value={session.call_date?.slice(11, 16)} />
            <MetaItem icon={<Target size={13} />} label="Тип" value={classLabel} />
            <MetaItem icon={<Award size={13} />} label="KPI" value={kpiLabel} />
            {analysis?.confidence != null && (
              <MetaItem icon={<Award size={13} />} label="Уверенность" value={`${(analysis.confidence * 100).toFixed(0)}%`} />
            )}
            {session.source_file && (
              <MetaItem icon={<FileAudio size={13} />} label="Файл" value={session.source_file} mono />
            )}
          </div>
          {analysis?.base_score != null && (
            <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
              {dispute ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <ScoreBadge score={dispute.score} maxScore={100} size="lg" />
                  <div style={{ fontSize: 10, color: '#FCD34D' }}>⚖ оспорено</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', textDecoration: 'line-through' }}>
                    ИИ: {analysis.base_score}
                  </div>
                </div>
              ) : (
                <>
                  <ScoreBadge score={analysis.base_score} maxScore={100} size="lg" />
                  <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 4 }}>
                    база из {MAX_BASE}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Audio placeholder */}
      <div style={{ marginBottom: 14 }}>
        <AudioPlayer sourceFile={session.source_file} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 14, alignItems: 'start' }}>

        {/* Transcript */}
        <div style={{ ...card }}>
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Транскрипт</span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{transcript.length} реплик</span>
          </div>
          <div style={{
            padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8,
            maxHeight: '72vh', overflowY: 'auto',
          }}>
            {transcript.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: 24 }}>
                Транскрипт недоступен
              </div>
            ) : transcript.map((turn, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  fontSize: 10, color: 'var(--text-dim)', fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                  width: 24, textAlign: 'right', paddingTop: 9,
                }}>{i + 1}</div>
                <div style={{
                  flex: 1,
                  background: 'var(--row-alt)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '8px 12px', fontSize: 13,
                  color: 'var(--text-muted)', lineHeight: 1.55,
                }}>{turn.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {analysis ? (
            <>
              {/* Score */}
              <div style={{ ...card, padding: '18px 20px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {dispute ? 'Оспоренный балл' : 'Балл (база)'}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 38, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
                    {displayScore ?? '—'}
                  </span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>/ {MAX_BASE}</span>
                  {dispute && (
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 4 }}>
                      (ИИ: {analysis.base_score})
                    </span>
                  )}
                </div>
                <div style={{ height: 7, background: 'var(--track-bg)', borderRadius: 4 }}>
                  <div style={{
                    height: '100%', borderRadius: 4, width: `${Math.min(pct, 100)}%`,
                    background: barColor, transition: 'width .5s',
                    boxShadow: `0 0 12px -2px ${barColor}`,
                  }} />
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 6 }}>
                  {pct.toFixed(0)}% от максимума
                </div>
                {analysis.bonus_score != null && analysis.bonus_score > 0 && (
                  <div style={{
                    marginTop: 12, padding: '8px 10px',
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Дополнительные баллы</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#34D399' }}>
                      +{analysis.bonus_score}<span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> / 60</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Dispute */}
              {dispute && (
                <div style={{
                  ...card, padding: '14px 18px',
                  background: 'rgba(245,158,11,0.05)',
                  borderColor: 'rgba(245,158,11,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                    <Scale size={13} color="#F59E0B" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#FCD34D' }}>Оспаривание активно</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {dispute.comment || <span style={{ color: 'var(--text-dim)' }}>Без комментария</span>}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>
                    {dispute.username} · {new Date(dispute.created_at).toLocaleString('ru')}
                  </div>
                </div>
              )}

              {/* Summary */}
              {analysis.summary && (
                <div style={{ ...card, padding: '16px 20px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                    Резюме ИИ
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65 }}>
                    {analysis.summary}
                  </p>
                </div>
              )}

              {/* Problems */}
              {analysis.main_problems?.length > 0 ? (
                <div style={{
                  ...card, padding: '14px 18px',
                  background: 'rgba(239,68,68,0.05)',
                  borderColor: 'rgba(239,68,68,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <AlertTriangle size={13} color="var(--danger)" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#F87171' }}>
                      Проблемы
                    </span>
                  </div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {analysis.main_problems.map((e, i) => (
                      <li key={i} style={{
                        fontSize: 12, color: '#FCA5A5', padding: '6px 10px',
                        background: 'rgba(239,68,68,0.1)', borderRadius: 7,
                        border: '1px solid rgba(239,68,68,0.15)',
                      }}>{e}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div style={{
                  ...card, padding: '12px 16px',
                  background: 'rgba(16,185,129,0.05)',
                  borderColor: 'rgba(16,185,129,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#34D399', fontSize: 13 }}>
                    <CheckCircle size={14} /> Проблем не зафиксировано
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations?.length > 0 && (
                <div style={{ ...card, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <Lightbulb size={13} color="#FCD34D" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                      Рекомендации
                    </span>
                  </div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {analysis.recommendations.map((e, i) => (
                      <li key={i} style={{
                        fontSize: 12, color: 'var(--text-muted)', padding: '6px 10px',
                        background: 'rgba(99,102,241,0.06)', borderRadius: 7,
                        border: '1px solid rgba(99,102,241,0.12)', lineHeight: 1.5,
                      }}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Base criteria */}
              <div style={{ ...card, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
                  Базовые критерии (8)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {analysis.criteria.map((c, i) => <CriterionRow key={i} c={c} />)}
                </div>
              </div>

              {/* Bonus criteria */}
              {analysis.bonus_criteria.length > 0 && (
                <div style={{ ...card, padding: '16px 18px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Award size={11} color="#34D399" /> Дополнительные критерии
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {analysis.bonus_criteria.map((c, i) => <CriterionRow key={i} c={c} />)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ ...card, padding: '20px', color: 'var(--text-dim)', fontSize: 13, textAlign: 'center' }}>
              ИИ-анализ недоступен для этого звонка
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

function MetaItem({ icon, label, value, mono }: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-dim)', fontSize: 11, marginBottom: 3 }}>
        {icon} {label}
      </div>
      <div style={{
        fontSize: mono ? 11 : 13, fontWeight: 500, color: 'var(--text)',
        fontFamily: mono ? 'monospace' : 'inherit',
        background: mono ? 'rgba(99,102,241,0.08)' : 'transparent',
        border: mono ? '1px solid rgba(99,102,241,0.15)' : 'none',
        borderRadius: mono ? 5 : 0, padding: mono ? '2px 7px' : 0,
        letterSpacing: mono ? '0.2px' : 'normal',
        maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</div>
    </div>
  )
}
