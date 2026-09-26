import { NextResponse } from 'next/server'
import { cancelRegistration } from '@/data/registrations'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params
    let studentId = ''

    // Try reading studentId from query string or body
    const { searchParams } = new URL(request.url)
    studentId = searchParams.get('studentId') || ''

    if (!studentId) {
      try {
        const body = await request.json()
        studentId = body.studentId || ''
      } catch {
        // No body
      }
    }

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'studentId is required to cancel registration' },
        { status: 400 },
      )
    }

    const registration = cancelRegistration(id, studentId)
    return NextResponse.json({ success: true, registration }, { status: 200 })
  } catch (err: any) {
    const message = err.message || 'Failed to cancel registration'
    const status = message.includes('Unauthorized')
      ? 403
      : message.includes('not found')
        ? 404
        : 400
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
