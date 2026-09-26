'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  getEventById,
  isPastEvent,
  isFullEvent,
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
  const { currentUser } = useAuth()
  const [event, setEvent] = useState<CampusEvent | undefined>(() =>
    getEventById(params.id),
  )
  const [isRegistered, setIsRegistered] = useState(false)
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
      fetch(`/api/registrations?studentId=${currentUser.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.registrations)) {
            const hasReg = data.registrations.some(
              (r: any) => r.eventId === params.id && r.status === 'confirmed',
            )
            setIsRegistered(hasReg)
          }
        })
        .catch(() => {
          // Fallback to in-memory store
          const hasReg = registrations.some(
            (r) =>
              r.eventId === params.id &&
              r.studentId === currentUser.id &&
              r.status === 'confirmed',
          )
          setIsRegistered(hasReg)
        })
    } else {
      setIsRegistered(false)
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
  if (event.cancelled && currentUser.role === 'student') {
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
        : 'open'

  const isStudent = currentUser.role === 'student'
  const canRegister = isStudent && !past && !full && !event.cancelled && !isRegistered

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
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
        message: 'Successfully registered! See details under My Registrations.',
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

          {isRegistered ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius)',
                  background: 'var(--green-bg)',
                  color: 'var(--green)',
                  fontSize: 13.5,
                  fontWeight: 600,
                }}
              >
                <span>✓ You are registered for this event</span>
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
      {showModal && (
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
