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
  // Start with seeded student Aditi Rao or load from localStorage
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(() => {
    return getSafeUser(users[0])
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
    // Try calling /api/auth
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
      localStorage.setItem('campus_connect_user', JSON.stringify(data.user))
      return data.user
    } catch (err: any) {
      // Fallback to local authentication
      const user = authenticateUser(emailOrId, password)
      if (!user) {
        throw new Error('Invalid email/ID or password')
      }
      setCurrentUser(user)
      localStorage.setItem('campus_connect_user', JSON.stringify(user))
      return user
    }
  }

  const logout = () => {
    setCurrentUser(null)
    try {
      localStorage.removeItem('campus_connect_user')
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
      localStorage.setItem('campus_connect_user', JSON.stringify(data.user))
      return data.user
    } catch (err: any) {
      const user = registerUser(name, email, password, role)
      setCurrentUser(user)
      localStorage.setItem('campus_connect_user', JSON.stringify(user))
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
