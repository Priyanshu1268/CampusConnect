'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  getEventById,
  isPastEvent,
  isFullEvent,
  isAlmostFull,
  CampusEvent,
} from '@/data/events'
import { registrations } from '@/data/registrations'
import { useAuth } from '@/components/AuthProvider'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function EventDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [event, setEvent] = useState<CampusEvent | undefined>(() =>
    getEventById(params.id),
  )
  const [isRegistered, setIsRegistered] = useState(false)
  const [registeredTicketId, setRegisteredTicketId] = useState<string | null>(null)
  const [isDisqualified, setIsDisqualified] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Fetch fresh event data and registration status
  useEffect(() => {
    fetch(`/api/events/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.event) {
          setEvent(data.event)
        }
      })
      .catch(() => {})

    if (currentUser && currentUser.role === 'student') {
      fetch(`/api/registrations?studentId=${currentUser.id}&activeOnly=false`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.registrations)) {
            const myReg = data.registrations.find(
              (r: any) => r.eventId === params.id,
            )
            if (myReg) {
              if (myReg.status === 'confirmed') {
                setIsRegistered(true)
                setRegisteredTicketId(myReg.ticketId)
              } else if (myReg.status === 'disqualified') {
                setIsDisqualified(true)
              }
            } else {
              setIsRegistered(false)
              setIsDisqualified(false)
            }
          }
        })
        .catch(() => {
          const myReg = registrations.find(
            (r) => r.eventId === params.id && r.studentId === currentUser.id,
          )
          if (myReg) {
            if (myReg.status === 'confirmed') {
              setIsRegistered(true)
              setRegisteredTicketId(myReg.ticketId)
            } else if (myReg.status === 'disqualified') {
              setIsDisqualified(true)
            }
          }
        })
    } else {
      setIsRegistered(false)
      setIsDisqualified(false)
    }
  }, [params.id, currentUser])

  if (!event) {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title="This event isn't on the board"
          description="It may have been removed, or the link might be wrong. Head back to the full listing to find what you're looking for."
          action={
            <Link href="/events" className="btn btn-primary">
              Back to events
            </Link>
          }
        />
      </section>
    )
  }

  // Hide cancelled events from students
  if (event.cancelled && currentUser?.role === 'student') {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title="This event has been cancelled"
          description="The organizer has cancelled this event. Please explore other upcoming events."
          action={
            <Link href="/events" className="btn btn-primary">
              Browse events
            </Link>
          }
        />
      </section>
    )
  }

  const past = isPastEvent(event)
  const full = isFullEvent(event)
  const status = event.cancelled
    ? 'cancelled'
    : past
      ? 'past'
      : full
        ? 'full'
        : isAlmostFull(event)
          ? 'almost-full'
          : 'open'

  const isStudent = currentUser?.role === 'student'
  const canRegister = isStudent && !past && !full && !event.cancelled && !isRegistered && !isDisqualified

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      router.push('/login')
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          studentId: currentUser.id,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to register')
      }

      setIsRegistered(true)
      const ticket = data.registration?.ticketId || 'CONFIRMED'
      setRegisteredTicketId(ticket)
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              seatsAvailable: Math.max(0, prev.seatsAvailable - 1),
            }
          : prev,
      )
      setFeedback({
        type: 'success',
        message: `Successfully registered! Your Ticket ID is: ${ticket}`,
      })
      setShowModal(false)
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Registration failed',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <Link
        href="/events"
        style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}
      >
        ← All events
      </Link>

      {feedback && (
        <div
          role="alert"
          style={{
            marginTop: 16,
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: 32,
          marginTop: 20,
        }}
        className="hero-grid"
      >
        <div>
          {event.imageUrl && (
            <div
              style={{
                marginBottom: 20,
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                border: '1.5px solid var(--line)',
                maxHeight: '340px',
                background: 'var(--paper)',
              }}
            >
              <img
                src={event.imageUrl}
                alt={event.name}
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '340px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          )}
          <span className="eyebrow-tag">{event.category}</span>
          <h1 style={{ fontSize: 32, marginTop: 12 }}>{event.name}</h1>
          <p style={{ marginTop: 16, fontSize: 15.5 }}>{event.description}</p>
        </div>

        <aside
          className="card-surface"
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            height: 'fit-content',
          }}
        >
          <StatusBadge status={status} />
          <Detail label="Date" value={formatDate(event.date)} />
          <Detail label="Time" value={formatTime(event.date)} />
          <Detail label="Venue" value={event.venue} />
          <Detail
            label="Seats"
            value={`${event.seatsAvailable} of ${event.capacity} available`}
          />

          {!currentUser ? (
            <div style={{ marginTop: 8 }}>
              <Link href="/login" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                Sign in to Register
              </Link>
            </div>
          ) : isDisqualified ? (
            <div
              style={{
                marginTop: 8,
                padding: '10px 14px',
                borderRadius: 'var(--radius)',
                background: 'var(--rust-bg)',
                color: 'var(--rust)',
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              ⚠ Disqualified by event organizer
            </div>
          ) : isRegistered ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  background: 'var(--green-bg)',
                  color: 'var(--green)',
                  fontSize: 13.5,
                }}
              >
                <div style={{ fontWeight: 600 }}>✓ Registered</div>
                {registeredTicketId && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>
                    Ticket: <strong>{registeredTicketId}</strong>
                  </div>
                )}
              </div>
              <Link href="/registrations" className="btn btn-secondary" style={{ textAlign: 'center' }}>
                View in My Registrations
              </Link>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              disabled={!canRegister}
              style={{ marginTop: 4 }}
              onClick={() => {
                if (canRegister) {
                  setShowModal(true)
                  setFeedback(null)
                }
              }}
              title={
                !isStudent
                  ? 'Switch to a student account to register'
                  : past
                    ? 'This event has already taken place'
                    : event.cancelled
                      ? 'This event has been cancelled'
                      : full
                        ? 'This event is fully booked'
                        : 'Register for this event'
              }
            >
              {!isStudent
                ? 'Login as student to register'
                : event.cancelled
                  ? 'Event cancelled'
                  : past
                    ? 'Registration closed'
                    : full
                      ? 'Event full'
                      : 'Register'}
            </button>
          )}
        </aside>
      </div>

      {/* Registration Confirmation Modal */}
      {showModal && currentUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reg-dialog-title"
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
              padding: 28,
              maxWidth: 480,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            }}
          >
            <h2 id="reg-dialog-title" style={{ fontSize: 22 }}>
              Confirm Event Registration
            </h2>
            <p style={{ fontSize: 14.5 }}>
              Register for <strong>{event.name}</strong> as{' '}
              <strong>{currentUser.name}</strong> ({currentUser.id}).
            </p>

            <div
              style={{
                fontSize: 13.5,
                background: 'var(--paper)',
                padding: 12,
                borderRadius: 'var(--radius)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div><strong>Date:</strong> {formatDate(event.date)} at {formatTime(event.date)}</div>
              <div><strong>Venue:</strong> {event.venue}</div>
              <div><strong>Seats remaining:</strong> {event.seatsAvailable}</div>
              <div style={{ color: 'var(--ink-soft)', fontSize: 12.5, marginTop: 4 }}>
                ℹ A unique automated Ticket ID will be assigned upon confirmation.
              </div>
            </div>

            <form onSubmit={handleRegister} style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={submitting}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Registering…' : 'Confirm Registration'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{label}</div>
      <div style={{ fontSize: 14.5, fontWeight: 500 }}>{value}</div>
    </div>
  )
}
