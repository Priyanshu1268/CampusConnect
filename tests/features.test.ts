import { describe, it, expect, beforeEach } from 'vitest'
import {
  events,
  searchEventsByName,
  filterEventsByCategory,
  createEvent,
  updateEvent,
  cancelEvent,
  isPastEvent,
  isFullEvent,
  CampusEvent,
  TODAY,
} from '@/data/events'
import {
  registrations,
  registerStudentForEvent,
  cancelRegistration,
  getActiveRegistrationsForStudent,
} from '@/data/registrations'

describe('Task 1 — Event Listing (Search & Filters)', () => {
  it('performs case-insensitive partial search by event name', () => {
    const results = searchEventsByName(events, 'cLiNiC')
    expect(results.length).toBe(1)
    expect(results[0].name).toBe('Resume & LinkedIn Clinic')
  })

  it('returns all events when search query is empty or whitespace', () => {
    const results = searchEventsByName(events, '   ')
    expect(results.length).toBe(events.length)
  })

  it('filters events by exact category', () => {
    const sportsEvents = filterEventsByCategory(events, 'Sports')
    expect(sportsEvents.length).toBeGreaterThan(0)
    expect(sportsEvents.every((e) => e.category === 'Sports')).toBe(true)
  })

  it('returns all events when category is All', () => {
    const all = filterEventsByCategory(events, 'All')
    expect(all.length).toBe(events.length)
  })

  it('composes search and category filter together', () => {
    const sportsEvents = filterEventsByCategory(events, 'Sports')
    const match = searchEventsByName(sportsEvents, 'Badminton')
    expect(match.length).toBe(1)
    expect(match[0].id).toBe('evt-15')

    const noMatch = searchEventsByName(sportsEvents, 'Hack')
    expect(noMatch.length).toBe(0)
  })
})

describe('Task 2 & 5 — Registration Logic & Debugging Checks', () => {
  let testEvent: CampusEvent

  beforeEach(() => {
    // Create a fresh test event in the future with available seats
    testEvent = createEvent({
      name: `Registration Test Event ${Date.now()}`,
      description: 'Testing registration flow',
      date: '2026-11-20T10:00:00',
      venue: 'Auditorium Hall A',
      category: 'Tech',
      capacity: 2,
      organizerId: 'org-1',
    })
  })

  it('successfully registers a student and decreases available seats', () => {
    const initialSeats = testEvent.seatsAvailable
    const reg = registerStudentForEvent('stu-test-1', testEvent.id)

    expect(reg.id).toBeDefined()
    expect(reg.studentId).toBe('stu-test-1')
    expect(reg.eventId).toBe(testEvent.id)
    expect(reg.status).toBe('confirmed')
    expect(testEvent.seatsAvailable).toBe(initialSeats - 1)
  })

  it('prevents duplicate registration for the same event and student', () => {
    registerStudentForEvent('stu-duplicate-test', testEvent.id)

    expect(() => {
      registerStudentForEvent('stu-duplicate-test', testEvent.id)
    }).toThrow('already registered')
  })

  it('prevents registration when event is full', () => {
    // capacity is 2
    registerStudentForEvent('stu-seat-1', testEvent.id)
    registerStudentForEvent('stu-seat-2', testEvent.id)
    expect(testEvent.seatsAvailable).toBe(0)
    expect(isFullEvent(testEvent)).toBe(true)

    expect(() => {
      registerStudentForEvent('stu-seat-3', testEvent.id)
    }).toThrow('full')
  })

  it('prevents registration for past events', () => {
    const pastEvt = events.find((e) => isPastEvent(e))!
    expect(pastEvt).toBeDefined()

    expect(() => {
      registerStudentForEvent('stu-past-test', pastEvt.id)
    }).toThrow('past event')
  })

  it('prevents registration for cancelled events', () => {
    cancelEvent(testEvent.id, 'org-1')
    expect(testEvent.cancelled).toBe(true)

    expect(() => {
      registerStudentForEvent('stu-cancelled-test', testEvent.id)
    }).toThrow('cancelled event')
  })
})

