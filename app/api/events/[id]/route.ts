import { NextResponse } from 'next/server'
import { updateEvent, cancelEvent, getEventById } from '@/data/events'
import { getUserById } from '@/data/auth'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const event = getEventById(params.id)
  if (!event) {
    return NextResponse.json(
      { success: false, error: 'Event not found' },
      { status: 404 },
    )
  }
  return NextResponse.json({ success: true, event })
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json()
    const { organizerId, ...updates } = body

    if (!organizerId) {
      return NextResponse.json(
        { success: false, error: 'organizerId is required' },
        { status: 400 },
      )
    }

    const user = getUserById(organizerId)
    if (!user || user.role !== 'organizer') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: only organizers can edit events' },
        { status: 403 },
      )
    }

    if (updates.capacity !== undefined) {
      updates.capacity = Number(updates.capacity)
    }

    const event = updateEvent(params.id, organizerId, updates)
    return NextResponse.json({ success: true, event })
  } catch (err: any) {
    const message = err.message || 'Failed to update event'
    const status = message.includes('Unauthorized')
      ? 403
      : message.includes('not found')
        ? 404
        : 400
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    let organizerId = ''
    const { searchParams } = new URL(request.url)
    organizerId = searchParams.get('organizerId') || ''

    if (!organizerId) {
      try {
        const body = await request.json()
        organizerId = body.organizerId || ''
      } catch {
        // No body
      }
    }

    if (!organizerId) {
      return NextResponse.json(
        { success: false, error: 'organizerId is required' },
        { status: 400 },
      )
    }

    const user = getUserById(organizerId)
    if (!user || user.role !== 'organizer') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: only organizers can cancel events' },
        { status: 403 },
      )
    }

    const event = cancelEvent(params.id, organizerId)
    return NextResponse.json({ success: true, event })
  } catch (err: any) {
    const message = err.message || 'Failed to cancel event'
    const status = message.includes('Unauthorized')
      ? 403
      : message.includes('not found')
        ? 404
        : 400
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
