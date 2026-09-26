import { NextResponse } from 'next/server'
import {
  registrations,
  registerStudentForEvent,
  getActiveRegistrationsForStudent,
  getRegistrationsForStudent,
} from '@/data/registrations'
import { getUserById } from '@/data/auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('studentId')
  const activeOnly = searchParams.get('activeOnly') !== 'false'

  if (!studentId) {
    return NextResponse.json(
      { success: false, error: 'studentId query parameter is required' },
      { status: 400 },
    )
  }

  const result = activeOnly
    ? getActiveRegistrationsForStudent(studentId)
    : getRegistrationsForStudent(studentId)

  return NextResponse.json({ success: true, registrations: result })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { eventId, studentId } = body

    if (!studentId || !eventId) {
      return NextResponse.json(
        { success: false, error: 'studentId and eventId are required' },
        { status: 400 },
      )
    }

    const user = getUserById(studentId)
    if (!user || user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'Only logged-in students can register for events' },
        { status: 403 },
      )
    }

    const registration = registerStudentForEvent(studentId, eventId)
    return NextResponse.json({ success: true, registration }, { status: 201 })
  } catch (err: any) {
    const message = err.message || 'Failed to register'
    const status = message.includes('already registered')
      ? 409
      : message.includes('full') || message.includes('past') || message.includes('cancelled')
        ? 400
        : 400
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
