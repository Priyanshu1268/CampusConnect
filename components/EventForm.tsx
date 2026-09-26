'use client'

import { useState } from 'react'
import { EventCategory, TODAY } from '@/data/events'

const CATEGORIES: EventCategory[] = [
  'Tech',
  'Cultural',
  'Sports',
  'Workshop',
  'Career',
  'Music',
]

const MAX_IMAGE_SIZE = 1.5 * 1024 * 1024 // ~1.5MB

export interface EventFormValues {
  name: string
  description: string
  date: string
  venue: string
  category: EventCategory
  capacity: number
  imageUrl?: string
}

interface EventFormProps {
  initialValues?: Partial<EventFormValues>
  onSubmit: (values: EventFormValues) => Promise<string | null>
  onCancel: () => void
  title?: string
  submitLabel?: string
  currentBookings?: number
}

export default function EventForm({
  initialValues,
  onSubmit,
  onCancel,
  title = 'Event Details',
  submitLabel = 'Save Event',
  currentBookings,
}: EventFormProps) {
  const getDefaultDate = () => {
    if (initialValues?.date) return initialValues.date.slice(0, 16)
    const d = new Date(TODAY)
    d.setDate(d.getDate() + 7)
    d.setHours(14, 0, 0, 0)
    return d.toISOString().slice(0, 16)
  }

  const [formData, setFormData] = useState<EventFormValues>({
    name: initialValues?.name || '',
    description: initialValues?.description || '',
    date: getDefaultDate(),
    venue: initialValues?.venue || '',
    category: initialValues?.category || 'Tech',
    capacity: initialValues?.capacity ?? 50,
    imageUrl: initialValues?.imageUrl,
  })

  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    initialValues?.imageUrl,
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_IMAGE_SIZE) {
      setError('Image file is too large. Maximum allowed size is 1.5MB.')
      e.target.value = ''
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setPreviewUrl(result)
      setFormData((prev) => ({ ...prev, imageUrl: result }))
    }
    reader.onerror = () => {
      setError('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setPreviewUrl(undefined)
    setFormData((prev) => ({ ...prev, imageUrl: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Event name is required')
      return
    }
    if (!formData.venue.trim()) {
      setError('Venue is required')
      return
    }
    if (!formData.date) {
      setError('Date is required')
      return
    }
    const eventTime = new Date(formData.date).getTime()
    if (isNaN(eventTime) || eventTime <= TODAY.getTime()) {
      setError(
        'Event date must be in the future (after September 16, 2026 for the current academic semester)',
      )
      return
    }
    const cap = Number(formData.capacity)
    if (!Number.isInteger(cap) || cap <= 0) {
      setError('Capacity must be a positive integer')
      return
    }

    setSubmitting(true)
    try {
      const err = await onSubmit({
        ...formData,
        capacity: cap,
      })
      if (err) {
        setError(err)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
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
          {title}
        </h2>

        {error && (
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
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

          {/* Event Poster / Banner Image Upload */}
          <div>
            <label style={{ display: 'block', fontSize: 13.5, fontWeight: 500, marginBottom: 4 }}>
              Poster / Banner Image (optional, max 1.5MB)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{
                fontSize: 13.5,
                color: 'var(--ink-soft)',
                marginBottom: 8,
              }}
            />
            {previewUrl && (
              <div
                style={{
                  position: 'relative',
                  marginTop: 6,
                  height: 120,
                  width: '100%',
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                  border: '1.5px solid var(--line)',
                  background: 'var(--paper)',
                }}
              >
                <img
                  src={previewUrl}
                  alt="Poster preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    padding: '4px 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Remove image
                </button>
              </div>
            )}
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
              {currentBookings !== undefined && (
                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Current bookings: {currentBookings}
                </span>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13.5, fontWeight: 500, marginBottom: 4 }}>
              Date & Time *{' '}
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 400 }}>
                (Semester timeline: after Sep 16, 2026)
              </span>
            </label>
            <input
              type="datetime-local"
              required
              min="2026-09-17T00:00"
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
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
