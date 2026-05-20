import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ThemeContext, useThemeState } from './hooks/useTheme'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Dialogs from './pages/Dialogs'
import DialogDetail from './pages/DialogDetail'
import Refusals from './pages/Refusals'

function PrivateRoute({ children, username }:
  { children: React.ReactNode; username: string }) {
  if (!username) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { user, signIn, signOut } = useAuth()
  const themeCtx = useThemeState()

  return (
    <ThemeContext.Provider value={themeCtx}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            user ? <Navigate to="/" replace /> : <Login onLogin={signIn} />
          } />

          <Route path="/" element={
            <PrivateRoute username={user || ''}>
              <Dashboard username={user!} onLogout={signOut} />
            </PrivateRoute>
          } />

          <Route path="/dialogs" element={
            <PrivateRoute username={user || ''}>
              <Dialogs username={user!} onLogout={signOut} />
            </PrivateRoute>
          } />

          <Route path="/refusals" element={
            <PrivateRoute username={user || ''}>
              <Refusals username={user!} onLogout={signOut} />
            </PrivateRoute>
          } />

          <Route path="/dialogs/:callId" element={
            <PrivateRoute username={user || ''}>
              <DialogDetail username={user!} onLogout={signOut} />
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  )
}
