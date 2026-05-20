import { useState } from 'react'
import { login as apiLogin } from '../api'

export function useAuth() {
  const [user, setUser] = useState<string | null>(
    () => localStorage.getItem('username')
  )

  const signIn = async (username: string, password: string) => {
    const { data } = await apiLogin(username, password)
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('username', data.username)
    setUser(data.username)
  }

  const signOut = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setUser(null)
  }

  return { user, signIn, signOut }
}
