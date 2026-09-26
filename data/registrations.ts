import { getEventById, isPastEvent } from './events'

// Seed data for registrations, so the "My Registrations" and Organizer
// pages have something real to display before participants build the
// actual registration flow (Task 2 and Task 3).

export type RegistrationStatus = 'confirmed' | 'cancelled'

export interface Registration {
  id: string
  eventId: string
  studentId: string
  status: RegistrationStatus
  registeredAt: string // ISO date string
}

// NOTE FOR PARTICIPANTS: this array is the "database" of registrations.
// Task 2 (Registration) means pushing new items into this array when a
// student registers. Task 3 (Cancellation) means updating an item's
// status here. Keep using this same array — don't create a second store.
export const registrations: Registration[] = [
  {
    id: 'reg-01',
    eventId: 'evt-01',
    studentId: 'stu-1',
    status: 'confirmed',
    registeredAt: '2026-09-10T10:15:00',
  },
  {
    id: 'reg-02',
    eventId: 'evt-04',
    studentId: 'stu-1',
    status: 'confirmed',
    registeredAt: '2026-08-20T09:00:00',
  },
  {
    id: 'reg-03',
    eventId: 'evt-09',
    studentId: 'stu-1',
    status: 'confirmed',
    registeredAt: '2026-09-12T18:40:00',
  },
]

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

