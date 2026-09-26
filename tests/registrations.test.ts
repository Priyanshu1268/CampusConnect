import { describe, it, expect } from 'vitest'
import {
  getRegistrationsForStudent,
  countActiveRegistrations,
  registerStudentForEvent,
  cancelRegistration,
} from '@/data/registrations'
import { createEvent } from '@/data/events'

describe('getRegistrationsForStudent', () => {
  it('returns only the seeded registrations belonging to that student', () => {
    const mine = getRegistrationsForStudent('stu-1')
    expect(mine.length).toBe(3)
    expect(mine.every((reg) => reg.studentId === 'stu-1')).toBe(true)
  })
})

describe('countActiveRegistrations', () => {
  it('counts only active confirmed registrations for an event', () => {
    const testEvt = createEvent({
      name: 'Count Test Event',
      description: 'Testing countActiveRegistrations',
      date: '2026-11-20T10:00:00',
      venue: 'Room 5',
      category: 'Tech',
      capacity: 10,
      organizerId: 'org-1',
    })

    expect(countActiveRegistrations(testEvt.id)).toBe(0)

    const reg1 = registerStudentForEvent('stu-count-1', testEvt.id)
    const reg2 = registerStudentForEvent('stu-count-2', testEvt.id)
    expect(countActiveRegistrations(testEvt.id)).toBe(2)

    cancelRegistration(reg1.id, 'stu-count-1')
    expect(countActiveRegistrations(testEvt.id)).toBe(1)
  })
})
