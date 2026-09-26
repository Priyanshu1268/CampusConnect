'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { events as initialEvents, CampusEvent, EventCategory, TODAY } from '@/data/events'
import EmptyState from '@/components/EmptyState'
import StatusBadge from '@/components/StatusBadge'

const CATEGORIES: EventCategory[] = [
  'Tech',
  'Cultural',
  'Sports',
  'Workshop',
  'Career',
  'Music',
]

interface EventFormData {
  name: string
  description: string
  date: string
  venue: string
  category: EventCategory
  capacity: number
}

const defaultFormData: EventFormData = {
  name: '',
  description: '',
  date: '',
  venue: '',
  category: 'Tech',
  capacity: 50,
}

export default function OrganizerPage() {
  const { currentUser } = useAuth()
  const [eventsList, setEventsList] = useState<CampusEvent[]>(initialEvents)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CampusEvent | null>(null)
  const [formData, setFormData] = useState<EventFormData>(defaultFormData)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const fetchEvents = () => {
    fetch('/api/events?upcoming=false&forStudent=false')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.events)) {
          setEventsList(data.events)
        }
      })
      .catch(() => {
        setEventsList(initialEvents)
      })
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  if (currentUser.role !== 'organizer') {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title="This page is for organizers"
          description="Switch to an organizer account from the top-right menu to manage events."
        />
      </section>
    )
  }

  const myEvents = eventsList.filter((e) => e.organizerId === currentUser.id)

  const openCreateModal = () => {
    // Default date to tomorrow
    const tomorrow = new Date(TODAY)
    tomorrow.setDate(tomorrow.getDate() + 7)
    tomorrow.setHours(10, 0, 0, 0)
    const isoString = tomorrow.toISOString().slice(0, 16)

    setFormData({
      ...defaultFormData,
      date: isoString,
    })
    setFormError(null)
    setShowCreateModal(true)
  }

  const openEditModal = (event: CampusEvent) => {
    setEditingEvent(event)
    setFormData({
      name: event.name,
      description: event.description,
      date: event.date.slice(0, 16),
      venue: event.venue,
      category: event.category,
      capacity: event.capacity,
    })
    setFormError(null)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      if (!formData.name.trim()) throw new Error('Event name is required')
      if (!formData.venue.trim()) throw new Error('Venue is required')
      if (!formData.date) throw new Error('Date is required')
      if (new Date(formData.date).getTime() <= TODAY.getTime()) {
        throw new Error('Event date must be in the future')
      }
      if (!Number.isInteger(Number(formData.capacity)) || Number(formData.capacity) <= 0) {
        throw new Error('Capacity must be a positive integer')
      }

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          capacity: Number(formData.capacity),
          organizerId: currentUser.id,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create event')
      }

      setEventsList((prev) => [data.event, ...prev])
      setShowCreateModal(false)
      setFeedback({
        type: 'success',
        message: `Event "${data.event.name}" created successfully!`,
      })
    } catch (err: any) {
      setFormError(err.message || 'Error creating event')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEvent) return
    setSubmitting(true)
    setFormError(null)

    try {
      if (!formData.name.trim()) throw new Error('Event name is required')
      if (!formData.venue.trim()) throw new Error('Venue is required')
      if (!formData.date) throw new Error('Date is required')
      if (new Date(formData.date).getTime() <= TODAY.getTime()) {
        throw new Error('Event date must be in the future')
      }
      const newCapacity = Number(formData.capacity)
      if (!Number.isInteger(newCapacity) || newCapacity <= 0) {
        throw new Error('Capacity must be a positive integer')
      }

      const bookedSeats = editingEvent.capacity - editingEvent.seatsAvailable
      if (newCapacity < bookedSeats) {
        throw new Error(
          `Capacity cannot be less than current registrations (${bookedSeats})`,
        )
      }

      const res = await fetch(`/api/events/${editingEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          capacity: newCapacity,
          organizerId: currentUser.id,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update event')
      }

      setEventsList((prev) =>
        prev.map((e) => (e.id === editingEvent.id ? data.event : e)),
      )
      setEditingEvent(null)
      setFeedback({
        type: 'success',
        message: `Event "${data.event.name}" updated successfully!`,
      })
    } catch (err: any) {
      setFormError(err.message || 'Error updating event')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelEvent = async (event: CampusEvent) => {
    if (
      !confirm(
        `Are you sure you want to cancel "${event.name}"? This will close registration and hide it from students.`,
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizerId: currentUser.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel event')
      }

      setEventsList((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, cancelled: true } : e)),
      )
      setFeedback({
        type: 'success',
        message: `Event "${event.name}" has been cancelled.`,
      })
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to cancel event',
      })
    }
  }

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <div
        style={{
          marginBottom: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <span className="eyebrow-tag">organizer console</span>
          <h1 style={{ fontSize: 30, marginTop: 10 }}>Manage your events</h1>
          <p style={{ marginTop: 8 }}>
            Create new events, modify capacities and venues, or cancel events.
          </p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={openCreateModal}
        >
          + New event
        </button>
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

      {myEvents.length === 0 ? (
        <EmptyState
          title="No events posted yet"
          description="Click '+ New event' above to create your first event."
        />
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {myEvents.map((event) => {
            const status = event.cancelled
              ? 'cancelled'
              : event.seatsAvailable <= 0
                ? 'full'
                : 'open'
            return (
              <li
                key={event.id}
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
                  <div
                    style={{
                      fontSize: 13.5,
                      color: 'var(--ink-soft)',
                      marginTop: 4,
                    }}
                  >
                    {new Date(event.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    · {event.venue} · {event.seatsAvailable}/{event.capacity}{' '}
                    seats
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <StatusBadge status={status} />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => openEditModal(event)}
                  >
                    Edit
                  </button>
                  {!event.cancelled && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ color: 'var(--rust)' }}
                      onClick={() => handleCancelEvent(event)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Create / Edit Modal */}
      {(showCreateModal || editingEvent) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-form-title"
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
              maxWidth: 520,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            }}
          >
            <h2 id="event-form-title" style={{ fontSize: 22, marginBottom: 16 }}>
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </h2>

            {formError && (
              <div
                role="alert"
                style={{
                  marginBottom: 16,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  background: 'var(--rust-bg)',
                  color: 'var(--rust)',
                  fontSize: 14,
                }}
              >
                {formError}
              </div>
            )}

            <form
              onSubmit={editingEvent ? handleEditSubmit : handleCreateSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label style={{ display: 'block', fontSize: 13.5, fontWeight: 500, marginBottom: 4 }}>
                  Event Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    fontSize: 14.5,
                    background: 'var(--paper)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13.5, fontWeight: 500, marginBottom: 4 }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    fontSize: 14.5,
                    background: 'var(--paper)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13.5, fontWeight: 500, marginBottom: 4 }}>
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as EventCategory })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1.5px solid var(--line)',
                      borderRadius: 'var(--radius)',
                      fontSize: 14.5,
                      background: 'var(--paper)',
                    }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13.5, fontWeight: 500, marginBottom: 4 }}>
                    Capacity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 0 })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1.5px solid var(--line)',
                      borderRadius: 'var(--radius)',
                      fontSize: 14.5,
                      background: 'var(--paper)',
                    }}
                  />
                  {editingEvent && (
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      Current bookings: {editingEvent.capacity - editingEvent.seatsAvailable}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13.5, fontWeight: 500, marginBottom: 4 }}>
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    fontSize: 14.5,
                    background: 'var(--paper)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13.5, fontWeight: 500, marginBottom: 4 }}>
                  Venue *
                </label>
                <input
                  type="text"
                  required
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    fontSize: 14.5,
                    background: 'var(--paper)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting}
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingEvent(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving…' : editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
