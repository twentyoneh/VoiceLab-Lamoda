import { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'dark' | 'light'

interface ThemeCtx {
  theme: Theme
  toggle: () => void
  /** Recharts tooltip style (reads from CSS vars is not possible in JS objects) */
  ttStyle: React.CSSProperties
  /** Recharts grid stroke */
  gridStroke: string
  /** Recharts cursor fill */
  cursorFill: string
}

export const ThemeContext = createContext<ThemeCtx>({
  theme: 'dark',
  toggle: () => {},
  ttStyle: {},
  gridStroke: 'rgba(255,255,255,0.05)',
  cursorFill: 'rgba(255,255,255,0.03)',
})

export function useTheme() {
  return useContext(ThemeContext)
}

function buildCtx(theme: Theme, toggle: () => void): ThemeCtx {
  const isDark = theme === 'dark'
  return {
    theme,
    toggle,
    ttStyle: {
      background: isDark ? '#13131D' : '#FFFFFF',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
      borderRadius: 10,
      fontSize: 12,
      color: isDark ? '#F4F4F8' : '#0F172A',
    },
    gridStroke: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    cursorFill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
  }
}

export function useThemeState() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('vl-theme') as Theme | null
    return saved === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
    localStorage.setItem('vl-theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return buildCtx(theme, toggle)
}
