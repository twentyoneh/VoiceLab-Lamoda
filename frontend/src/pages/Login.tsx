import { useState } from 'react'
import { Mic2 } from 'lucide-react'

interface Props {
  onLogin: (username: string, password: string) => Promise<void>
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin(username, password)
    } catch {
      setError('Неверный логин или пароль')
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', marginTop: 6,
    background: 'var(--bg-elev)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--text)', outline: 'none',
    transition: 'border-color .15s',
  }

  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--accent)'
  }
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--border)'
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        top: -200, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none',
      }} />

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-s)',
        borderRadius: 'var(--radius-lg)', padding: '40px', width: 380,
        boxShadow: 'var(--shadow)', position: 'relative',
        inset: '0 1px 0 rgba(255,255,255,0.06)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--grad)', marginBottom: 16,
            boxShadow: '0 8px 24px -8px rgba(99,102,241,0.6)',
          }}>
            <Mic2 size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px', marginBottom: 6 }}>
            VoiceLab
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>Аналитика диалогов операторов</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Логин</label>
            <input style={inp} value={username} onChange={e => setUsername(e.target.value)}
              placeholder="admin" required onFocus={focusStyle} onBlur={blurStyle} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Пароль</label>
            <input style={inp} type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required onFocus={focusStyle} onBlur={blurStyle} />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, padding: '10px 14px', color: '#F87171',
              fontSize: 13, marginBottom: 16, textAlign: 'center',
            }}>{error}</div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? 'rgba(99,102,241,0.5)' : 'var(--grad)',
              color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 8px 24px -8px rgba(99,102,241,0.6)',
              transition: 'opacity .15s',
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

      </div>
    </div>
  )
}