describe('Task 3 & 5 — Cancellation & Seat Restoration', () => {
  it('cancels registration and increases available seats', () => {
    const cancelEvt = createEvent({
      name: `Cancellation Test Event ${Date.now()}`,
      description: 'Testing cancellation flow',
      date: '2026-11-25T14:00:00',
      venue: 'Seminar Hall',
      category: 'Workshop',
      capacity: 5,
      organizerId: 'org-1',
    })

    const initialSeats = cancelEvt.seatsAvailable
    const reg = registerStudentForEvent('stu-cancel-user', cancelEvt.id)
    expect(cancelEvt.seatsAvailable).toBe(initialSeats - 1)

    const cancelledReg = cancelRegistration(reg.id, 'stu-cancel-user')
    expect(cancelledReg.status).toBe('cancelled')
    expect(cancelEvt.seatsAvailable).toBe(initialSeats)
  })

  it('prevents cancelling already cancelled registration', () => {
    const cancelEvt = createEvent({
      name: `Double Cancel Test Event ${Date.now()}`,
      description: 'Testing double cancel flow',
      date: '2026-11-26T14:00:00',
      venue: 'Seminar Hall',
      category: 'Workshop',
      capacity: 5,
      organizerId: 'org-1',
    })

    const reg = registerStudentForEvent('stu-double-cancel', cancelEvt.id)
    cancelRegistration(reg.id, 'stu-double-cancel')

    expect(() => {
      cancelRegistration(reg.id, 'stu-double-cancel')
    }).toThrow('already cancelled')
  })

  it('hides cancelled registrations from active student registrations', () => {
    const activeEvt = createEvent({
      name: `Active Event ${Date.now()}`,
      description: 'Active event description',
      date: '2026-12-01T10:00:00',
      venue: 'Main Lab',
      category: 'Tech',
      capacity: 10,
      organizerId: 'org-1',
    })

    const reg1 = registerStudentForEvent('stu-filter-test', activeEvt.id)
    let active = getActiveRegistrationsForStudent('stu-filter-test')
    expect(active.some((r) => r.id === reg1.id)).toBe(true)

    // Cancel registration
    cancelRegistration(reg1.id, 'stu-filter-test')
    active = getActiveRegistrationsForStudent('stu-filter-test')
    expect(active.some((r) => r.id === reg1.id)).toBe(false)
  })

  it('hides registrations for events that were cancelled by organizer', () => {
    const cancelTargetEvt = createEvent({
      name: `Will Be Cancelled Event ${Date.now()}`,
      description: 'Event to be cancelled',
      date: '2026-12-05T10:00:00',
      venue: 'Main Lab',
      category: 'Tech',
      capacity: 10,
      organizerId: 'org-1',
    })

    const reg = registerStudentForEvent('stu-evt-cancel-test', cancelTargetEvt.id)
    let active = getActiveRegistrationsForStudent('stu-evt-cancel-test')
    expect(active.some((r) => r.id === reg.id)).toBe(true)

    // Organizer cancels the event
    cancelEvent(cancelTargetEvt.id, 'org-1')
    active = getActiveRegistrationsForStudent('stu-evt-cancel-test')
    expect(active.some((r) => r.id === reg.id)).toBe(false)
  })
})

describe('Task 4 — Organizer Event Management & Seat Consistency', () => {
  it('creates an event with validation', () => {
    const newEvt = createEvent({
      name: 'Organizer Created Event',
      description: 'Description here',
      date: '2026-12-10T12:00:00',
      venue: 'Block D, Rm 101',
      category: 'Career',
      capacity: 50,
      organizerId: 'org-1',
    })

    expect(newEvt.id).toBeDefined()
    expect(newEvt.seatsAvailable).toBe(50)
    expect(newEvt.cancelled).toBe(false)
  })

  it('rejects event creation with past date', () => {
    expect(() => {
      createEvent({
        name: 'Past Event',
        description: 'Should fail',
        date: '2026-08-01T10:00:00',
        venue: 'Room 1',
        category: 'Career',
        capacity: 10,
        organizerId: 'org-1',
      })
    }).toThrow('Event date must be in the future')
  })

  it('rejects event creation with non-positive capacity', () => {
    expect(() => {
      createEvent({
        name: 'Zero Cap Event',
        description: 'Should fail',
        date: '2026-12-01T10:00:00',
        venue: 'Room 1',
        category: 'Tech',
        capacity: 0,
        organizerId: 'org-1',
      })
    }).toThrow('Capacity must be a positive integer')
  })

  it('updates capacity and preserves booked seats accurately', () => {
    const evt = createEvent({
      name: 'Capacity Adjustment Event',
      description: 'Testing seat adjustments',
      date: '2026-12-15T10:00:00',
      venue: 'Hall C',
      category: 'Tech',
      capacity: 10,
      organizerId: 'org-1',
    })

    // Register 3 students
    registerStudentForEvent('stu-cap-1', evt.id)
    registerStudentForEvent('stu-cap-2', evt.id)
    registerStudentForEvent('stu-cap-3', evt.id)
    expect(evt.seatsAvailable).toBe(7)

    // Expand capacity to 20 -> seatsAvailable should become 20 - 3 = 17
    updateEvent(evt.id, 'org-1', { capacity: 20 })
    expect(evt.capacity).toBe(20)
    expect(evt.seatsAvailable).toBe(17)

    // Attempting to lower capacity below booked seats (3) should fail
    expect(() => {
      updateEvent(evt.id, 'org-1', { capacity: 2 })
    }).toThrow('Capacity cannot be less than current registrations (3)')
  })

  it('rejects modification by unauthorized organizer', () => {
    const evt = createEvent({
      name: 'Auth Test Event',
      description: 'Only org-1 can edit',
      date: '2026-12-20T10:00:00',
      venue: 'Hall B',
      category: 'Tech',
      capacity: 20,
      organizerId: 'org-1',
    })

    expect(() => {
      updateEvent(evt.id, 'org-999', { name: 'Hacked Name' })
    }).toThrow('Unauthorized')
  })
})
