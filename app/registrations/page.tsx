'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import {
  Registration,
  getRegistrationsForStudent,
} from '@/data/registrations'
import { getEventById, isPastEvent, CampusEvent } from '@/data/events'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'

export default function RegistrationsPage() {
  const { currentUser } = useAuth()
  const [registrationsList, setRegistrationsList] = useState<Registration[]>(() =>
    currentUser ? getRegistrationsForStudent(currentUser.id) : [],
  )
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmCancelReg, setConfirmCancelReg] = useState<{
    id: string
    eventName: string
  } | null>(null)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const fetchRegistrations = () => {
    if (!currentUser || currentUser.role !== 'student') return
    fetch(`/api/registrations?studentId=${currentUser.id}&activeOnly=false`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.registrations)) {
          setRegistrationsList(data.registrations)
        }
      })
      .catch(() => {
        // Fallback to in-memory store
        setRegistrationsList(getRegistrationsForStudent(currentUser.id))
      })
  }

  useEffect(() => {
    fetchRegistrations()
  }, [currentUser])

  if (!currentUser || currentUser.role !== 'student') {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title="Student login required"
          description="Sign in to your student account to view and manage registered campus events."
          action={
            <Link href="/login" className="btn btn-primary">
              Sign In as Student
            </Link>
          }
        />
      </section>
    )
  }

  // Filter out registrations for events that have been cancelled by organizer
  const visibleRegistrations = registrationsList.filter((reg) => {
    const event = getEventById(reg.eventId)
    return !!event && !event.cancelled
  })

  // Separate upcoming and past registrations (only confirmed registrations in active lists)
  const upcomingRegistrations = visibleRegistrations.filter((reg) => {
    const event = getEventById(reg.eventId)
    return event && !isPastEvent(event) && reg.status === 'confirmed'
  })

  const pastRegistrations = visibleRegistrations.filter((reg) => {
    const event = getEventById(reg.eventId)
    return event && isPastEvent(event) && reg.status === 'confirmed'
  })

  const inactiveRegistrations = visibleRegistrations.filter(
    (reg) => reg.status === 'cancelled' || reg.status === 'disqualified',
  )

  const handleCancelRegistration = async (id: string) => {
    setCancellingId(id)
    setFeedback(null)

    try {
      const res = await fetch(`/api/registrations/${id}?studentId=${currentUser.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel registration')
      }

      setRegistrationsList((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)),
      )
      setFeedback({
        type: 'success',
        message: 'Registration successfully cancelled. Seat released.',
      })
      setConfirmCancelReg(null)
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error cancelling registration',
      })
    } finally {
      setCancellingId(null)
    }
  }

  const renderRegistrationItem = (
    reg: Registration,
    event: CampusEvent,
    isUpcoming: boolean,
  ) => (
    <li
      key={reg.id}
      className="card-surface"
      style={{
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link
            href={`/events/${event.id}`}
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 17,
              textDecoration: 'none',
            }}
          >
            {event.name}
          </Link>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              background: 'var(--slate-bg)',
              color: 'var(--ink)',
              padding: '2px 8px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--line)',
            }}
          >
            Ticket: {reg.ticketId || 'CONFIRMED'}
          </span>
        </div>
        <div
          style={{
            fontSize: 13.5,
            color: 'var(--ink-soft)',
            marginTop: 5,
          }}
        >
          {new Date(event.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}{' '}
          · {event.venue}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {reg.status === 'disqualified' ? (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              padding: '3px 8px',
              borderRadius: 999,
              background: 'var(--rust-bg)',
              color: 'var(--rust)',
            }}
          >
            Disqualified
          </span>
        ) : (
          <StatusBadge
            status={
              reg.status === 'cancelled'
                ? 'cancelled'
                : isPastEvent(event)
                  ? 'past'
                  : 'open'
            }
          />
        )}

        {isUpcoming && reg.status === 'confirmed' && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={cancellingId === reg.id}
            onClick={() =>
              setConfirmCancelReg({ id: reg.id, eventName: event.name })
            }
          >
            {cancellingId === reg.id ? 'Cancelling…' : 'Cancel'}
          </button>
        )}
      </div>
    </li>
  )

  const hasAnyRegistrations =
    upcomingRegistrations.length > 0 ||
    pastRegistrations.length > 0 ||
    inactiveRegistrations.length > 0

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <span className="eyebrow-tag">signed up as {currentUser.name}</span>
        <h1 style={{ fontSize: 30, marginTop: 10 }}>My registrations</h1>
        <p style={{ marginTop: 8 }}>
          View your upcoming tickets, registration history, and event details.
        </p>
      </div>

      {feedback && (
        <div
          role="alert"
          style={{
            marginBottom: 20,
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            background:
              feedback.type === 'success'
                ? 'var(--green-bg)'
                : 'var(--rust-bg)',
            color:
              feedback.type === 'success'
                ? 'var(--green)'
                : 'var(--rust)',
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              color: 'inherit',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {!hasAnyRegistrations ? (
        <EmptyState
          title="No registrations yet"
          description="Once you register for an event, your tickets will show up here."
          action={
            <Link href="/events" className="btn btn-primary">
              Browse events
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {/* Upcoming Registrations */}
          <div>
            <h2 style={{ fontSize: 20, marginBottom: 14 }}>
              Upcoming Events ({upcomingRegistrations.length})
            </h2>
            {upcomingRegistrations.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>
                No upcoming events registered. Discover events to attend!
              </p>
            ) : (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {upcomingRegistrations.map((reg) => {
                  const event = getEventById(reg.eventId)
                  if (!event) return null
                  return renderRegistrationItem(reg, event, true)
                })}
              </ul>
            )}
          </div>

          {/* Past Registrations */}
          {pastRegistrations.length > 0 && (
            <div>
              <h2 style={{ fontSize: 20, marginBottom: 14 }}>
                Past Events ({pastRegistrations.length})
              </h2>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pastRegistrations.map((reg) => {
                  const event = getEventById(reg.eventId)
                  if (!event) return null
                  return renderRegistrationItem(reg, event, false)
                })}
              </ul>
            </div>
          )}

          {/* Cancelled / Disqualified Registrations */}
          {inactiveRegistrations.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--ink-soft)',
                  userSelect: 'none',
                }}
              >
                Cancelled & Disqualified History ({inactiveRegistrations.length})
              </summary>
              <ul
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  marginTop: 14,
                }}
              >
                {inactiveRegistrations.map((reg) => {
                  const event = getEventById(reg.eventId)
                  if (!event) return null
                  return renderRegistrationItem(reg, event, false)
                })}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {confirmCancelReg && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            className="card-surface"
            style={{
              padding: 24,
              maxWidth: 440,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            }}
          >
            <h3 id="cancel-modal-title" style={{ fontSize: 19 }}>
              Cancel Registration?
            </h3>
            <p style={{ fontSize: 14.5 }}>
              Are you sure you want to cancel your registration for{' '}
              <strong>{confirmCancelReg.eventName}</strong>? Your seat will be
              released for other students.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!!cancellingId}
                onClick={() => setConfirmCancelReg(null)}
              >
                Keep registration
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--rust)', borderColor: 'var(--rust)' }}
                disabled={!!cancellingId}
                onClick={() => handleCancelRegistration(confirmCancelReg.id)}
              >
                {cancellingId ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
