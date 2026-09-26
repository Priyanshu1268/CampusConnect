'use client'

import { useState, useEffect } from 'react'
import {
  events as initialEvents,
  EventCategory,
  isPastEvent,
  searchEventsByName,
  filterEventsByCategory,
  CampusEvent,
} from '@/data/events'
import EventCard from '@/components/EventCard'
import EmptyState from '@/components/EmptyState'

const CATEGORIES: (EventCategory | 'All')[] = [
  'All',
  'Tech',
  'Cultural',
  'Sports',
  'Workshop',
  'Career',
  'Music',
]

type SortOption = 'date-asc' | 'date-desc' | 'popularity' | 'seats'

export default function EventsPage() {
  const [eventList, setEventList] = useState<CampusEvent[]>(initialEvents)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<EventCategory | 'All'>('All')
  const [sortBy, setSortBy] = useState<SortOption>('date-asc')

  useEffect(() => {
    fetch('/api/events?upcoming=true&forStudent=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.events)) {
          setEventList(data.events)
        }
      })
      .catch(() => {
        // Fallback to in-memory store
      })
  }, [])

  // Hide past events and cancelled events from student discovery
  const upcomingEvents = eventList.filter(
    (event) => !isPastEvent(event) && !event.cancelled,
  )

  // Apply search & category filter (composing together)
  const searched = searchEventsByName(upcomingEvents, query)
  const filtered = filterEventsByCategory(searched, category)

  // Sort events
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'date-asc') {
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    }
    if (sortBy === 'date-desc') {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    }
    if (sortBy === 'popularity') {
      const bookedA = a.capacity - a.seatsAvailable
      const bookedB = b.capacity - b.seatsAvailable
      return bookedB - bookedA
    }
    if (sortBy === 'seats') {
      return b.seatsAvailable - a.seatsAvailable
    }
    return 0
  })

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <span className="eyebrow-tag">the board</span>
        <h1 style={{ fontSize: 30, marginTop: 10 }}>All events</h1>
        <p style={{ marginTop: 8 }}>
          Everything posted by clubs and departments this semester.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 24,
          alignItems: 'center',
        }}
      >
        <input
          type="search"
          placeholder="Search events by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: '1 1 240px',
            padding: '10px 14px',
            border: '1.5px solid var(--line)',
            borderRadius: 'var(--radius)',
            fontSize: 14.5,
            background: 'var(--paper-raised)',
          }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as EventCategory | 'All')}
          style={{
            padding: '10px 14px',
            border: '1.5px solid var(--line)',
            borderRadius: 'var(--radius)',
            fontSize: 14.5,
            background: 'var(--paper-raised)',
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === 'All' ? 'All categories' : c}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          aria-label="Sort events"
          style={{
            padding: '10px 14px',
            border: '1.5px solid var(--line)',
            borderRadius: 'var(--radius)',
            fontSize: 14.5,
            background: 'var(--paper-raised)',
          }}
        >
          <option value="date-asc">Date: Upcoming first</option>
          <option value="date-desc">Date: Furthest first</option>
          <option value="popularity">Popularity: Most booked</option>
          <option value="seats">Seats remaining</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="No events found"
          description="Try clearing your search query or picking a different category."
          action={
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setQuery('')
                setCategory('All')
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {sorted.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  )
}
