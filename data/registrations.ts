import { getEventById, isPastEvent } from './events'
import { getUserById } from './auth'

export type RegistrationStatus = 'confirmed' | 'cancelled' | 'disqualified'

export interface Registration {
  id: string
  ticketId: string // Automated unique ticket ID, e.g. CC-E01-9F2D
  eventId: string
  studentId: string
  status: RegistrationStatus
  registeredAt: string // ISO date string
}

export interface AttendeeDetail extends Registration {
  studentName: string
  studentEmail: string
}

const globalForRegs = globalThis as unknown as {
  campusRegistrations?: Registration[]
}

// NOTE FOR PARTICIPANTS: this array is the "database" of registrations.
const seedRegistrations: Registration[] = [
  {
    id: 'reg-01',
    ticketId: 'CC-E01-984A',
    eventId: 'evt-01',
    studentId: 'stu-1',
    status: 'confirmed',
    registeredAt: '2026-09-10T10:15:00',
  },
  {
    id: 'reg-02',
    ticketId: 'CC-E04-712C',
    eventId: 'evt-04',
    studentId: 'stu-1',
    status: 'confirmed',
    registeredAt: '2026-08-20T09:00:00',
  },
  {
    id: 'reg-03',
    ticketId: 'CC-E09-335B',
    eventId: 'evt-09',
    studentId: 'stu-1',
    status: 'confirmed',
    registeredAt: '2026-09-12T18:40:00',
  },
]

export const registrations: Registration[] =
  globalForRegs.campusRegistrations ?? seedRegistrations
globalForRegs.campusRegistrations = registrations

/** Simple lookup used by the placeholder "My Registrations" page. */
export function getRegistrationsForStudent(studentId: string): Registration[] {
  return registrations.filter((reg) => reg.studentId === studentId)
}

/** Get only active confirmed registrations for non-cancelled events for a student */
export function getActiveRegistrationsForStudent(studentId: string): Registration[] {
  return registrations.filter((reg) => {
    if (reg.studentId !== studentId || reg.status !== 'confirmed') return false
    const event = getEventById(reg.eventId)
    return !!event && !event.cancelled
  })
}

/** Count active confirmed registrations for an event */
export function countActiveRegistrations(eventId: string): number {
  return registrations.filter(
    (r) => r.eventId === eventId && r.status === 'confirmed',
  ).length
}

function generateTicketId(eventId: string): string {
  const eventCode = eventId.replace('evt-', 'E').toUpperCase()
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `CC-${eventCode}-${randomSuffix}`
}

export function registerStudentForEvent(
  studentId: string,
  eventId: string,
): Registration {
  if (!studentId || !studentId.trim()) {
    throw new Error('Student ID is required')
  }

  const event = getEventById(eventId)
  if (!event) {
    throw new Error('Event not found')
  }

  if (isPastEvent(event)) {
    throw new Error('Cannot register for a past event')
  }

  if (event.cancelled) {
    throw new Error('Cannot register for a cancelled event')
  }

  const alreadyRegistered = registrations.some(
    (reg) =>
      reg.studentId === studentId &&
      reg.eventId === eventId &&
      reg.status === 'confirmed',
  )
  if (alreadyRegistered) {
    throw new Error('Student is already registered for this event')
  }

  if (event.seatsAvailable <= 0) {
    throw new Error('Event is full')
  }

  // Decrease seats
  event.seatsAvailable -= 1

  const newReg: Registration = {
    id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ticketId: generateTicketId(eventId),
    eventId,
    studentId,
    status: 'confirmed',
    registeredAt: new Date().toISOString(),
  }

  registrations.push(newReg)
  return newReg
}

export function cancelRegistration(
  registrationId: string,
  studentId: string,
): Registration {
  const reg = registrations.find((r) => r.id === registrationId)
  if (!reg) {
    throw new Error('Registration not found')
  }

  if (reg.studentId !== studentId) {
    throw new Error('Unauthorized: registration does not belong to this student')
  }

  if (reg.status === 'cancelled') {
    throw new Error('Registration is already cancelled')
  }

  reg.status = 'cancelled'

  const event = getEventById(reg.eventId)
  if (event) {
    event.seatsAvailable = Math.min(event.capacity, event.seatsAvailable + 1)
  }

  return reg
}

/**
 * Organizer power: Disqualify or remove an attendee from an event.
 * Reallocates the released seat back to the event.
 */
export function disqualifyAttendee(
  registrationId: string,
  organizerId: string,
): Registration {
  const reg = registrations.find((r) => r.id === registrationId)
  if (!reg) {
    throw new Error('Registration not found')
  }

  const event = getEventById(reg.eventId)
  if (!event) {
    throw new Error('Associated event not found')
  }

  if (event.organizerId !== organizerId) {
    throw new Error('Unauthorized: only the event organizer can disqualify attendees')
  }

  if (reg.status === 'disqualified') {
    throw new Error('Attendee is already disqualified')
  }

  // If was confirmed, free the seat
  if (reg.status === 'confirmed') {
    event.seatsAvailable = Math.min(event.capacity, event.seatsAvailable + 1)
  }

  reg.status = 'disqualified'
  return reg
}

/**
 * Get all attendees for an event, safely including student details
 * without ever exposing passwords.
 */
export function getEventAttendees(eventId: string): AttendeeDetail[] {
  const eventRegistrations = registrations.filter((r) => r.eventId === eventId)

  return eventRegistrations.map((reg) => {
    const user = getUserById(reg.studentId)
    return {
      ...reg,
      studentName: user ? user.name : 'Unknown Student',
      studentEmail: user ? user.email : 'N/A',
    }
  })
}
