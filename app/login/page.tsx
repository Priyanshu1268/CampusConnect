'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { UserRole } from '@/data/auth'

export default function LoginPage() {
  const router = useRouter()
  const { currentUser, login, signup, logout } = useAuth()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [emailOrId, setEmailOrId] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      if (mode === 'login') {
        const user = await login(emailOrId, password)
        setSuccessMsg(`Welcome back, ${user.name}! Redirecting…`)
        setTimeout(() => {
          if (user.role === 'organizer') {
            router.push('/organizer')
          } else {
            router.push('/events')
          }
        }, 500)
      } else {
        const user = await signup(name, emailOrId, password, role)
        setSuccessMsg(`Account created! Welcome, ${user.name}! Redirecting…`)
        setTimeout(() => {
          if (user.role === 'organizer') {
            router.push('/organizer')
          } else {
            router.push('/events')
          }
        }, 500)
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (id: string, pass: string) => {
    setLoading(true)
    setError(null)
    try {
      const user = await login(id, pass)
      setSuccessMsg(`Logged in as ${user.name}! Redirecting…`)
      setTimeout(() => {
        if (user.role === 'organizer') {
          router.push('/organizer')
        } else {
          router.push('/events')
        }
      }, 400)
    } catch (err: any) {
      setError(err.message || 'Quick login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="shell" style={{ padding: '60px 0 80px', maxWidth: 500 }}>
      <div
        className="card-surface"
        style={{
          padding: '36px 32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1.5px solid var(--line)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span className="eyebrow-tag" style={{ marginBottom: 10 }}>
            account access
          </span>
          <h1 style={{ fontSize: 28, marginTop: 4 }}>
            {mode === 'login' ? 'Sign in to Campus Connect' : 'Create an Account'}
          </h1>
          <p style={{ marginTop: 6, fontSize: 14 }}>
            {mode === 'login'
              ? 'Enter your credentials to access events & registrations'
              : 'Register as a student or organizer with a secure password'}
          </p>
        </div>

        {currentUser && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius)',
              background: 'var(--slate-bg)',
              marginBottom: 20,
              fontSize: 13.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              Currently logged in as: <strong>{currentUser.name}</strong> ({currentUser.role})
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={logout}
              style={{ padding: '4px 10px', fontSize: 12.5 }}
            >
              Sign out
            </button>
          </div>
        )}

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1.5px solid var(--line)',
            marginBottom: 24,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError(null)
            }}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              background: 'transparent',
              fontSize: 15,
              fontWeight: mode === 'login' ? 700 : 500,
              color: mode === 'login' ? 'var(--ink)' : 'var(--ink-soft)',
              borderBottom: mode === 'login' ? '2.5px solid var(--amber)' : 'none',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setError(null)
            }}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              background: 'transparent',
              fontSize: 15,
              fontWeight: mode === 'register' ? 700 : 500,
              color: mode === 'register' ? 'var(--ink)' : 'var(--ink-soft)',
              borderBottom: mode === 'register' ? '2.5px solid var(--amber)' : 'none',
              cursor: 'pointer',
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              background: 'var(--rust-bg)',
              color: 'var(--rust)',
              fontSize: 13.5,
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              background: 'var(--green-bg)',
              color: 'var(--green)',
              fontSize: 13.5,
              marginBottom: 18,
            }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    fontSize: 14.5,
                    background: 'var(--paper)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                  I want to join as *
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: `1.5px solid ${role === 'student' ? 'var(--amber)' : 'var(--line)'}`,
                      borderRadius: 'var(--radius)',
                      background: role === 'student' ? 'var(--green-bg)' : 'var(--paper)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 14,
                      fontWeight: role === 'student' ? 600 : 400,
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      checked={role === 'student'}
                      onChange={() => setRole('student')}
                    />
                    Student
                  </label>
                  <label
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: `1.5px solid ${role === 'organizer' ? 'var(--amber)' : 'var(--line)'}`,
                      borderRadius: 'var(--radius)',
                      background: role === 'organizer' ? 'var(--green-bg)' : 'var(--paper)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 14,
                      fontWeight: role === 'organizer' ? 600 : 400,
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="organizer"
                      checked={role === 'organizer'}
                      onChange={() => setRole('organizer')}
                    />
                    Organizer
                  </label>
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              {mode === 'login' ? 'Email or User ID *' : 'Email Address *'}
            </label>
            <input
              type={mode === 'login' ? 'text' : 'email'}
              required
              placeholder={mode === 'login' ? 'student@campus.edu or stu-1' : 'you@campus.edu'}
              value={emailOrId}
              onChange={(e) => setEmailOrId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid var(--line)',
                borderRadius: 'var(--radius)',
                fontSize: 14.5,
                background: 'var(--paper)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              Password *
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid var(--line)',
                borderRadius: 'var(--radius)',
                fontSize: 14.5,
                background: 'var(--paper)',
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 8, padding: '12px 0' }}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Quick Demo Login Section */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px dashed var(--line)' }}>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 10, textAlign: 'center' }}>
            Quick Demo Login (Pre-seeded with passwords):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('student@campus.edu', 'student123')}
              className="btn btn-secondary"
              style={{ fontSize: 12.5, padding: '8px 10px' }}
            >
              👤 Student (Aditi)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('organizer@campus.edu', 'organizer123')}
              className="btn btn-secondary"
              style={{ fontSize: 12.5, padding: '8px 10px' }}
            >
              🏢 Organizer (Rohan)
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
