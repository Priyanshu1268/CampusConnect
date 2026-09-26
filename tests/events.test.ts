import { describe, it, expect } from 'vitest'
import { events, isPastEvent, isAlmostFull, createEvent, updateEvent } from '@/data/events'

describe('isPastEvent', () => {
  it('marks an event with a date before TODAY as past', () => {
    // evt-10 is dated 2026-09-01; TODAY (seeded) is 2026-09-16
    const pastEvent = events.find((e) => e.id === 'evt-10')!
    expect(isPastEvent(pastEvent)).toBe(true)
  })
})

describe('isAlmostFull', () => {
  it('returns true when open and seatsAvailable / capacity < 0.15', () => {
    const testEvt = createEvent({
      name: 'Almost Full Event',
      description: 'Testing almost full',
      date: '2026-11-20T10:00:00',
      venue: 'Lab A',
      category: 'Tech',
      capacity: 100,
      organizerId: 'org-1',
    })
    testEvt.seatsAvailable = 10 // 10/100 = 0.10 < 0.15
    expect(isAlmostFull(testEvt)).toBe(true)
  })

  it('returns false when full (0 seats)', () => {
    const testEvt = createEvent({
      name: 'Full Event',
      description: 'Testing full',
      date: '2026-11-20T10:00:00',
      venue: 'Lab A',
      category: 'Tech',
      capacity: 100,
      organizerId: 'org-1',
    })
    testEvt.seatsAvailable = 0
    expect(isAlmostFull(testEvt)).toBe(false)
  })

  it('returns false when seatsAvailable / capacity >= 0.15', () => {
    const testEvt = createEvent({
      name: 'Plenty of Seats Event',
      description: 'Testing plenty seats',
      date: '2026-11-20T10:00:00',
      venue: 'Lab A',
      category: 'Tech',
      capacity: 100,
      organizerId: 'org-1',
    })
    testEvt.seatsAvailable = 20 // 20/100 = 0.20 >= 0.15
    expect(isAlmostFull(testEvt)).toBe(false)
  })

  it('returns false when cancelled or past', () => {
    const testEvt = createEvent({
      name: 'Cancelled Event',
      description: 'Testing cancelled',
      date: '2026-11-20T10:00:00',
      venue: 'Lab A',
      category: 'Tech',
      capacity: 100,
      organizerId: 'org-1',
    })
    testEvt.seatsAvailable = 5
    testEvt.cancelled = true
    expect(isAlmostFull(testEvt)).toBe(false)
  })
})

describe('imageUrl support', () => {
  it('creates and updates event with optional imageUrl', () => {
    const testEvt = createEvent({
      name: 'Image Event',
      description: 'Event with image',
      date: '2026-11-20T10:00:00',
      venue: 'Hall B',
      category: 'Tech',
      capacity: 50,
      organizerId: 'org-1',
      imageUrl: 'data:image/png;base64,samplebase64',
    })
    expect(testEvt.imageUrl).toBe('data:image/png;base64,samplebase64')

    updateEvent(testEvt.id, 'org-1', { imageUrl: 'data:image/png;base64,updated' })
    expect(testEvt.imageUrl).toBe('data:image/png;base64,updated')
  })
})
