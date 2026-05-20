import { NavLink, useNavigate } from 'react-router-dom'
import { MessageSquare, Home, LogOut, Mic2, Sun, Moon, UserX } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

const NAV = [
  { to: '/', label: 'Дашборд', icon: Home, end: true },
  { to: '/dialogs', label: 'Диалоги', icon: MessageSquare },
  { to: '/refusals', label: 'Отказы', icon: UserX },
]

interface Props {
  children: React.ReactNode
  title: string
  username: string
  onLogout: () => void
}

export default function Layout({ children, title, username, onLogout }: Props) {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const isLight = theme === 'light'

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Sidebar */}
      <aside style={{
        width: 228, flexShrink: 0,
        background: 'var(--bg-elev)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'background .2s, border-color .2s',
      }}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'var(--grad)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px -4px rgba(99,102,241,0.6)',
            }}>
              <Mic2 size={17} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text)' }}>
                VoiceLab
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>
                HR-аналитика звонков
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                marginBottom: 2, textDecoration: 'none',
                fontSize: 13.5, fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                transition: 'all .15s',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} color={isActive ? '#818CF8' : 'var(--text-dim)'} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User / logout */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>
            Вошёл как <span style={{ color: 'var(--text-muted)' }}>{username}</span>
          </div>
          <button
            onClick={() => { onLogout(); navigate('/login') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
              color: 'var(--text-dim)', fontSize: 12, width: '100%',
              transition: 'all .15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
            }}
          >
            <LogOut size={13} /> Выйти
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <div style={{
          height: 54, flexShrink: 0,
          background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(8,8,12,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
          padding: '0 24px', display: 'flex', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 10,
          transition: 'background .2s',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{title}</span>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={isLight ? 'Тёмная тема' : 'Светлая тема'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 8,
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.2)',
              cursor: 'pointer', color: '#818CF8',
              transition: 'all .2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.2)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.1)'
            }}
          >
            {isLight ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
