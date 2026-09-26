'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { users, SafeUser, authenticateUser, registerUser, UserRole, getSafeUser } from '@/data/auth'

interface AuthContextValue {
  currentUser: SafeUser | null
  login: (emailOrId: string, password: string) => Promise<SafeUser>
  logout: () => void
  signup: (
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ) => Promise<SafeUser>
  allUsers: SafeUser[]
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('campus_connect_user')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed && parsed.id) return parsed
        }
      } catch {
        // Ignore
      }
    }
    return null
  })

  useEffect(() => {
    try {
      const stored = localStorage.getItem('campus_connect_user')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && parsed.id) {
          setCurrentUser(parsed)
        }
      }
    } catch {
      // Ignore localStorage issues
    }
  }, [])

  const login = async (emailOrId: string, password: string): Promise<SafeUser> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', emailOrId, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid credentials')
      }
      setCurrentUser(data.user)
      if (typeof window !== 'undefined') {
        localStorage.setItem('campus_connect_user', JSON.stringify(data.user))
      }
      return data.user
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes('Invalid') ||
          err.message.includes('required') ||
          err.message.includes('credentials'))
      ) {
        throw err
      }
      const user = authenticateUser(emailOrId, password)
      if (!user) {
        throw new Error('Invalid email/ID or password')
      }
      setCurrentUser(user)
      if (typeof window !== 'undefined') {
        localStorage.setItem('campus_connect_user', JSON.stringify(user))
      }
      return user
    }
  }

  const logout = () => {
    setCurrentUser(null)
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('campus_connect_user')
      }
    } catch {
      // Ignore
    }
  }

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ): Promise<SafeUser> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', name, email, password, role }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create account')
      }
      setCurrentUser(data.user)
      if (typeof window !== 'undefined') {
        localStorage.setItem('campus_connect_user', JSON.stringify(data.user))
      }
      return data.user
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes('exists') ||
          err.message.includes('Password') ||
          err.message.includes('required') ||
          err.message.includes('Role') ||
          err.message.includes('role'))
      ) {
        throw err
      }
      const user = registerUser(name, email, password, role)
      setCurrentUser(user)
      if (typeof window !== 'undefined') {
        localStorage.setItem('campus_connect_user', JSON.stringify(user))
      }
      return user
    }
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        signup,
        allUsers: users.map(getSafeUser),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}
