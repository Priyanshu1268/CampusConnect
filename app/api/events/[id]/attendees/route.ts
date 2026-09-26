import { NextResponse } from 'next/server'
import { getEventById } from '@/data/events'
import { getUserById } from '@/data/auth'
import { getEventAttendees, disqualifyAttendee } from '@/data/registrations'

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { searchParams } = new URL(request.url)
    const organizerId = searchParams.get('organizerId')

    const event = getEventById(params.id)
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 },
      )
    }

    if (organizerId) {
      const user = getUserById(organizerId)
      if (!user || user.role !== 'organizer' || event.organizerId !== organizerId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized to view attendees for this event' },
          { status: 403 },
        )
      }
    }

    const attendees = getEventAttendees(params.id)
    return NextResponse.json({ success: true, attendees })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch attendees' },
      { status: 500 },
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json()
    const { registrationId, organizerId, action } = body

    if (!registrationId || !organizerId) {
      return NextResponse.json(
        { success: false, error: 'registrationId and organizerId are required' },
        { status: 400 },
      )
    }

    const user = getUserById(organizerId)
    if (!user || user.role !== 'organizer') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: only organizers can manage attendees' },
        { status: 403 },
      )
    }

    if (action === 'disqualify' || action === 'remove') {
      const updatedReg = disqualifyAttendee(registrationId, organizerId)
      return NextResponse.json({ success: true, registration: updatedReg })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 },
    )
  } catch (err: any) {
    const message = err.message || 'Failed to update attendee status'
    const status = message.includes('Unauthorized') ? 403 : 400
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
