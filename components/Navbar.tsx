'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'

export default function Navbar() {
  const pathname = usePathname()
  const { currentUser, logout } = useAuth()

  // Dynamic navigation links based on authentication and role
  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/events', label: 'Events' },
    ...(currentUser && currentUser.role === 'student'
      ? [{ href: '/registrations', label: 'My Registrations' }]
      : []),
    ...(currentUser && currentUser.role === 'organizer'
      ? [{ href: '/organizer', label: 'Organizer Console' }]
      : []),
  ]

  return (
    <header
      style={{
        borderBottom: '1.5px solid var(--line)',
        background: 'var(--paper)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        className="shell"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          height: 68,
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'var(--amber)',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 19,
              color: 'var(--ink)',
            }}
          >
            Campus Connect
          </span>
        </Link>

        <nav aria-label="Primary">
          <ul style={{ display: 'flex', gap: 4 }}>
            {navLinks.map((link) => {
              const active =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href)
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    style={{
                      display: 'inline-block',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius)',
                      fontSize: 14.5,
                      fontWeight: 500,
                      textDecoration: 'none',
                      color: active ? 'var(--ink)' : 'var(--ink-soft)',
                      background: active ? 'var(--slate-bg)' : 'transparent',
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="eyebrow-tag" style={{ textTransform: 'capitalize' }}>
                {currentUser.role}
              </span>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  maxWidth: 120,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={currentUser.name}
              >
                {currentUser.name}
              </span>
              <button
                type="button"
                onClick={logout}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: 13 }}
                title="Log out of your account"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="btn btn-primary"
              style={{ padding: '7px 16px', fontSize: 13.5 }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
